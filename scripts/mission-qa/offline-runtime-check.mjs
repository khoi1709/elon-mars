import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const viteEntry = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');

const root = process.cwd();
const outDir = path.join(root, 'scratch/2026-11/week-46/2026-11-14_offline-runtime-check');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const profile = path.join(outDir, `edge-profile-${stamp}`);
const evidencePath = path.join(outDir, `runtime-evidence-${stamp}.json`);
const result = { startedAt: new Date().toISOString(), baseUrl: 'http://127.0.0.1:3002/?mission=frontiers', build: 'preexisting dist candidate; npm run build reported separately', checks: {}, pageErrors: [], consoleErrors: [], requestFailures: [], events: [] };
const log = (message) => { console.log(`${new Date().toISOString()} ${message}`); result.events.push({ at: new Date().toISOString(), message }); };
let server;
let browser;
let serverStop = null;
let browserPid = null;
try {
  const viteCli = viteEntry;
  const previewLog = path.join(outDir, 'preview-stderr.log');
  server = spawn(process.execPath, [viteCli, 'preview', '--host', '127.0.0.1', '--port', '3002', '--strictPort'], { cwd: root, stdio: ['ignore', 'ignore', fs.openSync(previewLog, 'w')], windowsHide: true });
  result.preview = { command: `${process.execPath} ${viteCli} preview --host 127.0.0.1 --port 3002 --strictPort`, pid: server.pid, port: 3002, owned: true };
  log(`PREVIEW_STARTED pid=${server.pid} port=3002 command=${result.preview.command}`);
  let reachable = false;
  for (let i = 0; i < 30; i++) {
    if (server.exitCode !== null) throw new Error(`Preview exited early code=${server.exitCode} signal=${server.signalCode}`);
    try { const r = await fetch('http://127.0.0.1:3002/'); if (r.ok) { reachable = true; break; } } catch {}
    await delay(350);
  }
  if (!reachable) throw new Error('Preview did not become reachable within 10.5s');
  const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
  if (!edge) throw new Error('Microsoft Edge executable not found at either approved path');
  browser = await puppeteer.launch({ executablePath: edge, headless: true, userDataDir: profile, timeout: 15000 });
  browserPid = browser.process()?.pid;
  result.browser = { executable: edge, pid: browserPid, profile, owned: true, headless: true };
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => result.pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push(m.text()); });
  page.on('requestfailed', r => result.requestFailures.push({ url: r.url(), error: r.failure()?.errorText || 'unknown' }));
  const onlineResp = await page.goto('http://127.0.0.1:3002/?mission=frontiers', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const rootOnline = { status: onlineResp?.status(), contentType: onlineResp?.headers()['content-type'] || '', title: await page.title() };
  await page.waitForFunction(() => !!document.querySelector('#root')?.innerText.trim(), { timeout: 12000 }).catch(() => {});
  const workerTextResp = await page.evaluate(async () => { const r = await fetch('/service-worker.js'); return { status: r.status, text: await r.text() }; });
  if (workerTextResp.status !== 200) throw new Error(`Service worker fetch status ${workerTextResp.status}`);
  const manifestMatch = workerTextResp.text.match(/const PRECACHE_MANIFEST = (\{[^;]+\});/);
  if (!manifestMatch) throw new Error('Could not parse embedded PRECACHE_MANIFEST JSON');
  const manifest = JSON.parse(manifestMatch[1]);
  result.manifest = { cacheName: manifest.cacheName, count: manifest.count, files: manifest.files };
  await Promise.race([page.evaluate(async () => { await navigator.serviceWorker.ready; }), delay(8000).then(() => { throw new Error('navigator.serviceWorker.ready timed out after 8s'); })]);
  const cacheState = await page.evaluate(async name => ({ keys: await caches.keys(), entries: await (await caches.open(name)).keys().then(keys => keys.map(k => new URL(k.url).pathname)) }), manifest.cacheName);
  result.checks.onlineInitial = { root: rootOnline, cacheName: manifest.cacheName, manifestCount: manifest.count, actualCacheKeyCount: cacheState.entries.length, actualCacheKeys: cacheState.entries };
  log(`CACHE_READY name=${manifest.cacheName} manifestCount=${manifest.count} actualKeys=${cacheState.entries.length}`);
  if (cacheState.entries.length !== manifest.files.length) throw new Error(`Cache key count ${cacheState.entries.length} != manifest files ${manifest.files.length}`);
  const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || null);
  if (!controller) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    for (let i = 0; i < 80; i++) { if (await page.evaluate(() => !!navigator.serviceWorker.controller)) break; await delay(100); }
  }
  const onlineController = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || null);
  result.checks.onlineController = { acquired: !!onlineController, scriptURL: onlineController, rootStatus: rootOnline.status };
  if (!onlineController) throw new Error('No controlling service worker after reload');
  const onlineDom = await page.evaluate(() => ({ bodyText: (document.body.innerText || '').slice(0,5000), html: document.querySelector('#root')?.innerHTML.slice(0,3000) || '' }));
  result.checks.onlineDom = onlineDom;
  await page.setOfflineMode(true);
  log('BROWSER_OFFLINE network emulation enabled');
  server.kill('SIGTERM');
  const stopStart = Date.now();
  await Promise.race([new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal }))), delay(5000)]).then(v => { serverStop = { pid: server.pid, requested: 'SIGTERM', exit: v, elapsedMs: Date.now() - stopStart }; });
  if (!serverStop.exit) { server.kill('SIGKILL'); serverStop.forced = true; serverStop.exit = await Promise.race([new Promise(resolve => server.once('exit', (code, signal) => resolve({ code, signal }))), delay(3000).then(() => null)]); }
  result.preview.stop = serverStop;
  log(`PREVIEW_STOPPED pid=${server.pid} receipt=${JSON.stringify(serverStop)}`);
  const offlineRoot = await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 }).then(r => ({ status: r?.status(), contentType: r?.headers()['content-type'] || '' })).catch(e => ({ error: String(e) }));
  if (!offlineRoot.status) {
    const nav = await page.goto('http://127.0.0.1:3002/?mission-preview=offline', { waitUntil: 'domcontentloaded', timeout: 12000 }).then(r => ({ status: r?.status(), contentType: r?.headers()['content-type'] || '' })).catch(e => ({ error: String(e) }));
    result.checks.offlineRoot = { reload: offlineRoot, fallbackNavigation: nav, title: await page.title() };
  } else result.checks.offlineRoot = { reload: offlineRoot, title: await page.title() };
  await page.waitForFunction(() => !!document.querySelector('#root')?.innerText.trim(), { timeout: 10000 }).catch(() => {});
  const offlineDom = await page.evaluate(() => ({ bodyText: (document.body.innerText || '').slice(0,5000), rootHTML: document.querySelector('#root')?.innerHTML.slice(0,4000) || '' })).catch(e => ({ bodyText:'', rootHTML:String(e) }));
  const offlineBody = offlineDom.bodyText;
  result.checks.offlineDom = { title: await page.title(), ...offlineDom, hasApplicationContent: !!offlineBody.trim() };
  const selected = ['mission-data/pack-v2.json', manifest.files.find(f => /^fonts\/.*\.(ttf|woff2?)$/i.test(f)), manifest.files.find(f => f.endsWith('.js') && f.includes('three-vendor')), manifest.files.find(f => f.endsWith('.js') && f.includes('index-')), manifest.files.find(f => f.endsWith('.js') && f.includes('MissionGame-'))].filter(Boolean);
  const assets = [];
  for (const rel of [...new Set(selected)]) {
    const local = path.join(root, 'dist', ...rel.split('/'));
    const expectedBytes = fs.readFileSync(local);
    const expectedHash = crypto.createHash('sha256').update(expectedBytes).digest('hex');
    const actual = await page.evaluate(async relPath => { try { const r = await fetch('/' + relPath); const b = new Uint8Array(await r.arrayBuffer()); let binary=''; for (let i=0;i<b.length;i+=32768) binary += String.fromCharCode(...b.subarray(i, Math.min(i+32768,b.length))); return { status:r.status, contentType:r.headers.get('content-type') || '', bytes:b.length, base64:btoa(binary) }; } catch(e) { return { error:String(e) }; } }, rel);
    const actualHash = actual.base64 ? crypto.createHash('sha256').update(Buffer.from(actual.base64, 'base64')).digest('hex') : null;
    let validJson = null;
    if (rel.endsWith('.json') && actual.base64) { try { validJson = JSON.parse(Buffer.from(actual.base64, 'base64').toString('utf8')) !== null; } catch { validJson = false; } }
    assets.push({ path: rel, expected: { bytes: expectedBytes.length, sha256: expectedHash }, actual: { status: actual.status, contentType: actual.contentType, bytes: actual.bytes, sha256: actualHash, error: actual.error }, exactBytesMatch: actualHash === expectedHash, validJson });
    log(`ASSET ${rel} status=${actual.status ?? 'ERR'} type=${actual.contentType || ''} bytes=${actual.bytes ?? 0} hashMatch=${actualHash === expectedHash}`);
  }
  result.checks.offlineAssets = assets;
  const domBefore = await page.evaluate(() => ({ body:(document.body.innerText || '').slice(0,5000), buttons:[...document.querySelectorAll('button')].map(b=>({text:(b.innerText||'').trim(),disabled:b.disabled})).filter(b=>b.text) }));
  let interaction = { availableButtons: domBefore.buttons };
  const startClicked = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/Begin field mission/i.test(b.innerText||'')); if(!b) return null; const text=(b.innerText||'').trim(); b.click(); return text; });
  if (startClicked) { await delay(800); const after=await page.evaluate(()=>(document.body.innerText||'').slice(0,5000)); interaction={button:startClicked,before:domBefore.body,after,changed:domBefore.body!==after,buttonCountAfter:await page.evaluate(()=>document.querySelectorAll('button').length)}; }
  else { const clicked=await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Continue|Start|Skip scene/i.test(b.innerText||''));if(!b)return null;const text=(b.innerText||'').trim();b.click();return text;}); if(clicked){await delay(800);const after=await page.evaluate(()=>(document.body.innerText||'').slice(0,5000));interaction={button:clicked,before:domBefore.body,after,changed:domBefore.body!==after};} }
  result.checks.offlineInteraction = interaction;
  result.checks.pageErrors = result.pageErrors;
  result.checks.requestFailures = result.requestFailures;
} catch (error) {
  result.error = String(error?.stack || error);
  log(`ERROR ${String(error)}`);
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (server && server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(2500)]); } } catch {}
  result.cleanup = { browserClosed: !!browser, browserPid, ownedProfile: profile, previewPid: server?.pid ?? null, previewStop: serverStop, completedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(outDir, 'runtime-evidence.json'), JSON.stringify(result, null, 2));
  console.log(`EVIDENCE ${path.join(outDir, 'runtime-evidence.json')}`);
  console.log(`SUMMARY ${JSON.stringify({ error: result.error || null, onlineController: result.checks?.onlineController || null, offlineRoot: result.checks?.offlineRoot || null, offlineAssets: result.checks?.offlineAssets?.map(a=>({path:a.path,status:a.actual.status,contentType:a.actual.contentType,bytes:a.actual.bytes,hashMatch:a.exactBytesMatch})) || null, interaction: result.checks?.offlineInteraction || null, cleanup: result.cleanup })}`);
}
if (result.error) process.exitCode = 1;
