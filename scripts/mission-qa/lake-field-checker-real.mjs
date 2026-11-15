import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'C:/Hackathon/output/ares-release/repo/output/mission-v2/lake-field-review';
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const report = { url, viewport: { width: 1280, height: 800 }, errors: [], screenshots: [], events: [] };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let page;
async function clickButton(text, { exact = false, optional = false } = {}) {
  for (const button of await page.$$('button')) {
    const label = await button.evaluate(element => (element.getAttribute('aria-label') || element.getAttribute('title') || element.innerText || element.textContent || '').trim().replace(/\s+/g, ' '));
    if (exact ? label === text : label.includes(text)) {
      await button.click();
      await wait(250);
      return label;
    }
  }
  if (optional) return null;
  throw new Error(`Visible button not found: ${text}`);
}
async function save() {
  return page.evaluate(key => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, storageKey);
}
async function stateSummary() {
  const state = await save();
  if (!state) return null;
  return {
    saveRevision: state.saveRevision,
    started: state.started,
    startRegion: state.startRegion,
    introSeen: state.introSeen,
    leo: state.leo,
    activeRover: state.activeRover,
    rover: state.rovers?.lake,
    stock: state.bases?.lake?.stock,
    observations: state.surveys?.lake?.observations,
    paid: state.surveys?.lake?.paid,
    activityDone: state.surveys?.lake?.activityDone,
    operation: state.surveys?.lake?.operation,
    report: state.bases?.lake?.report,
    activityProgress: state.surveys?.lake?.activityProgress,
  };
}
async function screenshot(name) {
  const path = `${output}/${name}`;
  await page.screenshot({ path, type: 'png' });
  report.screenshots.push(path);
  return path;
}
async function pressVector(dx, dz, durationMs) {
  const keys = [];
  if (dx > 0.1) keys.push('d');
  if (dx < -0.1) keys.push('a');
  if (dz > 0.1) keys.push('s');
  if (dz < -0.1) keys.push('w');
  if (keys.length === 0) return;
  await page.click('.mission-stage canvas');
  if (keys.length > 1) await page.keyboard.down('Shift');
  for (const key of keys) await page.keyboard.down(key);
  await wait(durationMs);
  for (const key of keys) await page.keyboard.up(key);
  if (keys.length > 1) await page.keyboard.up('Shift');
  await wait(200);
}
async function driveTo(targetX, targetZ, radius, actor, maxSteps = 80) {
  const speed = actor === 'lake' ? 14 : 7.5;
  for (let step = 0; step < maxSteps; step += 1) {
    const state = await save();
    const pose = actor === 'lake' ? state.rovers.lake : state.leo;
    const dx = targetX - pose.x, dz = targetZ - pose.z;
    const distance = Math.hypot(dx, dz);
    report.events.push({ type: 'movement-sample', actor, target: [targetX, targetZ], step, pose: { ...pose }, distance });
    if (distance <= radius) return { pose, distance, steps: step };
    const seconds = Math.min(0.65, Math.max(0.12, ((distance - radius) / speed) * 0.65));
    await pressVector(dx, dz, seconds * 1000);
  }
  throw new Error(`Real controls did not reach target ${targetX},${targetZ} within ${maxSteps} movement samples.`);
}
async function interact() {
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.keyboard.press('e');
  await wait(500);
}
async function recordObservation(id, position, toolName) {
  const approached = await driveTo(position[0], position[1], 6, 'leo');
  report.events.push({ type: 'observation-approach', id, ...approached });
  await interact();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await clickButton(`Run ${toolName}`);
  await clickButton('Save observation');
  const after = await stateSummary();
  report.events.push({ type: 'observation-saved', id, save: after });
  await clickButton('Close panel');
  return after;
}
async function openBase() {
  await interact();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}
