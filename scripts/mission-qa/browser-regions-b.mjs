import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// QA-B reads the public mission UI and its persisted snapshot only. Never dispatch or write state.
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const output = 'C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-b';
const regions = [
  { id: 'volcano', name: 'Blackstone Steps', center: [-210, 180], observations: [['volcano-v1', [-194, 194], 'low camera'], ['volcano-v2', [-228, 190], 'terrain lamp']], desired: ['foundation', 'channel', 'shelf', 'cap'], operation: 'Passive insulation' },
  { id: 'ice', name: 'Enclosed Ice Wall', center: [210, -180], observations: [['ice-i1', [224, -164], 'core camera'], ['ice-i2', [190, -176], 'radar viewer']], operation: 'Analyze the core' },
];
const sourceFiles = [
  'src/main.tsx', 'src/game/mission/MissionGame.tsx',
  'src/game/mission/activities/ActivityPanel.tsx', 'src/game/mission/activities/rules.ts',
  'src/game/mission/state.ts', 'src/game/mission/store.ts', 'src/game/mission/content.ts',
  'src/game/mission/contract.ts', 'src/game/mission/world/MissionWorld.tsx',
  'src/game/mission/world/FieldCamp.tsx', 'src/game/mission/presentation/cinematics/MissionCinematic.tsx',
  'src/game/mission/presentation/cinematics/timeline.ts',
];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const fingerprint = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, await sha256(path)])));
const reports = [];
const requestedRegion = process.argv[2];
const selectedRegions = requestedRegion ? regions.filter(region => region.id === requestedRegion) : regions;
if (requestedRegion && selectedRegions.length !== 1) throw new Error(`Unknown QA region: ${requestedRegion}`);

