import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Isolated mobile layout smoke. Public controls only; saved mission data is read-only.
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const output = 'C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-b-mobile-postfix';
const sourceFiles = [
  'src/main.tsx', 'src/game/mission/MissionGame.tsx', 'src/game/mission/activities/ActivityPanel.tsx',
  'src/game/mission/activities/rules.ts', 'src/game/mission/state.ts', 'src/game/mission/store.ts',
  'src/game/mission/content.ts', 'src/game/mission/contract.ts', 'src/game/mission/world/MissionWorld.tsx',
  'src/game/mission/world/FieldCamp.tsx', 'src/game/mission/presentation/cinematics/MissionCinematic.tsx',
  'src/game/mission/presentation/cinematics/timeline.ts',
];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const fingerprint = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, await sha256(path)])));
const report = { url, viewports: [], screenshots: [], errors: [], warnings: [], checks: [], profile: 'Fresh temporary Edge profile; Puppeteer default; no persistent userDataDir' };
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
let page;
const save = async () => page.evaluate(key => { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }, storageKey);
const artifact = async () => writeFile(`${output}/mobile-postfix-result.json`, JSON.stringify(report, null, 2));
const screenshot = async name => { const path = `${output}/${name}`; await page.screenshot({ path, type: 'png' }); report.screenshots.push(path); await artifact(); };
async function clickButton(label) {
  for (const button of await page.$$('button')) {
    const text = await button.evaluate(element => (element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || element.textContent || '').trim().replace(/\s+/g, ' '));
    if (text.includes(label)) { await button.click(); await wait(250); return text; }
  }
  throw new Error(`Visible button not found: ${label}`);
}
async function inspectLayout(name) {
  const measurement = await page.evaluate(viewportName => {
    const rect = selector => { const element = document.querySelector(selector); if (!element) return null; const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
    const intersects = (a,b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const elementLabel = element => element ? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${typeof element.className === 'string' && element.className ? `.${element.className.trim().replace(/\s+/g,'.')}` : ''}` : null;
    const buttons = [...document.querySelectorAll('.touch-controls button')].map(button => {
      const r = button.getBoundingClientRect();
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(x, y);
      return { label: button.getAttribute('aria-label') || button.innerText, rect: { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }, visible:r.width>0&&r.height>0, atLeast48:r.width>=48&&r.height>=48, centerHit:elementLabel(hit), centerOwnedByButton:Boolean(hit && (hit===button || button.contains(hit))) };
    });
    const objective = rect('.mission-hud-left .hud-card');
    const stock = rect('.mission-hud-left .stock-strip');
    const dpad = rect('.dpad');
    const touch = rect('.touch-controls');
    const mapPanel = rect('.mission-modal');
    return { viewportName, innerWidth, innerHeight, document:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}, stage:rect('.mission-stage'), objective, stock, dpad, touch, objectiveOverlapsDpad:intersects(objective,dpad), stockOverlapsDpad:intersects(stock,dpad), touchTargets:buttons, touchTargetsAllAtLeast48:buttons.length>0&&buttons.every(b=>b.atLeast48), touchCenterHitCoverage:buttons.length>0&&buttons.every(b=>b.centerOwnedByButton), mapPanel, mapPanelWithinViewport:mapPanel?mapPanel.left>=0&&mapPanel.right<=innerWidth&&mapPanel.top>=0&&mapPanel.bottom<=innerHeight:null };
  }, name);
  report.viewports.push(measurement);
  await screenshot(`${name}-world.png`);
  return measurement;
}
try {
  report.sourceSha256Before = await fingerprint();
  page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console.error: ${message.text()}`); else if (message.type() === 'warning') report.warnings.push(message.text()); });
  page.on('requestfailed', request => report.errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
  await screenshot('390x844-title.png');
  let selected = false;
  for (const button of await page.$$('.start-region')) {
    if ((await button.evaluate(element => element.innerText || element.textContent || '')).includes('Old Lake Shore')) { await button.tap(); selected = true; break; }
  }
  if (!selected) throw new Error('Old Lake Shore start choice was not visible.');
  await clickButton('Begin field mission');
  await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
  await clickButton('Skip scene');
  await page.waitForSelector('.mission-stage canvas', { timeout: 25000 });
  await wait(900);
  const initialState = await save();
  if (initialState?.startRegion !== 'lake' || !initialState?.started || !initialState?.introSeen) throw new Error('Fresh Lake start / actual intro skip not persisted.');
  report.checks.push({ type:'fresh-Lake-start', startRegion:initialState.startRegion, started:initialState.started, introSeen:initialState.introSeen, leo:initialState.leo });
  const large = await inspectLayout('390x844');
  const up = await page.$('button[aria-label="Move up"]');
  if (!up) throw new Error('Actual touch Move up control missing.');
  const before = (await save()).leo;
  await up.tap(); await wait(700);
  const after = (await save()).leo;
  report.checks.push({ type:'real-touch-Move-up', before:{x:before.x,z:before.z}, after:{x:after.x,z:after.z}, poseChanged:before.x!==after.x||before.z!==after.z });
  await clickButton('Open map'); await page.waitForSelector('[role="dialog"]',{timeout:5000});
  report.checks.push({ type:'map-dialog-layout', ...(await page.evaluate(()=>{const e=document.querySelector('.mission-modal');const r=e?.getBoundingClientRect();return{scrollHeight:document.documentElement.scrollHeight,dialog:r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null,viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,dialogScrollable:Boolean(e&&e.scrollHeight>e.clientHeight)}})) });
  await screenshot('390x844-map.png'); await clickButton('Close panel');
  await clickButton('Pause mission'); await page.waitForSelector('[role="dialog"]',{timeout:5000});
  const reduced=await page.$('input[type="checkbox"]');
  if(reduced){await reduced.click();await wait(300);report.checks.push({type:'actual-reduced-motion-control',savedValue:(await save())?.settings?.reducedMotion});}
  await screenshot('390x844-pause.png'); await clickButton('Return to field');
  await page.setViewport({width:320,height:740,deviceScaleFactor:1,isMobile:true,hasTouch:true}); await wait(500);
  await inspectLayout('320x740');
  await clickButton('Open map'); await page.waitForSelector('[role="dialog"]',{timeout:5000});
  report.checks.push({ type:'map-dialog-layout-320', ...(await page.evaluate(()=>{const e=document.querySelector('.mission-modal');const r=e?.getBoundingClientRect();return{scrollHeight:document.documentElement.scrollHeight,dialog:r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null,viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,dialogScrollable:Boolean(e&&e.scrollHeight>e.clientHeight)}})) });
  await screenshot('320x740-map.png');
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.lastSave = page ? await save().catch(() => null) : null;
  if (page) await screenshot('failure.png').catch(() => undefined);
} finally {
  report.sourceSha256After = await fingerprint().catch(error => ({ error:String(error) }));
  report.sourceStableDuringRun = JSON.stringify(report.sourceSha256Before)===JSON.stringify(report.sourceSha256After);
  await artifact().catch(() => undefined);
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
if (report.error || !report.sourceStableDuringRun) process.exitCode=1;
