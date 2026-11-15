import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
const worldModule = { exports: {} };
new Function('require', 'module', 'exports', compile(read('src/modules/outpost-3d/worldRegions.ts')))(() => { throw new Error('Unexpected world import'); }, worldModule, worldModule.exports);
const { WORLD_REGIONS, getRegionByPosition, sampleWorldGround } = worldModule.exports;
const impactRegion = WORLD_REGIONS.find(({ id }) => id === 'impact');
const source = read('src/modules/story-engine/components/ImpactFieldTools.tsx');
const compiled = compile(source);
const element = (type, props, ...children) => ({ type, props: { ...props, children: children.length === 0 ? props?.children : children.length === 1 ? children[0] : children } });
const hookContext = { state: [], effects: [], cursor: 0 };
let activeContext;
let activityProps;
const React = {
  createElement: element,
  useState(initial) {
    const context = activeContext;
    const index = context.cursor++;
    if (!(index in context.state)) context.state[index] = typeof initial === 'function' ? initial() : initial;
    return [context.state[index], (value) => {
      context.state[index] = typeof value === 'function' ? value(context.state[index]) : value;
    }];
  },
  useEffect(effect, dependencies) {
    const context = activeContext;
    const index = context.cursor++;
    const previous = context.effects[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
      context.effects[index] = dependencies;
      context.pendingEffects.push(effect);
    }
  },
};
const activityPanel = (props) => {
  activityProps = props;
  return element('div', { 'data-testid': 'activity-panel' },
    element('button', { onClick: () => props.onProgress({ kind: 'impact', version: 1, matches: [...(props.progress.matches ?? []), { signal: 'signal-rim', context: 'frame-rim' }] }) }, 'Test legal proposal'),
    element('button', { onClick: () => props.onProgress({ kind: 'impact', version: 1, matches: [...(props.progress.matches ?? []), { signal: 'signal-rim', context: 'frame-rim' }, { signal: 'signal-basin', context: 'frame-slope' }] }) }, 'Test forged extra proposal'));
};
let state;
const store = (selector) => selector(state);
const localRequire = (id) => {
  if (id === 'react') return { __esModule: true, default: React, ...React };
  if (id === 'react/jsx-runtime') return { jsx: (type, props) => element(type, props), jsxs: (type, props) => element(type, props), Fragment: Symbol('Fragment') };
  if (id === '../../../game/mission/activities/ActivityPanel') return { ActivityPanel: activityPanel };
  if (id === '../../../game/mission/activities/rules') return { IMPACT_CONTEXTS: [
    { id: 'frame-rim' }, { id: 'frame-basin' }, { id: 'frame-slope' }
  ], IMPACT_SIGNALS: [{ id: 'signal-rim' }, { id: 'signal-basin' }, { id: 'signal-slope' }], recordImpactMatch: (progress, signal, context) => {
    const answers = { 'signal-rim': 'frame-rim', 'signal-basin': 'frame-basin', 'signal-slope': 'frame-slope' };
    if (answers[signal] !== context || progress.matches.some((match) => match.signal === signal || match.context === context)) return { accepted: false };
    return { accepted: true, progress: { ...progress, matches: [...progress.matches, { signal, context }] } };
  } };
  if (id === '../../store/expeditionProgress') return {
    BASE_CONSOLE_RADIUS: 8,
    BASE_GROUND_TOLERANCE: 0.25,
    IMPACT_OBSERVATION_GUIDE: {
      'rim-inspection': { accessibilityHint: 'At rim: capture wide and close.' },
      'dated-image-comparison': { accessibilityHint: 'At image site: inspect both, choose two changes.' },
      'sample-comparison': { accessibilityHint: 'At sample site: inspect both measurements.' },
    },
    IMPACT_OBSERVATION_IDS: ['rim-inspection', 'dated-image-comparison', 'sample-comparison'],
    IMPACT_SAMPLE_CONCLUSION: 'appearance-alone-cannot-determine-origin',
    IMPACT_TRAINING_NOTICE: 'TRAINING schematic data only; not NASA imagery, measurements, or scientific provenance.',
  };
  if (id === '../../store/useOutpostStore') return { useOutpostStore: store };
  if (id === '../../outpost-3d/worldRegions') return { WORLD_REGIONS, getRegionByPosition, sampleWorldGround };
  throw new Error(`Unexpected ImpactFieldTools import: ${id}`);
};
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const ImpactFieldTools = module.exports.ImpactFieldTools;

