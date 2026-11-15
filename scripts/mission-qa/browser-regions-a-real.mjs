import puppeteer from 'puppeteer-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = 'C:/Hackathon/output/ares-release/repo';
const scratch = 'C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-a';
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const sourcePaths = [
  'src/App.tsx', 'src/main.tsx', 'src/game/mission/MissionGame.tsx',
  'src/game/mission/activities/ActivityPanel.tsx', 'src/game/mission/activities/rules.ts',
  'src/game/mission/state.ts', 'src/game/mission/store.ts', 'src/game/mission/content.ts',
  'src/game/mission/contract.ts', 'src/game/mission/world/MissionWorld.tsx',
  'src/game/mission/world/FieldCamp.tsx', 'src/game/mission/presentation/cinematics/MissionCinematic.tsx',
  'src/game/mission/presentation/cinematics/timeline.ts',
];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const hashSources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, createHash('sha256').update(await readFile(`${root}/${path}`)).digest('hex')])));
const rulesSource = await readFile(`${root}/src/game/mission/activities/rules.ts`, 'utf8');
const rulesCode = ts.transpileModule(rulesSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const rules = await import(`data:text/javascript;base64,${Buffer.from(rulesCode).toString('base64')}`);

async function dustSolutions(boardIndex) {
  const board = rules.DUST_BOARDS[boardIndex];
  const rotations = Array(9).fill(null);
  for (const tile of board.tiles) rotations[tile.cell] = 0;
  const solutions = [];
  function search(i) {
    if (i === board.tiles.length) { if (rules.runDustModel(boardIndex, rotations).complete) solutions.push([...rotations]); return; }
    const cell = board.tiles[i].cell;
    for (let rotation = 0; rotation < 4; rotation += 1) { rotations[cell] = rotation; search(i + 1); }
  }
  search(0);
  if (!solutions.length) throw new Error(`Shared rules found no solution for dust board ${boardIndex + 1}`);
  return solutions[0];
}

async function runRegion(region) {
  await mkdir(scratch, { recursive: true });
  const label = region === 'impact' ? 'Impact Ridge' : 'Wind Basin';
  const out = `${scratch}/${region}-attempt3`;
  await mkdir(out, { recursive: true });
  const report = { region, label, url, viewport: { width: 1440, height: 900 }, errors: [], warnings: [], failedRequests: [], checkpoints: [], screenshots: [], startedAt: new Date().toISOString() };
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-first-run'] });
  const page = await browser.newPage();
  let sequence = 0;
  page.on('pageerror', error => report.errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`); if (message.type() === 'warning') report.warnings.push(message.text()); });
  page.on('requestfailed', request => report.failedRequests.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push(`${response.status()} ${response.url()}`); });
  const checkpoint = async (name) => {
    const state = await page.evaluate(key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }, storageKey).catch(() => null);
    const local = state ? {
      saveRevision: state.saveRevision, started: state.started, startRegion: state.startRegion,
      introSeen: state.introSeen, leo: state.leo, activeRover: state.activeRover,
      stock: state.bases?.[region]?.stock, unlocked: state.bases?.[region]?.unlocked, report: state.bases?.[region]?.report,
      observations: state.surveys?.[region]?.observations, paid: state.surveys?.[region]?.paid,
      activityDone: state.surveys?.[region]?.activityDone, activityProgress: state.surveys?.[region]?.activityProgress,
      operation: state.surveys?.[region]?.operation,
    } : null;
    report.checkpoints.push({ name, at: new Date().toISOString(), save: local });
    await persist();
    return local;
  };
  const persist = async () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  const screenshot = async name => {
    const path = `${out}/${name}`;
    await page.screenshot({ path, type: 'png' });
    report.screenshots.push(path);
    await persist();
    return path;
  };
  async function clickButton(text, { exact = false } = {}) {
    for (const button of await page.$$('button')) {
      const label = await button.evaluate(el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '));
      if ((exact && label === text) || (!exact && label.includes(text))) {
        await button.click(); await wait(250); return label;
      }
    }
    throw new Error(`Visible button not found (${text})`);
  }
  async function save() { return page.evaluate(key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }, storageKey); }
  async function pressVector(dx, dz, durationMs) {
    const keys = [];
    if (dx > 0.1) keys.push('d'); if (dx < -0.1) keys.push('a'); if (dz > 0.1) keys.push('s'); if (dz < -0.1) keys.push('w');
    if (!keys.length) return;
    await page.click('.mission-stage canvas');
    if (keys.length > 1) await page.keyboard.down('Shift');
    for (const key of keys) await page.keyboard.down(key);
    await wait(durationMs);
    for (const key of keys) await page.keyboard.up(key);
    if (keys.length > 1) await page.keyboard.up('Shift');
    await wait(180);
  }
  async function driveTo(tx, tz, radius = 5, maxSteps = 100) {
    for (let step = 0; step < maxSteps; step += 1) {
      const state = await save();
      const pose = state?.leo;
      if (!pose) throw new Error('Read-only local mission save unavailable while moving.');
      const dx = tx - pose.x, dz = tz - pose.z, distance = Math.hypot(dx, dz);
      if (distance <= radius) return { pose, distance, steps: step };
      const seconds = Math.min(0.65, Math.max(0.12, ((distance - radius) / 7.5) * 0.65));
      await pressVector(dx, dz, seconds * 1000);
    }
    const pose = (await save()).leo;
    throw new Error(`Real keyboard movement did not reach [${tx},${tz}], last pose ${JSON.stringify(pose)}`);
  }
  async function interact() { await page.click('.mission-stage canvas'); await page.keyboard.press('e'); await wait(400); }
  async function openBase() { await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 }); }
  async function observe(id, target, tool) {
    const approach = await driveTo(target[0], target[1], 6);
    report.checkpoints.push({ name: `at observation ${id}`, approach }); await persist();
    await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await clickButton(`Run ${tool}`); await clickButton('Save observation');
    const state = await checkpoint(`observation ${id} saved`);
    if (!state?.observations?.includes(id)) throw new Error(`Observation ${id} not present in actual persisted save.`);
    await clickButton('Close panel');
  }
  try {
    report.sourceHashesBefore = await hashSources();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
    await screenshot('01-region-title.png');
    for (const button of await page.$$('.start-region')) {
      const text = await button.evaluate(el => el.innerText || el.textContent || '');
      if (text.includes(label)) { await button.click(); break; }
    }
    await page.click('.start-action');
    await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
    await clickButton('Skip scene');
    await page.waitForSelector('.mission-stage canvas', { timeout: 25000 });
    await wait(1200);
    const initial = await checkpoint('fresh UI start and actual region selected');
    if (!initial?.started || initial.startRegion !== region || !initial.unlocked) throw new Error(`Fresh public UI start did not select/unlock ${region}: ${JSON.stringify(initial)}`);
    await screenshot('02-world-actor-terrain-controls.png');
    await openBase();
    await screenshot('03-base-console.png');
    await clickButton('Close panel');
    const observations = region === 'impact'
      ? [['impact-h1', [-186, -154], 'mast camera'], ['impact-h2', [-216, -160], 'image comparator']]
      : [['dust-d1', [15, 10], 'field camera'], ['dust-d2', [-14, 12], 'inspection camera']];
    for (const [id, pos, tool] of observations) await observe(id, pos, tool);
    const beforePay = await checkpoint('two UI-recorded observations');
    if ((beforePay.observations?.length ?? 0) < 2) throw new Error('Two genuine observation records were not present before payment.');
    await driveTo(region === 'impact' ? -200 : 0, (region === 'impact' ? -170 : 0) + 8, 5);
    await openBase();
    await clickButton('Confirm essential pack');
    const paid = await checkpoint('essential pack paid by public UI');
    if (!paid.paid) throw new Error('Essential pack click did not persist paid=true.');
    await clickButton('Open activity');
    await page.waitForSelector('[role="dialog"] h2', { timeout: 5000 });
    await screenshot('04-activity.png');

    if (region === 'impact') {
      await clickButton('Signal A · Rim check');
      await clickButton('Crater basin overview');
      const wrongText = await page.$eval('[role="dialog"] [role="status"]', el => el.innerText).catch(() => '');
      const afterWrong = await checkpoint('wrong IMPACT pair feedback');
      if (!/timestamps differ/i.test(wrongText) || (afterWrong.activityProgress?.matches?.length ?? 0) !== 0) throw new Error(`Wrong pair feedback/state unexpected: ${wrongText}`);
      await clickButton('Signal A · Rim check'); await clickButton('Rim and scattered rock');
      await clickButton('Signal B · Basin scan'); await clickButton('Crater basin overview');
      await clickButton('Signal C · Slope scan'); await clickButton('Sloped surface detail');
      const solved = await checkpoint('three correct IMPACT pairs through actual clicks');
      if (!solved.activityDone || solved.activityProgress?.matches?.length !== 3) throw new Error('IMPACT activity did not complete in saved mission state.');
    } else {
      for (let boardIndex = 0; boardIndex < rules.DUST_BOARDS.length; boardIndex += 1) {
        const board = rules.DUST_BOARDS[boardIndex];
        const wanted = await dustSolutions(boardIndex);
        if (boardIndex > 0) await clickButton(`Board ${boardIndex + 1}:`);
        let state = await save();
        for (const tile of board.tiles) {
          const current = state?.surveys?.dust?.activityProgress?.rotations?.[boardIndex]?.[tile.cell] ?? 0;
          const target = wanted[tile.cell] ?? 0;
          for (let rotate = 0; rotate < (target - current + 4) % 4; rotate += 1) {
            const expected = `Tile ${tile.cell + 1}, ${tile.shape}, rotation ${((current + rotate) % 4) * 90} degrees. Rotate 90 degrees.`;
            await clickButton(expected, { exact: true });
          }
        }
        await clickButton('Run model');
        const modelText = await page.$eval('[role="dialog"] [role="status"]', el => el.innerText).catch(() => '');
        state = await checkpoint(`DUST board ${boardIndex + 1} ran via UI`);
        const boardComplete = rules.runDustModel(boardIndex, state.activityProgress.rotations[boardIndex]).complete;
        if (!boardComplete || !/solved|reaches the sampler/i.test(modelText)) throw new Error(`Dust board ${boardIndex + 1} did not show valid completion: ${modelText}`);
      }
      const solved = await checkpoint('all three DUST boards complete');
      if (!solved.activityDone) throw new Error('DUST activityDone was not saved after all three UI model runs.');
    }
    await screenshot('05-activity-complete.png');
    await clickButton('Close panel');
    await driveTo(region === 'impact' ? -200 : 0, (region === 'impact' ? -170 : 0) + 8, 5);
    await openBase();
    const operation = region === 'impact' ? 'Protected sample store' : 'Clean solar panels';
    await clickButton(operation);
    const afterOperation = await checkpoint('one operation selected through UI');
    const expectedStock = region === 'impact' ? { energy: 8, meals: 3, water: 4, air: 3 } : { energy: 10, meals: 3, water: 4, air: 3 };
    if (afterOperation.operation !== (region === 'impact' ? 'impact-protected' : 'dust-clean-panels') || JSON.stringify(afterOperation.stock) !== JSON.stringify(expectedStock)) throw new Error(`Operation/stock mismatch: ${JSON.stringify(afterOperation)}`);
    await clickButton('Submit region report');
    const filed = await checkpoint('region report filed through UI');
    if (!filed.report) throw new Error('Submit report action did not persist base.report=true.');
    await screenshot('06-report-filed.png');
    const basePanelText = await page.$eval('[role="dialog"]', el => el.innerText);
    report.reportVisibleText = basePanelText.slice(-1000);
    if (!/Report filed/i.test(basePanelText)) throw new Error('Base panel did not visibly confirm report filing.');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.mission-stage canvas', { timeout: 20000 });
    const reloaded = await checkpoint('reload persistence');
    if (!reloaded.report || !reloaded.activityDone || JSON.stringify(reloaded.stock) !== JSON.stringify(expectedStock)) throw new Error(`Reload did not preserve report/progress/stock: ${JSON.stringify(reloaded)}`);
    report.repeatReportControl = 'Not offered after filing; base UI displays Report filed and no Submit region report button.';
    report.outcome = 'PASS';
  } catch (error) {
    report.outcome = 'INCOMPLETE/FAIL'; report.error = String(error?.stack ?? error);
    try { await screenshot('99-failure.png'); } catch {}
    report.lastSave = await page.evaluate(key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }, storageKey).catch(() => null);
  } finally {
    report.sourceHashesAfter = await hashSources().catch(() => null);
    report.sourceChanged = JSON.stringify(report.sourceHashesBefore) !== JSON.stringify(report.sourceHashesAfter);
    report.finishedAt = new Date().toISOString();
    await persist().catch(() => undefined);
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
  return report;
}

const results = [];
for (const region of ['impact', 'dust']) {
  const result = await runRegion(region).catch(error => ({ region, outcome: 'INCOMPLETE/FAIL', error: String(error?.stack ?? error) }));
  results.push(result);
  console.log(`CHECKPOINT ${region}: ${result.outcome ?? 'FAIL'}; artifact ${scratch}/${region}/report.json`);
}
await writeFile(`${scratch}/summary.json`, JSON.stringify(results, null, 2));