async function runRegion(region) {
  const report = { region: region.id, name: region.name, url, viewport: { width: 1280, height: 800 }, profile: 'fresh temporary Edge profile (Puppeteer default; no persistent userDataDir)', errors: [], warnings: [], failedRequests: [], screenshots: [], events: [] };
  const prefix = region.id;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  let page;
  const artifact = async () => writeFile(`${output}/${prefix}-result.json`, JSON.stringify(report, null, 2));
  const save = async () => page.evaluate(key => { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }, storageKey);
  const snap = async name => { const path = `${output}/${name}`; await page.screenshot({ path, type: 'png' }); report.screenshots.push(path); await artifact(); return path; };
  async function button(label, { exact = false, optional = false } = {}) {
    for (const element of await page.$$('button')) {
      const text = await element.evaluate(el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '));
      if (exact ? text === label : text.includes(label)) { await element.click(); await wait(250); return text; }
    }
    if (optional) return null;
    throw new Error(`Visible button not found: ${label}`);
  }
  async function canvasFocus() {
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.click('.mission-stage canvas');
  }
  async function move(dx, dz, ms) {
    const keys = [];
    if (dx > 0.1) keys.push('d'); if (dx < -0.1) keys.push('a');
    if (dz > 0.1) keys.push('s'); if (dz < -0.1) keys.push('w');
    if (!keys.length) return;
    await canvasFocus();
    await page.keyboard.down('Shift');
    for (const key of keys) await page.keyboard.down(key);
    await wait(ms);
    for (const key of keys) await page.keyboard.up(key);
    await page.keyboard.up('Shift');
    await wait(220);
  }
  async function driveTo(x, z, radius = 5.2) {
    for (let step = 0; step < 36; step++) {
      const state = await save();
      const pose = state?.leo;
      if (!pose) throw new Error('Read-only mission save/Leo pose unavailable during navigation.');
      const dx = x - pose.x, dz = z - pose.z, distance = Math.hypot(dx, dz);
      report.events.push({ type: 'movement-sample', step, pose: { x: pose.x, z: pose.z }, target: [x, z], distance: Number(distance.toFixed(2)) });
      if (distance <= radius) return { pose, distance, steps: step };
      const seconds = Math.min(0.52, Math.max(0.12, (distance - radius) / 7.5 * 0.72));
      await move(dx, dz, seconds * 1000);
    }
    throw new Error(`Real keyboard movement did not reach ${x},${z} within 36 samples.`);
  }
  async function interact() { await canvasFocus(); await page.keyboard.press('e'); await wait(400); }
  async function openBase() { await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 }); }
  async function recordObservation([id, position, tool]) {
    const approach = await driveTo(position[0], position[1]);
    await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await button(`Run ${tool}`); await button('Save observation');
    const state = await save();
    if (!state?.surveys?.[prefix]?.observations?.includes(id)) throw new Error(`Observation ${id} not in read-only saved progress.`);
    report.events.push({ type: 'observation-saved-by-ui', id, approach, observations: state.surveys[prefix].observations });
    await button('Close panel'); await artifact();
  }
  try {
    await mkdir(output, { recursive: true });
    page = await browser.newPage();
    page.on('pageerror', error => report.errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(`console.error: ${message.text()}`); else if (message.type() === 'warning') report.warnings.push(message.text()); });
    page.on('requestfailed', request => report.failedRequests.push(`${request.url()} ${request.failure()?.errorText}`));
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    report.sourceSha256Before = await fingerprint(); await artifact();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
    await snap(`${prefix}-01-title.png`);
    let selected = false;
    for (const element of await page.$$('.start-region')) {
      const label = await element.evaluate(el => el.innerText || el.textContent || '');
      if (label.includes(region.name)) { await element.click(); selected = true; break; }
    }
    if (!selected) throw new Error(`Start screen did not offer ${region.name}.`);
    await button('Begin field mission');
    await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
    await snap(`${prefix}-02-cinematic.png`);
    await button('Skip scene');
    await page.waitForSelector('.mission-stage canvas', { timeout: 25000 }); await wait(1000);
    const start = await save();
    if (!start?.started || start.startRegion !== prefix || !start.introSeen) throw new Error('Fresh selected-region start/intro completion not present in saved state.');
    report.events.push({ type: 'fresh-start-after-real-intro-skip', leo: start.leo, stock: start.bases[prefix].stock });
    await snap(`${prefix}-03-world.png`);
    await openBase(); await button('Close panel');
    for (const observation of region.observations) await recordObservation(observation);
    await driveTo(region.center[0], region.center[1] + 8, 5.2); await openBase();
    let state = await save();
    if (JSON.stringify(state.bases[prefix].stock) !== JSON.stringify({ energy: 12, meals: 4, water: 5, air: 4 })) throw new Error('Starting station stock differs from expected 12/4/5/4.');
    await button('Confirm essential pack'); state = await save();
    if (!state.surveys[prefix].paid || JSON.stringify(state.bases[prefix].stock) !== JSON.stringify({ energy: 10, meals: 3, water: 4, air: 3 })) throw new Error('Real essential-pack UI transaction did not persist expected 10/3/4/3.');
    report.events.push({ type: 'essential-pack-ui', stock: state.bases[prefix].stock, paid: state.surveys[prefix].paid });
    await button('Open activity'); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await snap(`${prefix}-04-activity-start.png`);
    if (prefix === 'volcano') {
      const goal = region.desired;
      const layerNames = { foundation: 'Foundation flow', channel: 'Channel flow', shelf: 'Ridge-side flow', cap: 'Top cap' };
      // Initial rules progress is null until a real layer control is clicked; this click saves actual UI progress.
      if (!(await save()).surveys.volcano.activityProgress) await button('Move Foundation flow down, older', { exact: true });
      let reorderClicks = 0;
      for (let index = 0; index < goal.length; index++) {
        for (;;) {
          const order = (await save()).surveys.volcano.activityProgress?.order;
          if (!Array.isArray(order)) throw new Error('Volcano activity order is not present in read-only save after real UI action.');
          const from = order.indexOf(goal[index]);
          if (from === index) break;
          if (++reorderClicks > 12) throw new Error(`Volcano UI reorder safety bound reached at ${JSON.stringify(order)}.`);
          const id = order[from];
          const direction = from > index ? 'down, older' : 'up, newer';
          await button(`Move ${layerNames[id]} ${direction}`, { exact: true });
        }
      }
      const order = (await save()).surveys.volcano.activityProgress.order;
      if (JSON.stringify(order) !== JSON.stringify(goal)) throw new Error(`Unexpected saved Volcano order: ${JSON.stringify(order)}`);
      await button('Check layer order');
      state = await save();
      if (!state.surveys.volcano.activityDone || !state.surveys.volcano.activityProgress.order.every(Boolean)) throw new Error('Volcano relation check did not complete by UI.');
      report.events.push({ type: 'volcano-checked-by-ui', order, activityDone: state.surveys.volcano.activityDone });
    } else {
      await button('Layer window');
      for (let i = 0; i < 10; i++) await button('Increase drill reading by 5 percent', { exact: true });
      state = await save();
      if (state.surveys.ice.activityProgress.percent !== 50 || state.surveys.ice.activityProgress.site !== 'layer-window') throw new Error('Ice site/50% reading not saved after real controls.');
      report.events.push({ type: 'ice-partial-progress-by-ui', site: state.surveys.ice.activityProgress.site, percent: state.surveys.ice.activityProgress.percent });
      await snap('ice-05-partial-site-reading.png');
      await button('Check reading'); state = await save();
      if (!state.surveys.ice.activityProgress.checked) throw new Error('Ice Check reading did not persist.');
      await button('Add site + layer label'); state = await save();
      if (!state.surveys.ice.activityProgress.labeled) throw new Error('Ice label action did not persist.');
      await button('Seal core box'); state = await save();
      if (!state.surveys.ice.activityProgress.sealed || !state.surveys.ice.activityDone) throw new Error('Ice Seal action did not complete through UI.');
      report.events.push({ type: 'ice-check-label-seal-by-ui', progress: state.surveys.ice.activityProgress, activityDone: state.surveys.ice.activityDone });
    }
    await snap(`${prefix}-05-activity-complete.png`);
    await button('Close panel'); await driveTo(region.center[0], region.center[1] + 8, 5.2); await openBase();
    state = await save();
    if (!state.surveys[prefix].activityDone || state.surveys[prefix].observations.length < 2) throw new Error('Activity/observations not present at base console.');
    await button(region.operation); state = await save();
    if (state.surveys[prefix].operation === null) throw new Error(`${region.operation} UI operation was not recorded.`);
    report.events.push({ type: 'operation-ui', operation: state.surveys[prefix].operation, stock: state.bases[prefix].stock });
    await button('Submit region report'); state = await save();
    const expectedStock = { energy: 8, meals: 3, water: 4, air: 3 };
    if (!state.bases[prefix].report || JSON.stringify(state.bases[prefix].stock) !== JSON.stringify(expectedStock)) throw new Error(`Report/own stock mismatch: ${JSON.stringify({ report: state.bases[prefix].report, stock: state.bases[prefix].stock })}`);
    const operationId = `operation:${prefix}:${state.surveys[prefix].operation}`;
    const outputId = `operation-output:${prefix}:${state.surveys[prefix].operation}`;
    if (state.transactions.filter(id => id === operationId).length !== 1 || state.transactions.filter(id => id === outputId).length !== 1 || state.transactions.filter(id => id === `survey:${prefix}:essential`).length !== 1) throw new Error('Transaction idempotency keys missing/duplicated in read-only save.');
    report.events.push({ type: 'report-filed-by-ui', report: state.bases[prefix].report, stock: state.bases[prefix].stock, operationId, outputId, saveRevision: state.saveRevision });
    await snap(`${prefix}-06-report-filed.png`);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForSelector('.mission-stage canvas', { timeout: 20000 }); await wait(700);
    const reloaded = await save();
    if (!reloaded?.bases[prefix]?.report || JSON.stringify(reloaded.bases[prefix].stock) !== JSON.stringify(expectedStock) || reloaded.transactions.filter(id => id === operationId).length !== 1 || reloaded.transactions.filter(id => id === outputId).length !== 1) throw new Error('Reload did not preserve report, stock, and unique transaction keys.');
    await driveTo(region.center[0], region.center[1] + 8, 5.2); await openBase();
    const submitVisible = await button('Submit region report', { optional: true });
    if (submitVisible !== null) throw new Error('Report submission remained available after filed report (idempotency UI regression).');
    const afterUI = await save();
    if (!afterUI.bases[prefix].report || JSON.stringify(afterUI.bases[prefix].stock) !== JSON.stringify(expectedStock)) throw new Error('Opening filed report changed stock/report.');
    report.events.push({ type: 'reload-and-report-ui-idempotency', report: afterUI.bases[prefix].report, stock: afterUI.bases[prefix].stock, submitVisible: false, transactionCounts: { survey: afterUI.transactions.filter(id => id === `survey:${prefix}:essential`).length, operation: afterUI.transactions.filter(id => id === operationId).length, output: afterUI.transactions.filter(id => id === outputId).length } });
    await snap(`${prefix}-07-reload-filed.png`);
    report.finalSave = { saveRevision: afterUI.saveRevision, stock: afterUI.bases[prefix].stock, report: afterUI.bases[prefix].report, observations: afterUI.surveys[prefix].observations, paid: afterUI.surveys[prefix].paid, activityDone: afterUI.surveys[prefix].activityDone, activityProgress: afterUI.surveys[prefix].activityProgress, operation: afterUI.surveys[prefix].operation, transactions: afterUI.transactions.filter(id => id.includes(prefix)) };
  } catch (error) {
    report.error = String(error?.stack ?? error);
    report.lastSave = page ? await save().catch(() => null) : null;
    if (page) await snap(`${prefix}-99-failure.png`).catch(() => undefined);
  } finally {
    report.errors = [...new Set(report.errors)];
    report.sourceSha256After = await fingerprint().catch(error => ({ error: String(error) }));
    report.sourceStableDuringRun = JSON.stringify(report.sourceSha256Before) === JSON.stringify(report.sourceSha256After);
    await artifact().catch(() => undefined);
    await browser.close();
  }
  reports.push(report);
  console.log(JSON.stringify({ region: prefix, error: report.error ?? null, finalSave: report.finalSave ?? null, screenshots: report.screenshots, errors: report.errors, warnings: report.warnings, sourceStableDuringRun: report.sourceStableDuringRun }, null, 2));
  return report;
}

await mkdir(output, { recursive: true });
for (const region of selectedRegions) {
  const result = await runRegion(region);
  if (result.error) continue; // Bounded region stop; other map remains independent.
}
if (!requestedRegion) {
  await writeFile(`${output}/regions-b-summary.json`, JSON.stringify(reports, null, 2));
  if (reports.length !== 2 || reports.some(report => report.error || !report.finalSave || !report.sourceStableDuringRun)) process.exitCode = 1;
} else if (reports.some(report => report.error || !report.finalSave || !report.sourceStableDuringRun)) process.exitCode = 1;