const progressState = () => ({
  enabled: true,
  revision: 4,
  bases: { impact: { active: true, stock: { energyEU: 12, meals: 4, water: 5, air: 4 } } },
  surveys: { impact: { observations: [], paid: false, activityProgress: null } },
});
const setup = (position = [0, -0.4, 0]) => {
  state = {
    expeditionProgress: progressState(), playerPos: position, isPlayerGrounded: true, isDrivingRover: false,
    observeCalls: [], payCalls: [], matchCalls: [],
    observeImpact: (id, evidence, revision) => {
      state.observeCalls.push({ id, evidence, revision });
      const observations = state.expeditionProgress.surveys.impact.observations;
      if (revision !== state.expeditionProgress.revision || !['rim-inspection', 'dated-image-comparison', 'sample-comparison'].includes(id) || observations.includes(id) || !evidence || typeof evidence !== 'object') return false;
      state.expeditionProgress.revision += 1;
      observations.push(id);
      return true;
    },
    payImpactSurvey: (confirmed, revision) => {
      state.payCalls.push({ confirmed, revision });
      const survey = state.expeditionProgress.surveys.impact;
      const stock = state.expeditionProgress.bases.impact.stock;
      if (!confirmed || revision !== state.expeditionProgress.revision || survey.paid || survey.observations.length < 2 || stock.energyEU < 2 || stock.meals < 1 || stock.water < 1 || stock.air < 1) return false;
      state.expeditionProgress.revision += 1;
      survey.paid = true;
      survey.activityProgress = { kind: 'impact', version: 1, matches: [] };
      state.expeditionProgress.bases.impact.stock = { energyEU: stock.energyEU - 2, meals: stock.meals - 1, water: stock.water - 1, air: stock.air - 1 };
      return true;
    },
    matchImpactRecords: (signal, context, revision) => {
      state.matchCalls.push({ signal, context, revision });
      const survey = state.expeditionProgress.surveys.impact;
      const matches = survey.activityProgress?.matches;
      const answers = { 'signal-rim': 'frame-rim', 'signal-basin': 'frame-basin', 'signal-slope': 'frame-slope' };
      if (revision !== state.expeditionProgress.revision || !survey.paid || !matches || answers[signal] !== context || matches.some((match) => match.signal === signal || match.context === context)) return false;
      state.expeditionProgress.revision += 1;
      matches.push({ signal, context });
      return true;
    },
    expeditionActionError: null,
  };
  hookContext.state = [];
  hookContext.effects = [];
  return render();
};
function render() {
  hookContext.cursor = 0;
  hookContext.pendingEffects = [];
  activeContext = hookContext;
  const rootNode = ImpactFieldTools();
  activeContext = undefined;
  for (const effect of hookContext.pendingEffects) effect();
  return expand(rootNode);
}
function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { ...node, props: { ...node.props, children: expand(node.props.children) } };
}
function all(node, predicate, output = []) {
  if (Array.isArray(node)) node.forEach((child) => all(child, predicate, output));
  else if (node && typeof node === 'object' && node.type) {
    if (predicate(node)) output.push(node);
    all(node.props.children, predicate, output);
  }
  return output;
}
function visibleText(value) {
  if (Array.isArray(value)) return value.map(visibleText).join('');
  if (value && typeof value === 'object' && 'type' in value) return visibleText(value.props?.children);
  return value == null ? '' : String(value);
}
function buttonWith(tree, text) {
  const button = all(tree, (node) => node.type === 'button' && visibleText(node.props.children).includes(text))[0];
  assert.ok(button, `missing button containing ${text}; found: ${all(tree, (node) => node.type === 'button').map((node) => String(node.props.children)).join(' | ')}`);
  return button;
}
function moveToDiscovery(index) {
  const site = impactRegion.discoveries[index];
  state.playerPos = [site.x, sampleWorldGround(site.x, site.z), site.z];
}

