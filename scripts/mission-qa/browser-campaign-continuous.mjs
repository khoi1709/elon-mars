import puppeteer from 'puppeteer-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// One fresh default Puppeteer profile, one public campaign, read-only save inspection.
const root = 'C:/Hackathon/output/ares-release/repo';
const out = 'C:/Hackathon/scratch/2026-11/week-46/2026-11-14_campaign-continuous';
const url = 'http://127.0.0.1:3001/?mission=frontiers';
const key = 'ares-cradle-mission-v2';
const regions = ['lake', 'ice', 'dust', 'impact', 'volcano'];
const centers = { lake: [200, 170], ice: [210, -180], dust: [0, 0], impact: [-200, -170], volcano: [-210, 180] };
const sourcePaths = ['src/App.tsx','src/main.tsx','src/game/mission/MissionGame.tsx','src/game/mission/activities/ActivityPanel.tsx','src/game/mission/mission.css','src/game/mission/activities/rules.ts','src/game/mission/state.ts','src/game/mission/store.ts','src/game/mission/content.ts','src/game/mission/contract.ts','src/game/mission/world/MissionWorld.tsx','src/game/mission/world/FieldCamp.tsx','src/game/mission/world/SolCompanion.tsx','src/game/mission/presentation/cinematics/MissionCinematic.tsx','src/game/mission/presentation/cinematics/timeline.ts','src/game/mission/presentation/cinematics/cinematics.css','vite.config.ts','scripts/mission-qa/offline-build-plugin.ts','src/platform/offline.ts'];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadlineAt = Date.now() + 30 * 60 * 1000;
function enforceDeadline() { if (Date.now() >= deadlineAt) throw new Error('Hard continuous-campaign runtime cap reached (30 minutes).'); }
const report = { url, profile: 'one fresh temporary Edge profile; Puppeteer default; no userDataDir', campaign: 'one start; Lake → Ice → Dust → Impact → Volcano', startedAt: new Date().toISOString(), outcome: 'RUNNING', events: [], screenshots: [], checkpoints: [], errors: [], sourcePaths };
let browser, page, sequence = 0, lakeLeoEntryPose = null, lakeRequestedAim = null;
const persist = async (name = 'report.json') => writeFile(`${out}/${name}`, JSON.stringify(report, null, 2));
const save = async () => page.evaluate(storageKey => { const raw = localStorage.getItem(storageKey); return raw ? JSON.parse(raw) : null; }, key);
const hashFence = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, createHash('sha256').update(await readFile(`${root}/${path}`)).digest('hex')])));
const summary = state => state && ({ saveRevision: state.saveRevision, started: state.started, startRegion: state.startRegion, introSeen: state.introSeen, leo: state.leo, activeRover: state.activeRover, rover: state.rovers?.lake, reports: Object.fromEntries(regions.map(id => [id, state.bases?.[id]?.report])), bases: Object.fromEntries(regions.map(id => [id, state.bases?.[id] && ({ unlocked: state.bases[id].unlocked, stock: state.bases[id].stock, checks: state.bases[id].checks, report: state.bases[id].report })])), surveys: Object.fromEntries(regions.map(id => [id, state.surveys?.[id] && ({ observations: state.surveys[id].observations, paid: state.surveys[id].paid, activityDone: state.surveys[id].activityDone, activityProgress: state.surveys[id].activityProgress, operation: state.surveys[id].operation })])), transactions: state.transactions, researchGoal: state.researchGoal, arrivalBase: state.arrivalBase, arrival: state.arrival });
async function checkpoint(name, extra = {}) {
  const state = await save().catch(() => null);
  const item = { name, at: new Date().toISOString(), state: summary(state), ...extra };
  report.checkpoints.push(item); report.lastCheckpoint = item; await persist();
  await writeFile(`${out}/checkpoint-${String(++sequence).padStart(3, '0')}-${name.replace(/[^a-z0-9-]+/gi, '-')}.json`, JSON.stringify(item, null, 2));
  return state;
}
async function shot(name) { const path = `${out}/${name}`; await page.screenshot({ path, type: 'png' }); report.screenshots.push(path); await persist(); return path; }
async function button(text, { exact = false, optional = false, regex = false } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const b of await page.$$('button')) {
      const label = await b.evaluate(el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '));
      const match = regex ? new RegExp(text, 'i').test(label) : exact ? label === text : label.includes(text);
      if (match && await b.evaluate(el => !el.disabled && el.getClientRects().length > 0)) { await b.click(); await wait(260); return label; }
    }
    if (attempt === 0) await wait(500); // Same live page/profile; one bounded render-race retry, never replay a committed phase.
  }
  if (optional) return null;
  throw new Error(`Enabled visible button not found after same-page retry: ${text}`);
}
async function clickRegionStart(label) {
  for (const b of await page.$$('.start-region')) {
    if ((await b.evaluate(el => el.innerText || el.textContent || '')).includes(label)) { await b.click(); return true; }
  }
  return false;
}
async function canvasFocus() { await page.click('.mission-stage canvas'); }
async function move(dx, dz, ms) {
  const keys = []; if (dx > 0.1) keys.push('d'); if (dx < -0.1) keys.push('a'); if (dz > 0.1) keys.push('s'); if (dz < -0.1) keys.push('w');
  if (!keys.length) return;
  await canvasFocus(); await page.keyboard.down('Shift'); for (const k of keys) await page.keyboard.down(k); await wait(ms); for (const k of keys) await page.keyboard.up(k); await page.keyboard.up('Shift'); await wait(180);
}
async function driveTo(tx, tz, radius = 5, maxSteps = 100) {
  let previous = Infinity;
  for (let step = 0; step < maxSteps; step++) {
    enforceDeadline();
    const s = await save(), p = s?.leo;
    if (!p || s.activeRover !== null) throw new Error('Leo pose unavailable or rover active during on-foot navigation.');
    const dx = tx - p.x, dz = tz - p.z, distance = Math.hypot(dx, dz);
    report.events.push({ type: 'leo-keyboard-sample', step, pose: { x: p.x, z: p.z }, target: [tx, tz], distance: Number(distance.toFixed(2)) });
    if (distance <= radius) return { pose: p, distance, steps: step };
    if (distance > previous + 2) throw new Error(`Movement moved away from target; stop at ${JSON.stringify(p)} toward [${tx},${tz}].`);
    previous = distance;
    const seconds = Math.min(0.65, Math.max(0.12, ((distance - radius) / 7.5) * 0.65));
    await move(dx, dz, seconds * 1000);
  }
  throw new Error(`Leo did not reach [${tx},${tz}] within ${maxSteps} feedback samples; current save ${JSON.stringify((await save())?.leo)}.`);
}
async function interact() { await canvasFocus(); await page.keyboard.press('e'); await wait(450); }
async function openBase(region) {
  const [x, z] = centers[region]; await driveTo(x, z + 12, 5);
  await interact();
  let s = await save();
  if (!s.bases[region].unlocked) {
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await button('Close panel'); await driveTo(x, z + 8, 5); await interact(); s = await save();
  }
  if (!s.bases[region].unlocked) throw new Error(`Physical E interaction did not unlock ${region}; state=${JSON.stringify(summary(s))}`);
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  return s;
}
async function observation(region, id, pos, tool) {
  let s = await save(); if (s.surveys[region].observations.includes(id)) return;
  await driveTo(pos[0], pos[1], 6); await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await button(`Run ${tool}`); await button('Save observation'); s = await save();
  if (!s.surveys[region].observations.includes(id)) throw new Error(`Actual UI observation ${id} missing from read-only save.`);
  report.events.push({ type: 'observation-saved-via-UI', region, id, leo: s.leo }); await button('Close panel'); await checkpoint(`${region}-${id}`);
}
async function essential(region) {
  let s = await save(); if (s.surveys[region].paid) return;
  await driveTo(centers[region][0], centers[region][1] + 12, 5); await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const before = s.bases[region].stock;
  if (JSON.stringify(before) !== JSON.stringify({ energy: 12, meals: 4, water: 5, air: 4 })) throw new Error(`${region} initial local stock unexpected: ${JSON.stringify(before)}`);
  await button('Confirm essential pack'); s = await save();
  if (!s.surveys[region].paid || JSON.stringify(s.bases[region].stock) !== JSON.stringify({ energy: 10, meals: 3, water: 4, air: 3 })) throw new Error(`UI essential payment mismatch for ${region}: ${JSON.stringify(s.bases[region].stock)}`);
  report.events.push({ type: 'essential-pack-via-UI', region, stock: s.bases[region].stock, transaction: `survey:${region}:essential` }); await button('Close panel'); await checkpoint(`${region}-paid`);
}
async function activityButton(label, options) { return button(label, options); }
async function solveImpact() {
  let s = await save();
  if (!s.surveys.impact.activityProgress?.matches?.length) {
    await button('Signal A · Rim check'); await button('Crater basin overview');
    const wrong = await page.$eval('[role="dialog"] [role="status"]', e => e.innerText).catch(() => '');
    s = await save(); if (!/timestamps differ/i.test(wrong) || s.surveys.impact.activityProgress?.matches?.length) throw new Error(`Impact wrong-pair feedback/progress unexpected: ${wrong}`);
  }
  const matches = (await save()).surveys.impact.activityProgress?.matches ?? [];
  const pairs = [['Signal A · Rim check','Rim and scattered rock','signal-rim'],['Signal B · Basin scan','Crater basin overview','signal-basin'],['Signal C · Slope scan','Sloped surface detail','signal-slope']];
  for (const [signal, frame, id] of pairs) if (!matches.some(match => match.signal === id)) { await button(signal); await button(frame); }
  s = await save(); if (!s.surveys.impact.activityDone || s.surveys.impact.activityProgress?.matches?.length !== 3) throw new Error('Impact three actual signal/context matches not complete.');
}
async function dustSolution(rules, index) {
  const board = rules.DUST_BOARDS[index], rot = Array(9).fill(null), result = [];
  function search(i) { if (i === board.tiles.length) { if (rules.runDustModel(index, rot).complete) result.push([...rot]); return; } const cell = board.tiles[i].cell; for (let r = 0; r < 4; r++) { rot[cell] = r; search(i + 1); } }
  search(0); if (!result.length) throw new Error(`No authored valid solution for dust board ${index + 1}.`); return result[0];
}
async function solveDust(rules) {
  for (let index = 0; index < rules.DUST_BOARDS.length; index++) {
    const board = rules.DUST_BOARDS[index], wanted = await dustSolution(rules, index);
    if (index) await button(`Board ${index + 1}:`);
    let s = await save();
    for (const tile of board.tiles) {
      const cur = s.surveys.dust.activityProgress?.rotations?.[index]?.[tile.cell] ?? 0, target = wanted[tile.cell] ?? 0;
      for (let n = 0; n < (target - cur + 4) % 4; n++) {
        await button(`Tile ${tile.cell + 1}, ${tile.shape}, rotation ${((cur + n) % 4) * 90} degrees. Rotate 90 degrees.`, { exact: true });
      }
    }
    await button('Run model'); s = await save();
    if (!rules.runDustModel(index, s.surveys.dust.activityProgress.rotations[index]).complete) throw new Error(`Dust board ${index + 1} actual Run model not complete.`);
    const feedback = await page.$eval('[role="dialog"] [role="status"]', e => e.innerText).catch(() => '');
    if (!/solved|reaches the sampler/i.test(feedback)) throw new Error(`Dust board ${index + 1} UI did not confirm solve: ${feedback}`);
  }
  const s = await save(); if (!s.surveys.dust.activityDone) throw new Error('Dust activityDone absent after three actual model runs.');
}
async function solveVolcano() {
  const names = { foundation: 'Foundation flow', channel: 'Channel flow', shelf: 'Ridge-side flow', cap: 'Top cap' }, wanted = ['foundation','channel','shelf','cap'];
  let s = await save(); if (!s.surveys.volcano.activityProgress) { await button('Move Foundation flow down, older', { exact: true }); s = await save(); }
  let moves = 0; const initialMoves = s.surveys.volcano.activityProgress?.order ? 0 : 1;
  for (let i = 0; i < wanted.length; i++) for (;;) {
    const order = (await save()).surveys.volcano.activityProgress?.order; if (!Array.isArray(order)) throw new Error('Volcano order not saved after real layer-control input.');
    const from = order.indexOf(wanted[i]); if (from === i) break; if (++moves + initialMoves > 12) throw new Error(`Volcano exceeded 12 total reorder inputs: ${JSON.stringify(order)}`);
    const layer = order[from], dir = from > i ? 'down, older' : 'up, newer'; await button(`Move ${names[layer]} ${dir}`, { exact: true });
  }
  s = await save();
  if (!s.surveys.volcano.activityDone) { await button('Check layer order'); s = await save(); }
  if (!s.surveys.volcano.activityDone || JSON.stringify(s.surveys.volcano.activityProgress?.order) !== JSON.stringify(wanted)) throw new Error('Volcano relation check not completed through actual controls.');
}
async function solveIce() {
  await button('Layer window'); for (let i = 0; i < 10; i++) await button('Increase drill reading by 5 percent', { exact: true });
  let s = await save(); if (s.surveys.ice.activityProgress?.percent !== 50) throw new Error('Ice 50% actual drill reading missing.');
  await shot('ice-partial-50-percent.png'); await button('Check reading'); await button('Add site + layer label'); await button('Seal core box');
  s = await save(); if (!s.surveys.ice.activityDone || !s.surveys.ice.activityProgress?.sealed) throw new Error('Ice activity did not seal via actual controls.');
}
async function lakeField() {
  let s = await save();
  if (s.activeRover !== 'lake') {
    await driveTo(centers.lake[0], centers.lake[1] + 12, 5);
    lakeLeoEntryPose = { ...((await save()).leo) };
    await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await button('Enter lake rover field activity'); await checkpoint('lake-rover-entered', { leoEntryPose: lakeLeoEntryPose });
  }
  if (!(await page.$('.lake-field-panel'))) await button('Open rover field activity');
  await page.waitForSelector('.lake-field-panel', { timeout: 8000 }); await wait(1000);
  s = await save(); let requestedAim = s.rovers.lake.heading;
  const targets = [{ id: 'layer-outcrop', name: 'Layered outcrop', x: 202, z: 170 }, { id: 'comparison-surface', name: 'Comparison surface', x: 211, z: 171 }, { id: 'sample-site', name: 'Sample-site marker', x: 206, z: 182 }];
  for (const t of targets) {
    await button(t.name); await driveRoverTo(t.x, t.z + 5);
    s = await save(); const p = s.rovers.lake, bearing = Math.atan2(t.x - p.x, t.z - p.z);
    let delta = bearing - requestedAim; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2;
    const count = Math.round(Math.abs(delta) / 0.15), dir = delta < 0 ? 'Aim left' : 'Aim right';
    for (let i = 0; i < count; i++) { await button(dir); requestedAim += delta < 0 ? -0.15 : 0.15; if (i % 5 === 4) await wait(250); }
    let evidence = (await save()).surveys.lake.activityProgress?.captures?.[t.id];
    if (!evidence?.wide) { await wait(750); await button('Wide', { exact: true }); await wait(350); await button('Wide frame', { exact: true }); }
    s = await save(); if (!s.surveys.lake.activityProgress?.captures?.[t.id]?.wide) throw new Error(`Lake Wide frame rejected at ${t.id}.`);
    evidence = s.surveys.lake.activityProgress.captures[t.id];
    if (!evidence?.close) { await button('Close', { exact: true }); await wait(350); await button('Close frame', { exact: true }); }
    s = await save(); if (!s.surveys.lake.activityProgress?.captures?.[t.id]?.close) throw new Error(`Lake Close frame rejected at ${t.id}.`);
    evidence = s.surveys.lake.activityProgress.captures[t.id];
    if (!evidence?.location) await button('Record location', { exact: true });
    s = await save();
    if (!s.surveys.lake.activityProgress?.captures?.[t.id]?.location) throw new Error(`Lake location fix rejected at ${t.id}.`);
    report.events.push({ type: 'lake-live-target-evidence', target: t.id, rover: s.rovers.lake, requestedAim, progress: s.surveys.lake.activityProgress.captures[t.id] }); await checkpoint(`lake-${t.id}-captured`);
  }
  s = await save(); if (!s.surveys.lake.activityDone) throw new Error('Lake three complete live target records not marked done.');
  await button('Close field activity'); await button('Return to Leo'); s = await save();
  const exactReturn = lakeLeoEntryPose && s.leo.x === lakeLeoEntryPose.x && s.leo.z === lakeLeoEntryPose.z && s.leo.heading === lakeLeoEntryPose.heading;
  if (s.activeRover !== null || !exactReturn) throw new Error(`Leo did not return to the exact pre-entry pose; expected=${JSON.stringify(lakeLeoEntryPose)} actual=${JSON.stringify(s.leo)} activeRover=${s.activeRover}.`);
  report.events.push({ type: 'lake-rover-exit-exact-return-pose', expectedLeo: lakeLeoEntryPose, actualLeo: s.leo, activeRover: s.activeRover });
}
async function driveRoverTo(tx, tz, radius = 0.8, maxSteps = 100) {
  let previous = Infinity;
  for (let step = 0; step < maxSteps; step++) {
    enforceDeadline();
    const s = await save(), p = s?.rovers?.lake; if (!p || s.activeRover !== 'lake') throw new Error('Lake rover pose unavailable while moving.');
    const dx = tx - p.x, dz = tz - p.z, distance = Math.hypot(dx, dz);
    report.events.push({ type: 'rover-keyboard-sample', step, pose: { x: p.x, z: p.z, heading: p.heading }, target: [tx, tz], distance: Number(distance.toFixed(2)) });
    if (distance <= radius) return { pose: p, distance, steps: step };
    if (distance > previous + 2) throw new Error(`Rover moving away from target ${tx},${tz}.`); previous = distance;
    await move(dx, dz, Math.min(0.65, Math.max(0.12, ((distance - radius) / 14) * 0.65)) * 1000);
  }
  throw new Error(`Lake rover did not reach [${tx},${tz}] within ${maxSteps} samples.`);
}
async function runRegionAttempt(region, rules) {
  // A prior bounded helper attempt may have stopped in a harmless public dialog; close only that panel and resume from the inspected saved state.
  if (await page.$('[role="dialog"]')) { await button('Close panel'); await checkpoint(`resume-closed-panel-${region}`); }
  await checkpoint(`before-region-${region}`);
  let s = await save();
  if (!s.started) throw new Error('Campaign unexpectedly not started; do not reset or seed state.');
  if (region !== 'lake' && !s.bases[region].unlocked) {
    const [px, pz] = s.leo ? [s.leo.x, s.leo.z] : centers.lake;
    const [nx, nz] = centers[region];
    await walkMainRoute(px, pz, nx, nz); await checkpoint(`arrived-${region}-physical-route`);
  }
  if (!s.bases[region].unlocked) { s = await openBase(region); report.events.push({ type: 'physical-E-base-unlock', region, leo: s.leo }); await button('Close panel'); }
  const obs = {
    lake: [['lake-l1',[216,186],'rover camera'],['lake-l2',[184,180],'rover arm']],
    ice: [['ice-i1',[224,-164],'core camera'],['ice-i2',[190,-176],'radar viewer']],
    dust: [['dust-d1',[15,10],'field camera'],['dust-d2',[-14,12],'inspection camera']],
    impact: [['impact-h1',[-186,-154],'mast camera'],['impact-h2',[-216,-160],'image comparator']],
    volcano: [['volcano-v1',[-194,194],'low camera'],['volcano-v2',[-228,190],'terrain lamp']],
  }[region];
  const defs = { lake: { name: 'Old Lake Shore', operation: 'Short transmission and rover check', id: 'lake-summary-inspection' }, ice: { name: 'Enclosed Ice Wall', operation: 'Analyze the core', id: 'ice-core-analysis' }, dust: { name: 'Wind Basin', operation: 'Clean solar panels', id: 'dust-clean-panels' }, impact: { name: 'Impact Ridge', operation: 'Protected sample store', id: 'impact-protected' }, volcano: { name: 'Blackstone Steps', operation: 'Passive insulation', id: 'volcano-passive' } }[region];
  for (const [id, pos, tool] of obs) await observation(region, id, pos, tool);
  await essential(region);
  if (region === 'lake') await lakeField();
  else {
    await driveTo(centers[region][0], centers[region][1] + 12, 5); await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await button('Open activity'); await page.waitForSelector('[role="dialog"] h2', { timeout: 5000 });
    if (region === 'impact') await solveImpact(); else if (region === 'dust') await solveDust(rules); else if (region === 'ice') await solveIce(); else await solveVolcano();
    await checkpoint(`${region}-activity-complete`); await button('Close panel');
  }
  await driveTo(centers[region][0], centers[region][1] + 12, 5); await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  s = await save(); if (!s.surveys[region].activityDone || s.surveys[region].observations.length < 2) throw new Error(`${region} lacks activity or two observations at real base console.`);
  if (!s.surveys[region].operation) { await button(defs.operation); s = await save(); }
  if (s.surveys[region].operation !== defs.id) throw new Error(`${region} actual operation differs: ${s.surveys[region].operation}`);
  if (!s.bases[region].report) await button('Submit region report');
  s = await checkpoint(`${region}-report-filed`);
  const expected = region === 'dust' ? { energy: 10, meals: 3, water: 4, air: 3 } : { energy: 8, meals: 3, water: 4, air: 3 };
  if (!s.bases[region].report || JSON.stringify(s.bases[region].stock) !== JSON.stringify(expected)) throw new Error(`${region} report/stock mismatch: ${JSON.stringify(s.bases[region])}`);
  for (const id of [`survey:${region}:essential`,`operation:${region}:${defs.id}`,`operation-output:${region}:${defs.id}`]) if (s.transactions.filter(t => t === id).length !== 1) throw new Error(`${region} idempotency transaction count !=1: ${id}`);
  report.events.push({ type: 'region-report-confirmed', region, stock: s.bases[region].stock, transactions: s.transactions.filter(t => t.includes(region)) }); await shot(`${region}-report-filed.png`);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForSelector('.mission-stage canvas', { timeout: 20000 }); await wait(700);
  s = await checkpoint(`${region}-reload-preserves-report`);
  if (!s.bases[region].report || !s.surveys[region].activityDone || JSON.stringify(s.bases[region].stock) !== JSON.stringify(expected)) throw new Error(`${region} reload lost persisted report/activity/resources.`);
  return s;
}
async function runRegion(region, rules) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try { return await runRegionAttempt(region, rules); }
    catch (error) {
      // Keep this same live page/profile/save. Retry a phase only when a public UI predicate proves it did not commit.
      const s = await save().catch(() => null);
      await checkpoint(`region-${region}-helper-error-attempt-${attempt}`, { error: String(error?.stack ?? error), stateSummary: summary(s) }).catch(() => undefined);
      if (attempt === 2) throw error;
      const survey = s?.surveys?.[region];
      if (s?.bases?.[region]?.report) return s;
      if (survey?.activityDone && survey?.operation && !s.bases[region].report) continue;
      if (survey?.observations?.length >= 2 && survey?.paid && !survey.activityDone) {
        // The activity panel is real UI if present; retain it and repair only known locally deterministic selectors next pass.
        if (await page.$('[role="dialog"] h2')) continue;
      }
      // Do not restart/re-enter; preserve progress and surface the failure for evidence.
      throw error;
    }
  }
}
async function walkMainRoute(x, z, tx, tz) {
  const distance = Math.hypot(tx - x, tz - z), count = Math.max(1, Math.ceil(distance / 50));
  for (let i = 1; i <= count; i++) {
    const t = i / count, px = x + (tx - x) * t, pz = z + (tz - z) * t;
    await driveTo(px, pz, i === count ? 5 : 3.5, 100);
    if (i % 2 === 0 || i === count) await checkpoint(`route-waypoint-${Math.round(t * 100)}pct`);
  }
}
async function buttonList() { return page.$$eval('button', all => all.filter(b => !b.disabled && b.getClientRects().length).map(b => (b.getAttribute('aria-label') || b.innerText || b.textContent || '').trim().replace(/\s+/g,' '))); }
async function readiness() {
  await checkpoint('before-endgame');
  // Dust is already unlocked; use only the visible public map travel control.
  const s = await save(); if (s.activeRover) throw new Error('Unexpected active rover at endgame.');
  await button('Open map'); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await button('Wind Basin', { regex: true }); await button('Travel to selected station'); await wait(400); await page.waitForSelector('.mission-stage canvas');
  let current = await save(); if (Math.hypot(current.leo.x, current.leo.z - 12) > 8) throw new Error(`Public-map travel did not put Leo at Dust apron: ${JSON.stringify(current.leo)}`);
  await interact(); await page.waitForSelector('[role="dialog"]', { timeout: 5000 }); await button('Close panel');
  await page.waitForSelector('.readiness-launch', { timeout: 10000 }); await page.click('.readiness-launch'); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await button('Read the planet'); await button('Wind Basin', { regex: true });
  current = await save(); report.events.push({ type: 'endgame-hold-before-checks', arrivalBase: current.arrivalBase, checks: current.bases.dust.checks }); await shot('endgame-initial-hold.png');
  // Genuine site checks are available only from this station vicinity. Inspect live UI controls; never dispatch events.
  const available = await buttonList(); report.events.push({ type: 'endgame-visible-buttons-before-checks', buttons: available.filter(b => /air|heat|shelter|comm|check|proposal|send/i.test(b)) });
  for (const check of ['airheat','shelter','comms']) {
    current = await save(); if (current.bases.dust.checks[check]) continue;
    const labels = await buttonList(); const re = check === 'airheat' ? /air.*heat|heat.*air/i : check === 'shelter' ? /shelter/i : /comm/i;
    const label = labels.find(x => re.test(x) && /check|run|verify|system/i.test(x)) ?? labels.find(x => re.test(x));
    if (!label) { report.events.push({ type: 'endgame-check-control-missing', check, labels }); await checkpoint(`endgame-missing-${check}`); throw new Error(`Visible legitimate UI control for ${check} not found; no event workaround.`); }
    await button(label, { exact: true }); current = await save();
    if (!current.bases.dust.checks[check]) throw new Error(`${check} check button did not persist on Dust base.`);
    await checkpoint(`endgame-${check}-check`);
  }
  current = await save(); if (current.bases.dust.stock.energy < 8 || current.bases.dust.stock.meals < 3 || current.bases.dust.stock.water < 3 || current.bases.dust.stock.air < 3) throw new Error(`Endgame Dust stock below GO floor: ${JSON.stringify(current.bases.dust.stock)}`);
  await checkpoint('endgame-go-ready'); await shot('endgame-go-ready.png');
  const send = await button('Send proposal', { optional: true });
  if (!send) { report.events.push({ type: 'proposal-send-disabled-or-missing', buttons: await buttonList() }); await checkpoint('proposal-not-sendable'); throw new Error('Legitimate Send proposal control unavailable at GO-ready; stop without bypass.'); }
  current = await save(); const sentRevision = current.saveRevision;
  if (current.arrival !== 'sent') throw new Error(`Proposal button did not reach sent state: ${current.arrival}`);
  report.events.push({ type: 'proposal-sent', revision: sentRevision, arrival: current.arrival }); await checkpoint('proposal-awaiting-mira'); await shot('proposal-sent.png');
  let responded = null;
  for (let i = 0; i < 25; i++) { await wait(250); responded = await save(); if (responded.arrival !== 'sent') break; }
  if (!responded || responded.arrival !== 'approved') { report.events.push({ type: 'mira-response-timeout-or-hold', revision: sentRevision, arrival: responded?.arrival, message: responded?.message, saveRevision: responded?.saveRevision }); await checkpoint('mira-response-not-approved'); throw new Error(`Mira did not approve exact sent revision ${sentRevision}: ${responded?.message}`); }
  report.events.push({ type: 'mira-approved', sentRevision, responseRevision: responded.saveRevision, message: responded.message }); await checkpoint('mira-approved'); await shot('mira-approved.png');
  const arrivalButton = (await buttonList()).find(x => /arrival/i.test(x)); if (!arrivalButton) throw new Error(`Approved arrival action not visible: ${(await buttonList()).join(' | ')}`);
  await button(arrivalButton, { exact: true }); await page.waitForSelector('.mission-cinematic__skip', { timeout: 10000 });
  await shot('arrival-cinematic-visible.png'); const arrivalCaption = await page.$eval('.mission-cinematic__caption', e => e.innerText); report.events.push({ type: 'arrival-cinematic-visible', caption: arrivalCaption });
  await button('Skip scene'); current = await save(); if (current.arrival !== 'arrived') throw new Error(`Arrival skip did not persist arrived: ${current.arrival}`);
  await checkpoint('arrival-completed'); await shot('arrival-completed.png');
  await page.waitForSelector('.readiness-launch', { timeout: 10000 }); await page.click('.readiness-launch'); await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const departureButton = (await buttonList()).find(x => /departure/i.test(x)); if (!departureButton) throw new Error(`Explicit departure action not visible after arrival: ${(await buttonList()).join(' | ')}`);
  await button(departureButton, { exact: true }); await page.waitForSelector('.mission-cinematic__skip', { timeout: 10000 });
  const caption = await page.$eval('.mission-cinematic__caption', e => e.innerText); await shot('departure-cinematic-visible.png');
  if (!/12 sols after arrival/i.test(caption)) throw new Error(`Departure cinematic lacked visible 12-sol caption: ${caption}`);
  report.events.push({ type: 'departure-cinematic-visible', caption }); await button('Skip scene'); current = await save();
  if (current.arrival !== 'departed') throw new Error(`Departure did not persist: ${current.arrival}`);
  await checkpoint('departure-completed'); await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForSelector('.mission-stage canvas', { timeout: 20000 });
  current = await checkpoint('final-reload-free-exploration');
  if (current.arrival !== 'departed' || regions.some(id => !current.bases[id].report)) throw new Error('Final reload lost a report or departed state.');
  await shot('final-free-exploration.png'); return current;
}
async function main() {
  await mkdir(out, { recursive: true }); report.sourceHashesBefore = await hashFence(); await persist();
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--no-first-run'] });
  page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', r => report.errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(`http ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForSelector('.mission-start-screen', { timeout: 20000 }); await shot('01-campaign-title.png');
  if (!(await clickRegionStart('Old Lake Shore'))) throw new Error('Public start screen did not offer Old Lake Shore.');
  await button('Begin field mission'); await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 }); await button('Skip scene');
  await page.waitForSelector('.mission-stage canvas', { timeout: 25000 }); await wait(1200);
  let s = await save(); if (!s.started || s.startRegion !== 'lake' || !s.introSeen) throw new Error(`Actual UI campaign start/intro state unexpected: ${JSON.stringify(summary(s))}`);
  report.events.push({ type: 'single-campaign-start', region: s.startRegion, leo: s.leo }); await shot('02-lake-world-actor-terrain-controls.png'); await checkpoint('campaign-started-at-lake');
  const rulesSource = await readFile(`${root}/src/game/mission/activities/rules.ts`, 'utf8');
  const rulesCode = ts.transpileModule(rulesSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const rules = await import(`data:text/javascript;base64,${Buffer.from(rulesCode).toString('base64')}`);
  for (const region of regions) {
    enforceDeadline();
    const start = Date.now();
    try { s = await runRegion(region, rules); }
    catch (error) {
      report.outcome = 'PARTIAL/STOPPED'; report.error = String(error?.stack ?? error); report.stopRegion = region;
      // Preserve the live page/profile and exact existing save; never reset or seed. Bounded helper-only repair attempt, same phase/page.
      await checkpoint(`helper-error-${region}`, { error: report.error, helperRepairAttempts: 1 }).catch(() => undefined);
      if (/actual controls|save|unlock|activity|observation|report|route|rover|movement|rejected|did not|not found/i.test(report.error)) {
        report.events.push({ type: 'bounded-helper-repair-not-safe-to-repeat', region, note: 'No automatic phase replay because a UI action may already have committed. Same browser/page/save retained for human diagnosis.' });
      }
      throw error;
    }
    report.events.push({ type: 'region-stage-duration-ms', region, ms: Date.now() - start }); await checkpoint(`after-region-${region}`);
  }
  await checkpoint('before-endgame'); s = await readiness();
  report.endState = summary(s); report.errors = [...new Set(report.errors)]; report.sourceHashesAfter = await hashFence();
  report.sourceChanged = Object.keys(report.sourceHashesBefore).filter(p => report.sourceHashesBefore[p] !== report.sourceHashesAfter[p]);
  report.outcome = report.errors.length || report.sourceChanged.length ? 'PASS_WITH_REVIEW' : 'PASS';
  report.finishedAt = new Date().toISOString(); await persist();
}
try {
  await main();
} catch (error) {
  report.outcome = report.outcome === 'RUNNING' ? 'INCOMPLETE/FAIL' : report.outcome;
  report.error ??= String(error?.stack ?? error); report.errors.push(`campaign: ${String(error?.message ?? error)}`);
  if (page) { await shot('99-continuous-failure.png').catch(() => undefined); report.lastSave = summary(await save().catch(() => null)); }
} finally {
  report.finishedAt = new Date().toISOString(); report.sourceHashesAfter ??= await hashFence().catch(e => ({ error: String(e) }));
  report.sourceChanged ??= Object.keys(report.sourceHashesBefore ?? {}).filter(p => report.sourceHashesBefore?.[p] !== report.sourceHashesAfter?.[p]);
  await persist().catch(() => undefined);
  console.log(JSON.stringify({ outcome: report.outcome, stopRegion: report.stopRegion ?? null, error: report.error ?? null, lastSave: report.lastSave ?? report.endState ?? null, screenshots: report.screenshots, checkpoints: report.checkpoints.map(c => c.name), sourceChanged: report.sourceChanged }, null, 2));
  if (browser) await browser.close();
  if (report.outcome !== 'PASS') process.exitCode = 1;
}