async function openLakeField() {
  await clickButton('Enter lake rover field activity');
  const entered = await stateSummary();
  report.events.push({ type: 'enter-rover', save: entered });
  await clickButton('Open rover field activity');
  await page.waitForSelector('.lake-field-panel', { timeout: 8000 });
  await wait(1200);
  requestedAim = (await stateSummary()).rover.heading;
  report.events.push({ type: 'field-open', save: await stateSummary(), requestedAim, text: await page.$eval('.lake-field-panel', e => e.innerText.slice(0, 800)) });
}
async function chooseTarget(name) {
  await clickButton(name);
  await wait(400);
}
let requestedAim = 0;
async function aimTo(bearing) {
  let delta = bearing - requestedAim;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const count = Math.round(Math.abs(delta) / 0.15);
  const step = delta < 0 ? -0.15 : 0.15;
  const button = step < 0 ? 'Aim left' : 'Aim right';
  for (let index = 0; index < count; index += 1) {
    await clickButton(button);
    requestedAim += step;
    if (index % 5 === 4) await wait(250);
  }
  return { requestedAim, targetBearing: bearing, requestedSteps: count, direction: button };
}
async function captureTarget(target) {
  await chooseTarget(target.name);
  const approach = await driveTo(target.x, target.z + 5, 0.8, 'lake');
  if (approach.distance > 6) throw new Error(`Target approach is too far at ${target.name}: ${approach.distance.toFixed(2)}.`);
  const before = await stateSummary();
  const pose = before.rover;
  const bearing = Math.atan2(target.x - pose.x, target.z - pose.z);
  const aimResult = await aimTo(bearing);
  await wait(750);
  await clickButton('Wide', { exact: true });
  await wait(500);
  await clickButton('Wide frame', { exact: true });
  await wait(400);
  const wide = await stateSummary();
  if (!wide.activityProgress?.captures?.[target.id]?.wide) throw new Error(`Wide frame was rejected at ${target.name}: ${await page.$eval('.lake-field-panel [role="status"]', e => e.innerText)}`);
  await clickButton('Close', { exact: true });
  await wait(500);
  await clickButton('Close frame', { exact: true });
  await wait(400);
  const close = await stateSummary();
  if (!close.activityProgress?.captures?.[target.id]?.close) throw new Error(`Close frame was rejected at ${target.name}: ${await page.$eval('.lake-field-panel [role="status"]', e => e.innerText)}`);
  await clickButton('Record location', { exact: true });
  await wait(400);
  const location = await stateSummary();
  if (!location.activityProgress?.captures?.[target.id]?.location) throw new Error(`Location fix was rejected at ${target.name}: ${await page.$eval('.lake-field-panel [role="status"]', e => e.innerText)}`);
  report.events.push({ type: 'target-evidence', name: target.name, position: [target.x, target.z], approach, aim: aimResult, wide: wide.activityProgress?.captures, close: close.activityProgress?.captures, location: location.activityProgress?.captures, pose: location.rover });
}
try {
  await mkdir(output, { recursive: true });
  page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => report.errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
  await screenshot('02-lake-field-title.png');
  for (const button of await page.$$('.start-region')) {
    const label = await button.evaluate(element => element.innerText || element.textContent || '');
    if (label.includes('Old Lake Shore')) { await button.click(); break; }
  }
  await page.click('.start-action');
  await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
  await clickButton('Skip scene');
  await page.waitForSelector('.mission-stage canvas', { timeout: 25000 });
  await wait(1200);
  await screenshot('03-lake-field-world.png');
  report.events.push({ type: 'fresh-start', save: await stateSummary() });
  await openBase();
  await clickButton('Close panel');
  await recordObservation('lake-l1', [216, 186], 'rover camera');
  await recordObservation('lake-l2', [184, 180], 'rover arm');
  await driveTo(200, 182, 5, 'leo');
  await openBase();
  await clickButton('Confirm essential pack');
  report.events.push({ type: 'essential-pack', save: await stateSummary() });
  await clickButton('Enter lake rover field activity');
  await clickButton('Open rover field activity');
  await page.waitForSelector('.lake-field-panel', { timeout: 8000 });
  await wait(1500);
  report.events.push({ type: 'field-open', save: await stateSummary(), text: await page.$eval('.lake-field-panel', element => element.innerText.slice(0, 1000)) });
  await screenshot('04-lake-field-console.png');
  await driveTo(206, 176, 4, 'lake');
  report.events.push({ type: 'survey-position', save: await stateSummary() });
  await screenshot('05-lake-field-target-approach.png');
  const targets = [
    { id: 'layer-outcrop', name: 'Layered outcrop', x: 202, z: 170 },
    { id: 'comparison-surface', name: 'Comparison surface', x: 211, z: 171 },
    { id: 'sample-site', name: 'Sample-site marker', x: 206, z: 182 },
  ];
  for (const target of targets) await captureTarget(target);
  report.finalSave = await stateSummary();
  report.errors.push(...(report.finalSave?.activityDone ? [] : ['Lake activity incomplete; no full-pass claim.']));
  await clickButton('Close field activity');
  report.afterClose = await stateSummary();
  await clickButton('Return to Leo');
  report.afterExit = await stateSummary();
  const returnDistance = Math.hypot(report.afterExit.leo.x - 200, report.afterExit.leo.z - 178);
  if (report.afterExit.activeRover !== null || returnDistance > 8) throw new Error(`Leo is not at the Lake console after rover exit; distance ${returnDistance.toFixed(2)}.`);
  await interact();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await clickButton('Short transmission and rover check');
  const afterOperation = await stateSummary();
  report.events.push({ type: 'lake-operation', returnDistance, save: afterOperation });
  await clickButton('Submit region report');
  report.finalSave = await stateSummary();
  if (!report.finalSave.report || report.finalSave.operation !== 'lake-summary-inspection' || JSON.stringify(report.finalSave.stock) !== JSON.stringify({ energy: 8, meals: 3, water: 4, air: 3 })) throw new Error('Lake job/report transaction did not persist report and exact 8/3/4/3 stock.');
  report.events.push({ type: 'lake-report', save: report.finalSave });
  await writeFile(`${output}/real-checker-result.json`, JSON.stringify(report, null, 2));
  report.checks = [
    'Fresh profile, Lake selection, and intro completed using visible controls.',
    'Two Lake observations recorded and essential pack paid through UI controls.',
    'Rover entered and driven using real keyboard input; Lake targets recorded through activity controls only.',
    'Mission save inspected read-only; no state injection or manual evidence construction.',
  ];
  await writeFile(`${output}/real-checker-result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = String(error?.stack ?? error);
  report.lastSave = page ? await stateSummary().catch(() => null) : null;
  if (page) await screenshot('99-lake-field-failure.png').catch(() => undefined);
  await writeFile(`${output}/real-checker-result.json`, JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ error: report.error, lastSave: report.lastSave, screenshots: report.screenshots, errors: report.errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
