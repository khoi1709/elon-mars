import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const root = 'C:/Hackathon/output/ares-release/repo';
const output = 'C:/Hackathon/scratch/2026-11/week-46/2026-11-14_api-integration-qa';
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sourceFiles = [
  'src/game/mission/MissionGame.tsx', 'src/game/mission/contentPack.ts', 'src/game/mission/content.ts',
  'src/game/mission/contract.ts', 'src/game/mission/state.ts', 'src/game/mission/store.ts',
  'src/game/mission/world/worldNavigation.ts', 'src/game/mission/world/MissionWorld.tsx',
  'src/game/mission/world/FieldCamp.tsx', 'src/game/mission/world/SolCompanion.tsx',
  'src/game/mission/activities/rules.ts', 'src/game/mission/activities/ActivityPanel.tsx',
  'src/game/mission/presentation/audio/index.ts', 'src/game/mission/presentation/audio/controller.ts',
  'src/game/mission/presentation/audio/selector.ts',
  'src/game/mission/presentation/cinematics/index.ts', 'src/game/mission/presentation/cinematics/timeline.ts',
  'src/game/mission/presentation/cinematics/MissionCinematic.tsx', 'src/game/mission/mission.css',
  'public/mission-data/pack-v2.json',
];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = async path => createHash('sha256').update(await readFile(`${root}/${path}`)).digest('hex');
const fingerprint = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, await sha256(path)])));
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}, storageKey);
const buttons = async page => Promise.all((await page.$$('button')).map(async element => ({
  element,
  label: await element.evaluate(node => (node.getAttribute('aria-label') || node.getAttribute('title') || node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ')),
})));
async function clickButton(page, text, { exact = false, optional = false } = {}) {
  for (const { element, label } of await buttons(page)) {
    if (exact ? label === text : label.includes(text)) { await element.click(); await wait(250); return label; }
  }
  if (optional) return null;
  throw new Error(`Visible button not found: ${text}`);
}
const settledWorld = async page => {
  await page.waitForSelector('.mission-stage canvas', { timeout: 30000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await wait(2000);
};
const screenshot = async (page, name, report) => {
  const path = `${output}/${name}`;
  await page.screenshot({ path, type: 'png' });
  report.screenshots.push(path);
  return path;
};
const snapshotInvariants = state => ({
  leo: state.leo,
  leoReturnPose: state.leoReturnPose,
  bases: state.bases,
  surveys: state.surveys,
  transactions: state.transactions,
  supportIds: state.supportIds,
});

async function runScenario(name, fallback, report) {
  const browser = await puppeteer.launch({ executablePath: edge, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(`${name}: console ${message.text()}`); });
    page.on('requestfailed', request => report.errors.push(`${name}: request ${request.url()} ${request.failure()?.errorText}`));
    const packRequests = [];
    let localPackResponse = null;
    page.on('request', request => { if (new URL(request.url()).pathname === '/mission-data/pack-v2.json') packRequests.push(request.url()); });
    page.on('response', response => { if (new URL(response.url()).pathname === '/mission-data/pack-v2.json') localPackResponse = response; });

    if (fallback) {
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (new URL(request.url()).pathname === '/mission-data/pack-v2.json' && request.method() === 'GET') {
          void request.respond({ status: 503, contentType: 'application/json', body: '{"unavailable":true}' });
        } else void request.continue();
      });
    } else {
      await page.evaluateOnNewDocument(() => {
        const Native = window.AudioContext;
        window.__missionQaAudio = { contexts: 0, resumes: 0, oscillatorStarts: 0, running: [] };
        if (!Native) return;
        const originalCreate = Native.prototype.createOscillator;
        const originalResume = Native.prototype.resume;
        Native.prototype.resume = function (...args) {
          window.__missionQaAudio.resumes++;
          return originalResume.apply(this, args);
        };
        Native.prototype.createOscillator = function (...args) {
          const node = originalCreate.apply(this, args);
          const start = node.start.bind(node);
          node.start = (...values) => { window.__missionQaAudio.oscillatorStarts++; return start(...values); };
          return node;
        };
        const Tracked = function (...args) {
          const context = new Native(...args);
          window.__missionQaAudio.contexts++;
          window.__missionQaAudio.running.push(context);
          return context;
        };
        Tracked.prototype = Native.prototype;
        Object.setPrototypeOf(Tracked, Native);
        window.AudioContext = Tracked;
      });
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.start-region', { timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.start-region')].length === 5, { timeout: 10000 });
    const regionLabels = (await page.$$eval('.start-region', elements => elements.map(element => element.innerText.trim())));
    assert.equal(regionLabels.length, 5, 'title must offer five regions');
    assert.ok(regionLabels.some(label => label.includes('Old Lake Shore')), 'Lake option must be offered');
    if (fallback) {
      await page.waitForFunction(() => document.body.innerText.includes('Using bundled mission content:'), { timeout: 5000 });
      const warning = await page.$eval('.mission-start-screen', node => node.innerText);
      assert.match(warning, /503/, 'fallback warning must explain the failed local pack response');
      report.fallback = { status: 503, warning: warning.match(/Using bundled mission content:[^\n]*/)?.[0] ?? warning, fiveRegions: regionLabels };
    } else {
      const response = localPackResponse;
      assert.ok(response, 'local pack endpoint response must be observed');
      const pack = await response.json();
      assert.equal(response.status(), 200, 'local pack endpoint must be served successfully');
      assert.deepEqual(pack.regions.map(region => region.id), ['impact', 'dust', 'volcano', 'ice', 'lake']);
      assert.equal(packRequests.length, 1, 'initialization should request the local pack once');
      report.localPack = { status: response.status(), requests: packRequests.length, regionIds: pack.regions.map(region => region.id) };
      await screenshot(page, '01-local-title.png', report);
    }

    for (const { element, label } of await buttons(page)) {
      if (element && label.includes('Old Lake Shore') && await element.evaluate(node => node.classList.contains('start-region'))) {
        await element.click(); break;
      }
    }
    await clickButton(page, 'Begin field mission');
    await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
    await clickButton(page, 'Skip scene');
    await settledWorld(page);
    let state = await readSave(page);
    assert.equal(state?.started, true, 'START must occur only after content settles');
    assert.equal(state?.startRegion, 'lake');
    assert.equal(state?.introSeen, true, 'cinematic skipped using the public control');
    if (fallback) {
      report.fallback.started = true;
      report.fallback.contentVersion = state.contentVersion;
      const saveBeforeReload = state;
      await screenshot(page, '02-fallback-world.png', report);
      assert.equal(packRequests.length, 1, 'fallback should make one bounded local pack attempt');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await settledWorld(page);
      state = await readSave(page);
      assert.deepEqual(state, saveBeforeReload, 'valid mission save must survive reload unchanged after pack fallback');
      assert.equal(packRequests.length, 2, 'reloaded fallback must make one additional bounded pack request');
      report.fallback.reloadPreservedValidSave = true;
      report.fallback.packRequestsAfterReload = packRequests.length;
      await screenshot(page, '03-fallback-reload.png', report);
      return;
    }

    await screenshot(page, '02-local-world.png', report);
    const canvas = await page.$eval('.mission-stage canvas', element => ({ width: element.width, height: element.height, cssWidth: element.clientWidth, cssHeight: element.clientHeight }));
    assert.ok(canvas.width > 0 && canvas.height > 0 && canvas.cssWidth > 0 && canvas.cssHeight > 0, 'R3F canvas must be positively rendered');
    report.render = { canvas, startRegion: state.startRegion, leo: state.leo };

    // Gesture and accepted public movement exercise the real audio controller; only native Web Audio calls are observed.
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.click('.mission-stage canvas');
    await page.keyboard.down('w'); await wait(1800); await page.keyboard.up('w'); await wait(350);
    const moved = await readSave(page);
    const distance = Math.hypot(moved.leo.x - state.leo.x, moved.leo.z - state.leo.z);
    const audio = await page.evaluate(() => ({ contexts: window.__missionQaAudio.contexts, resumes: window.__missionQaAudio.resumes, oscillatorStarts: window.__missionQaAudio.oscillatorStarts, states: window.__missionQaAudio.running.map(context => context.state) }));
    report.audio = { afterTrustedCanvasGestureAndRealWMovement: audio, movementDistance: distance };
    assert.ok(distance > 3.5, 'accepted movement must cross the selector cue threshold');
    assert.ok(audio.contexts >= 1 && audio.resumes >= 1 && audio.oscillatorStarts >= 1 && audio.states.includes('running'), 'unmuted trusted gesture and accepted movement must exercise native Web Audio');

    // Reach the Lake console through the real interaction key and enter the rover with the public control.
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.click('.mission-stage canvas'); await page.keyboard.press('e'); await wait(400);
    await page.waitForSelector('[role="dialog"]', { timeout: 6000 });
    await clickButton(page, 'Close panel');
    const context = (await buttons(page)).find(item => item.label.includes('Control Old Lake Shore rover'));
    if (context) {
      const leoBeforeEntry = (await readSave(page)).leo;
      state = await readSave(page);
      await context.element.click();
      await wait(350);
      let active = await readSave(page);
      assert.equal(active.activeRover, 'lake', 'actual public control must enter the Lake rover');
      const beforeHelp = snapshotInvariants(active);
      const helpLabel = (await buttons(page)).map(item => item.label).find(label => /help|unstuck|stuck/i.test(label));
      if (!helpLabel) {
        report.help = { result: 'not exposed', activeRover: active.activeRover };
      } else {
        const helpControl = (await buttons(page)).find(item => item.label === helpLabel);
        const helpBox = await helpControl.element.boundingBox();
        assert.ok(helpBox && helpBox.width >= 48 && helpBox.height >= 48, 'active rover Help control must meet 48px target size');
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await wait(250);
        const mobileBox = await helpControl.element.boundingBox();
        const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
        assert.ok(mobileBox && mobileBox.width >= 48 && mobileBox.height >= 48 && mobileBox.x >= 0 && mobileBox.y >= 0 && mobileBox.x + mobileBox.width <= viewport.width && mobileBox.y + mobileBox.height <= viewport.height, 'Help control must fit within 390px viewport');
        report.helpMobile = { viewport, box: mobileBox };
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 }); await wait(200);
        await clickButton(page, helpLabel, { exact: true }); await wait(300);
        const afterHelp = await readSave(page);
        assert.deepEqual(snapshotInvariants(afterHelp), beforeHelp, 'HELP must not change Leo, stock, evidence, transactions or support IDs');
        assert.equal(afterHelp.activeRover, 'lake');
        await clickButton(page, helpLabel, { exact: true }); await wait(250);
        const afterHelpAgain = await readSave(page);
        assert.deepEqual(afterHelpAgain.rovers.lake, afterHelp.rovers.lake, 'repeating Help must not move an already safe rover');
        assert.deepEqual(snapshotInvariants(afterHelpAgain), beforeHelp, 'repeated Help must remain cost-free and preserve mission invariants');
        const beforePose = active.rovers.lake, afterPose = afterHelp.rovers.lake;
        const recoveryDistance = Math.hypot(afterPose.x - beforePose.x, afterPose.z - beforePose.z);
        assert.ok(Number.isFinite(afterPose.x) && Number.isFinite(afterPose.z) && Math.abs(afterPose.x) <= 297.75 && Math.abs(afterPose.z) <= 297.75);
        assert.ok(recoveryDistance <= 8.000001, 'recovery must be bounded to eight world units');
        report.help = { label: helpLabel, beforePose, afterPose, recoveryDistance, activeRover: afterHelp.activeRover, invariantsPreserved: true, naturallyStuck: recoveryDistance > 0.01 };
        active = afterHelp;
      }
      const returnButton = (await buttons(page)).map(item => item.label).find(label => label.includes('Return to Leo'));
      if (returnButton) {
        await clickButton(page, returnButton, { exact: true }); await wait(300);
        const exited = await readSave(page);
        assert.equal(exited.activeRover, null, 'public rover exit must restore Leo');
        assert.deepEqual(exited.leo, leoBeforeEntry, 'exit must restore Leo to the exact pose captured before rover entry');
        assert.deepEqual(exited.bases, active.bases, 'rover exit must preserve station stock');
        assert.deepEqual(exited.surveys, active.surveys, 'rover exit must preserve evidence');
        report.roverExit = { activeRover: exited.activeRover, leo: exited.leo, leoReturnPose: exited.leoReturnPose, stockAndEvidencePreserved: true, entryLeo: leoBeforeEntry };
      } else report.roverExit = { result: 'Return to Leo control not found' };
    } else report.help = { result: 'could not enter rover using public control' };

    // Exercise the real saved mute checkbox and inspect only native Web Audio lifecycle counters.
    const beforeMute = await page.evaluate(() => ({ contexts: window.__missionQaAudio.contexts, resumes: window.__missionQaAudio.resumes, oscillatorStarts: window.__missionQaAudio.oscillatorStarts }));
    await clickButton(page, 'Pause mission');
    let checkbox = null;
    for (const input of await page.$$('input[type="checkbox"]')) if (/Mute mission audio/i.test(await input.evaluate(node => node.closest('label')?.innerText ?? ''))) { checkbox = input; break; }
    if (checkbox) {
      const checkboxLabel = await checkbox.evaluate(input => input.closest('label')?.innerText ?? '');
      const checked = await checkbox.evaluate(input => input.checked);
      if (!checked) await checkbox.click();
      await wait(200);
      const mutedSave = await readSave(page);
      assert.equal(mutedSave.settings.muted, true, 'mute preference must persist through the public checkbox');
      await clickButton(page, 'Return to field');
      await page.click('.mission-stage canvas'); await page.keyboard.down('w'); await wait(700); await page.keyboard.up('w'); await wait(250);
      const afterMutedMove = await page.evaluate(() => ({ contexts: window.__missionQaAudio.contexts, resumes: window.__missionQaAudio.resumes, oscillatorStarts: window.__missionQaAudio.oscillatorStarts }));
      assert.equal(afterMutedMove.oscillatorStarts, beforeMute.oscillatorStarts, 'muted movement must not start new voices');
      report.audio.mute = { savedMuted: (await readSave(page)).settings.muted, before: beforeMute, afterMutedMovement: afterMutedMove };
    } else report.audio.mute = { result: 'pause settings checkbox not found' };

    const beforeReload = await readSave(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await settledWorld(page);
    const reloaded = await readSave(page);
    assert.equal(reloaded.startRegion, beforeReload.startRegion, 'reload must retain the selected mission');
    assert.equal(reloaded.settings.muted, beforeReload.settings.muted, 'reload must retain mute preference');
    assert.deepEqual(reloaded.surveys, beforeReload.surveys, 'reload must retain earned evidence');
    assert.deepEqual(reloaded.bases, beforeReload.bases, 'reload must retain stock');
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.click('.mission-stage canvas'); await page.keyboard.down('w'); await wait(700); await page.keyboard.up('w'); await wait(250);
    const afterReloadMovement = await readSave(page);
    const reloadMoveDistance = Math.hypot(afterReloadMovement.leo.x - reloaded.leo.x, afterReloadMovement.leo.z - reloaded.leo.z);
    assert.ok(reloadMoveDistance > 0.01, 'real movement must work after reload');
    await screenshot(page, '03-local-reload-world.png', report);
    report.reload = { preserved: true, movementDistance: reloadMoveDistance, saveRevision: afterReloadMovement.saveRevision };
  } finally {
    await browser.close();
  }
}

const report = { url, viewport: { width: 1280, height: 800 }, screenshots: [], errors: [], sourceFiles, sourceStableDuringRun: false };
await mkdir(output, { recursive: true });
report.sourceSha256Before = await fingerprint();
try {
  await runScenario('local', false, report);
  await runScenario('fallback', true, report);
} catch (error) {
  report.error = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  report.sourceSha256After = await fingerprint().catch(error => ({ error: String(error) }));
  report.sourceStableDuringRun = JSON.stringify(report.sourceSha256Before) === JSON.stringify(report.sourceSha256After);
  if (!report.sourceStableDuringRun) { report.errors.push('Mission source hash fence changed during QA.'); process.exitCode = 1; }
  await writeFile(`${output}/api-integration-checker-result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