test('tools remain gated off-site; captures, explicit payment, and legal activity proposals use bridge actions', () => {
  let tree = setup();
  assert.match(all(tree, (node) => node.type === 'p' && node.props.role === 'status').map((node) => node.props.children).join(' '), /Visit Impact Basin/);
  assert.equal(all(tree, (node) => node.type === 'button').some((node) => /Capture|Submit|Confirm survey/.test(String(node.props.children))), false);
  assert.deepEqual(state.observeCalls, []);
  assert.deepEqual(state.payCalls, []);

  moveToDiscovery(0);
  tree = render();
  buttonWith(tree, 'Capture wide inspection').props.onClick();
  tree = render();
  buttonWith(tree, 'Close framing').props.onClick();
  tree = render();
  buttonWith(tree, 'Capture close inspection').props.onClick();
  tree = render();
  buttonWith(tree, 'Submit rim inspection').props.onClick();
  assert.equal(state.observeCalls[0].id, 'rim-inspection');
  assert.equal(state.observeCalls[0].revision, 4);
  assert.notEqual(state.observeCalls[0].evidence.wide.frameId, state.observeCalls[0].evidence.close.frameId);

  moveToDiscovery(1);
  tree = render();
  buttonWith(tree, 'Inspect before frame').props.onClick();
  tree = render();
  buttonWith(tree, 'Inspect after frame').props.onClick();
  tree = render();
  const checkboxLabels = all(tree, (node) => node.type === 'label' && all(node, (child) => child.type === 'input').length > 0);
  const choose = (text) => {
    const label = checkboxLabels.find((node) => JSON.stringify(node.props.children).includes(text));
    assert.ok(label, `missing feature choice ${text}`);
    const input = all(label, (node) => node.type === 'input')[0];
    input.props.onChange({ target: { checked: true } });
    tree = render();
  };
  choose('Rim edge shape');
  choose('New surface mark');
  buttonWith(tree, 'Submit image comparison').props.onClick();
  assert.equal(state.observeCalls[1].id, 'dated-image-comparison');
  assert.deepEqual(state.observeCalls[1].evidence.changedFeatures, ['rim-edge', 'surface-mark']);

  state.playerPos = [impactRegion.baseConsole.x, sampleWorldGround(impactRegion.baseConsole.x, impactRegion.baseConsole.z), impactRegion.baseConsole.z];
  tree = render();
  assert.match(all(tree, (node) => node.type === 'p').map((node) => String(node.props.children)).join(' '), /One-time package cost: 2 EU, 1 meal, 1 water, 1 air/);
  const confirm = all(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')[0];
  confirm.props.onChange({ target: { checked: true } });
  tree = render();
  buttonWith(tree, 'Confirm survey package').props.onClick();
  assert.deepEqual(state.payCalls, [{ confirmed: true, revision: 6 }]);
  assert.deepEqual(state.expeditionProgress.bases.impact.stock, { energyEU: 10, meals: 3, water: 4, air: 3 });
  tree = render();
  assert.ok(activityProps, 'paid survey mounts the original activity panel');
  buttonWith(tree, 'Test forged extra proposal').props.onClick();
  assert.equal(state.matchCalls.length, 0, 'UI rejects non-single-step activity mutation');
  buttonWith(tree, 'Test legal proposal').props.onClick();
  assert.deepEqual(state.matchCalls, [{ signal: 'signal-rim', context: 'frame-rim', revision: 7 }]);
});

test('rejected rim observation shows retry feedback and preserves survey progress', () => {
  let tree = setup();
  moveToDiscovery(0);
  tree = render();
  buttonWith(tree, 'Capture wide inspection').props.onClick();
  tree = render();
  buttonWith(tree, 'Close framing').props.onClick();
  tree = render();
  buttonWith(tree, 'Capture close inspection').props.onClick();
  tree = render();

  state.observeImpact = (id, evidence, revision) => {
    state.observeCalls.push({ id, evidence, revision });
    state.expeditionActionError = 'stale-revision';
    return false;
  };
  tree = render();
  buttonWith(tree, 'Submit rim inspection').props.onClick();
  tree = render();

  const text = all(tree, (node) => node.type === 'p').map((node) => String(node.props.children)).join(' ');
  assert.match(text, /Record was not saved/);
  assert.match(text, /retry/);
  assert.doesNotMatch(text, /submitted to expedition record/);
  assert.equal(state.expeditionActionError, 'stale-revision');
  assert.equal(state.observeCalls.length, 1);
  assert.equal(state.observeCalls[0].id, 'rim-inspection');
  assert.notEqual(state.observeCalls[0].evidence.wide.frameId, state.observeCalls[0].evidence.close.frameId);
  assert.deepEqual(state.expeditionProgress.surveys.impact.observations, []);
  assert.equal(state.expeditionProgress.surveys.impact.activityProgress, null);
  assert.deepEqual(state.payCalls, []);
});

test('rejected survey payment preserves stock and shows no success feedback', () => {
  let tree = setup();
  state.expeditionProgress.revision = 6;
  state.expeditionProgress.surveys.impact.observations = ['rim-inspection', 'dated-image-comparison'];
  const console = impactRegion.baseConsole;
  state.playerPos = [console.x, sampleWorldGround(console.x, console.z), console.z];
  tree = render();
  const confirm = all(tree, (node) => node.type === 'input' && node.props.type === 'checkbox')[0];
  confirm.props.onChange({ target: { checked: true } });
  tree = render();

  const originalStock = { ...state.expeditionProgress.bases.impact.stock };
  state.payImpactSurvey = (confirmed, revision) => {
    state.payCalls.push({ confirmed, revision });
    state.expeditionActionError = 'stale-revision';
    return false;
  };
  tree = render();
  buttonWith(tree, 'Confirm survey package').props.onClick();
  tree = render();

  const text = all(tree, (node) => node.type === 'p').map((node) => String(node.props.children)).join(' ');
  assert.match(text, /Package was not paid/);
  assert.doesNotMatch(text, /Survey package paid once/);
  assert.equal(state.expeditionActionError, 'stale-revision');
  assert.deepEqual(state.payCalls, [{ confirmed: true, revision: 6 }]);
  assert.equal(state.expeditionProgress.surveys.impact.paid, false);
  assert.deepEqual(state.expeditionProgress.bases.impact.stock, originalStock);
});
