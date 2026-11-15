import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ActivityPanel } from '../../../game/mission/activities/ActivityPanel';
import { IMPACT_CONTEXTS, IMPACT_SIGNALS, recordImpactMatch, type ImpactProgress } from '../../../game/mission/activities/rules';
import {
  BASE_CONSOLE_RADIUS,
  BASE_GROUND_TOLERANCE,
  IMPACT_OBSERVATION_GUIDE,
  IMPACT_OBSERVATION_IDS,
  IMPACT_SAMPLE_CONCLUSION,
  IMPACT_TRAINING_NOTICE,
  type ImpactChangedFeature,
  type ImpactObservationId,
  type ImpactToolEvidence,
} from '../../store/expeditionProgress';
import { useOutpostStore } from '../../store/useOutpostStore';
import { getRegionByPosition, sampleWorldGround, WORLD_REGIONS } from '../../outpost-3d/worldRegions';

const impactRegion = WORLD_REGIONS.find((region) => region.id === 'impact')!;
const IMPACT_FIELD_RADIUS = BASE_CONSOLE_RADIUS;
const trainingNotice: CSSProperties = { border: '1px solid #d38a55', background: '#35271f', color: '#ffe0c2', padding: 14, fontSize: 16, lineHeight: 1.5 };
const panel: CSSProperties = { border: '1px solid #58616c', background: '#1c2026', padding: 16, minWidth: 0 };
const heading: CSSProperties = { margin: '0 0 8px', fontSize: 20, lineHeight: 1.25, color: '#fff' };
const body: CSSProperties = { margin: '8px 0', color: '#e0e4e6', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 15, lineHeight: 1.5 };
const button: CSSProperties = { minHeight: 48, padding: '10px 14px', border: '1px solid #a7b0b8', borderRadius: 4, background: '#303941', color: '#fff', font: 'inherit', fontSize: 15, fontWeight: 650, cursor: 'pointer' };
const selectedButton: CSSProperties = { ...button, borderColor: '#f1b277', background: '#4a3027', color: '#ffe1d4' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 14 };
const features: readonly { id: ImpactChangedFeature; label: string }[] = [
  { id: 'rim-edge', label: 'Rim edge shape' },
  { id: 'rock-position', label: 'Rock position' },
  { id: 'shadow-boundary', label: 'Shadow boundary' },
  { id: 'surface-mark', label: 'New surface mark' },
];
const emptyCapture = () => ({ rimWide: false, rimClose: false, before: false, after: false, candidate: false, reference: false });

function TerrainDiagram({ framing }: { framing: 'wide' | 'close' }) {
  return <svg viewBox="0 0 360 150" role="img" aria-label={`Original training schematic, ${framing} rim framing; not a NASA image`} style={{ display: 'block', width: '100%', minHeight: 126, background: '#171d22', border: '1px solid #68717a' }}>
    <path d="M14 122H346M40 20V124M105 20V124M170 20V124M235 20V124M300 20V124" stroke="#39434a" strokeWidth="1" />
    {framing === 'wide' ? <>
      <path d="M18 104 Q68 97 100 74 Q139 48 172 71 Q202 91 230 58 Q264 18 299 54 Q324 79 345 91" fill="none" stroke="#d79b75" strokeWidth="5" />
      <path d="M70 104 Q102 113 127 102M234 99l14-8 9 10" fill="none" stroke="#b97b59" strokeWidth="2" />
      <text x="20" y="142" fill="#e0e4e6" fontSize="12">WIDE · RIM AND EJECTA FIELD</text>
    </> : <>
      <path d="M20 108 Q65 98 108 77 Q153 55 194 42 Q240 26 340 23" fill="none" stroke="#e0a27d" strokeWidth="7" />
      <path d="M119 93l15-5 8 8M182 67l11-7 10 8M239 42l12-4 8 6" fill="none" stroke="#b97b59" strokeWidth="3" />
      <text x="20" y="142" fill="#e0e4e6" fontSize="12">CLOSE · RIM EDGE DETAIL</text>
    </>}
  </svg>;
}

function ComparisonDiagram({ frame }: { frame: 'before' | 'after' }) {
  const after = frame === 'after';
  return <svg viewBox="0 0 300 130" role="img" aria-label={`Original ${frame} training schematic; not a NASA image`} style={{ display: 'block', width: '100%', minHeight: 118, background: '#171d22', border: '1px solid #68717a' }}>
    <path d="M12 108H288M40 15V110M100 15V110M160 15V110M220 15V110M280 15V110" stroke="#39434a" strokeWidth="1" />
    <path d={after ? 'M15 86 Q69 81 100 54 Q140 21 177 58 Q219 98 286 68' : 'M15 86 Q69 81 104 54 Q144 21 181 58 Q223 98 286 68'} fill="none" stroke="#d79b75" strokeWidth="5" />
    <path d="M64 99l12-7 9 8M206 37l12-5 10 8" fill="none" stroke="#b97b59" strokeWidth="2" />
    {after && <path d="M133 76l10-9 12 8" fill="none" stroke="#74d8e8" strokeWidth="3" />}
    <circle cx={after ? 245 : 245} cy="93" r="5" fill="#d9d3c7" />
    <text x="14" y="124" fill="#e0e4e6" fontSize="11">{after ? 'AFTER · RIM EDGE + SURFACE MARK' : 'BEFORE · TRAINING FRAME'}</text>
  </svg>;
}

function SampleDiagram() {
  return <svg viewBox="0 0 340 110" role="img" aria-label="Original training sample comparison schematic; appearance is not evidence of origin" style={{ display: 'block', width: '100%', minHeight: 110, background: '#171d22', border: '1px solid #68717a' }}>
    <path d="M20 88H320" stroke="#59646b" strokeWidth="2" />
    <path d="M45 74l18-38 32-11 31 16 8 33-33 13-39-4z" fill="#9f725c" stroke="#dba27d" strokeWidth="2" />
    <path d="M200 74l15-29 26-8 23 12 9 24-27 11-33-3z" fill="#81746a" stroke="#c9a58e" strokeWidth="2" />
    <text x="47" y="101" fill="#e0e4e6" fontSize="12">CANDIDATE SAMPLE</text>
    <text x="201" y="101" fill="#e0e4e6" fontSize="12">LOCAL REFERENCE</text>
  </svg>;
}

export function ImpactFieldTools() {
  const observeImpact = useOutpostStore((state) => state.observeImpact);
  const payImpactSurvey = useOutpostStore((state) => state.payImpactSurvey);
  const matchImpactRecords = useOutpostStore((state) => state.matchImpactRecords);
  const expeditionActionError = useOutpostStore((state) => state.expeditionActionError);
  const expedition = useOutpostStore((state) => state.expeditionProgress);
  const playerPos = useOutpostStore((state) => state.playerPos);
  const grounded = useOutpostStore((state) => state.isPlayerGrounded);
  const driving = useOutpostStore((state) => state.isDrivingRover);
  const bridgeReady = typeof observeImpact === 'function' && typeof payImpactSurvey === 'function' && typeof matchImpactRecords === 'function';
  const [framing, setFraming] = useState<'wide' | 'close'>('wide');
  const [captured, setCaptured] = useState(emptyCapture);
  const [selectedFeatures, setSelectedFeatures] = useState<ImpactChangedFeature[]>([]);
  const [comparisonViewed, setComparisonViewed] = useState({ before: false, after: false });
  const [sampleViewed, setSampleViewed] = useState({ candidate: false, reference: false });
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [x, y, z] = playerPos;
  const currentRegion = getRegionByPosition(x, z);
  const onFootOnGround = grounded && !driving && Math.abs(y - sampleWorldGround(x, z)) <= BASE_GROUND_TOLERANCE;
  const siteDistances = impactRegion.discoveries.map((site) => Math.hypot(x - site.x, z - site.z));
  const siteIndex = siteDistances.findIndex((distance) => distance <= IMPACT_FIELD_RADIUS);
  const siteNearby = currentRegion.id === 'impact' && onFootOnGround && siteIndex >= 0 && expedition.enabled && expedition.bases.impact.active;
  const consoleDistance = Math.hypot(x - impactRegion.baseConsole.x, z - impactRegion.baseConsole.z);
  const atConsole = currentRegion.id === 'impact' && onFootOnGround && consoleDistance <= BASE_CONSOLE_RADIUS && expedition.enabled && expedition.bases.impact.active;
  const impactSurvey = expedition.surveys.impact;
  const observations = impactSurvey.observations;
  const surveyProgress = impactSurvey.activityProgress;

  useEffect(() => {
    setCaptured(emptyCapture());
    setSelectedFeatures([]);
    setComparisonViewed({ before: false, after: false });
    setSampleViewed({ candidate: false, reference: false });
    setFeedback('');
  }, [siteNearby, siteIndex]);

  const recordObservation = (observationId: ImpactObservationId, evidence: ImpactToolEvidence) => {
    if (!siteNearby || observations.includes(observationId)) return;
    if (!recordActionsReady || !observeImpact) {
      setFeedback('Field record actions are connecting. Try again when the expedition ledger is ready.');
      return;
    }
    const recorded = observeImpact(observationId, evidence, expedition.revision);
    setFeedback(recorded
      ? `${IMPACT_OBSERVATION_GUIDE[observationId].title} submitted to the expedition record.`
      : 'Record was not saved. Check the field action message and retry from the site.');
  };

  const rimReady = captured.rimWide && captured.rimClose;
  const comparisonCorrect = selectedFeatures.length === 2 && selectedFeatures.includes('rim-edge') && selectedFeatures.includes('surface-mark');
  const comparisonReady = comparisonViewed.before && comparisonViewed.after && comparisonCorrect;
  const sampleReady = sampleViewed.candidate && sampleViewed.reference;
  const knownObservationCount = IMPACT_OBSERVATION_IDS.filter((id) => observations.includes(id)).length;
  const needsSite = !expedition.enabled || !expedition.bases.impact.active || !siteNearby;
  const recordActionsReady = expedition.enabled && bridgeReady;

  const handleActivityProposal = (proposal: unknown) => {
    if (!atConsole || !impactSurvey.paid || !recordActionsReady || !matchImpactRecords) return;
    const current = surveyProgress as ImpactProgress | null;
    if (!current || !proposal || typeof proposal !== 'object' || !('matches' in proposal) || !Array.isArray(proposal.matches)) return;
    if (proposal.matches.length !== current.matches.length + 1) return;
    for (const signal of IMPACT_SIGNALS) {
      for (const context of IMPACT_CONTEXTS) {
        const candidate = recordImpactMatch(current, signal.id, context.id);
        if (candidate.accepted && JSON.stringify(candidate.progress) === JSON.stringify(proposal)) {
          const recorded = matchImpactRecords(signal.id, context.id, expedition.revision);
          setFeedback(recorded ? 'One legal signal and image-context pair was forwarded to the expedition record.' : 'Pair was not saved. Check the field action message and retry.');
          return;
        }
      }
    }
  };

  return <div data-testid="impact-field-tools" style={{ flex: 1, overflowY: 'auto', padding: '4px 2px 18px', color: '#f4f1ea', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, lineHeight: 1.5 }}>
    <h3 style={{ margin: '0 0 12px', fontSize: 22, lineHeight: 1.2 }}>Impact Basin field tools</h3>
    <p role="note" style={trainingNotice}>{IMPACT_TRAINING_NOTICE} These authored diagrams are learning aids, not field imagery.</p>
    <p style={body}>Three local discoveries pair visual inspection with a persistent record. Tools require a grounded, on-foot visit within 8 m of the matching Impact Basin site; no remote capture is available.</p>
    <ul aria-label="Impact discovery sites and accessibility hints" style={{ ...body, paddingLeft: 24 }}>
      {impactRegion.discoveries.map((site, index) => <li key={index} style={{ marginBottom: 8 }}><span>Site {index + 1} · ({site.x}, {site.z}) · {siteDistances[index].toFixed(1)} m away{siteDistances[index] <= 8 ? ' · in range' : ''}</span><span style={{ display: 'block' }}>{IMPACT_OBSERVATION_GUIDE[IMPACT_OBSERVATION_IDS[index]].accessibilityHint}</span></li>)}
    </ul>
    {needsSite && <p role="status" style={body}>Visit Impact Basin and activate its station; walk to the matching discovery site shown above, then work on foot while grounded.</p>}
    {siteNearby && <>
      {siteIndex === 0 && <section aria-labelledby="rim-heading" style={{ ...panel, marginTop: 14 }}>
        <h4 id="rim-heading" style={heading}>Rim inspection camera</h4>
        <p style={body}>Switch between two framings and capture each visible training frame separately.</p>
        <div role="group" aria-label="Rim camera framing" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
          <button type="button" style={framing === 'wide' ? selectedButton : button} aria-pressed={framing === 'wide'} onClick={() => setFraming('wide')}>Wide framing</button>
          <button type="button" style={framing === 'close' ? selectedButton : button} aria-pressed={framing === 'close'} onClick={() => setFraming('close')}>Close framing</button>
        </div>
        <TerrainDiagram framing={framing} />
        <button type="button" style={{ ...button, marginTop: 10 }} disabled={observations.includes('rim-inspection')} onClick={() => {
          setCaptured((value) => ({ ...value, [framing === 'wide' ? 'rimWide' : 'rimClose']: true }));
          setFeedback(`${framing === 'wide' ? 'Wide' : 'Close'} frame captured for this visit.`);
        }}>Capture {framing} inspection</button>
        <p style={body}>Captured this visit: wide {captured.rimWide ? '✓' : '—'} · close {captured.rimClose ? '✓' : '—'}</p>
        <button type="button" style={button} disabled={!rimReady || observations.includes('rim-inspection')} onClick={() => recordObservation('rim-inspection', { tool: 'inspection-camera', wide: { action: 'inspect-frame', framing: 'wide', target: 'rim', frameId: 'impact-rim-wide-training-v1' }, close: { action: 'inspect-frame', framing: 'close', target: 'rim', frameId: 'impact-rim-close-training-v1' } })}>{observations.includes('rim-inspection') ? 'Rim inspection recorded' : 'Submit rim inspection'}</button>
      </section>}
      {siteIndex === 1 && <section aria-labelledby="comparison-heading" style={{ ...panel, marginTop: 14 }}>
        <h4 id="comparison-heading" style={heading}>Dated image comparison</h4>
        <p style={body}>Inspect both frames. Two changed features are encoded in these training schematics; rock position and shadow boundary are distractors.</p>
        <div style={grid}>
          {(['before', 'after'] as const).map((frame) => <div key={frame}>
            <h5 style={{ ...heading, fontSize: 17 }}>{frame === 'before' ? 'Before frame' : 'After frame'}</h5>
            <ComparisonDiagram frame={frame} />
            <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => { setComparisonViewed((value) => ({ ...value, [frame]: true })); setFeedback(`${frame === 'before' ? 'Before' : 'After'} frame inspected.`); }}>{comparisonViewed[frame] ? `${frame} inspected` : `Inspect ${frame} frame`}</button>
          </div>)}
        </div>
        <fieldset style={{ ...body, border: '1px solid #58616c', padding: 12 }}>
          <legend>Choose exactly two changes visible in the training frames</legend>
          {features.map((feature) => <label key={feature.id} style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 42 }}><input type="checkbox" checked={selectedFeatures.includes(feature.id)} disabled={!comparisonViewed.before || !comparisonViewed.after || (!selectedFeatures.includes(feature.id) && selectedFeatures.length >= 2)} onChange={(event) => setSelectedFeatures((value) => event.target.checked ? [...value, feature.id] : value.filter((id) => id !== feature.id))} />{feature.label}</label>)}
        </fieldset>
        {selectedFeatures.length === 2 && !comparisonCorrect && <p role="status" style={{ ...body, color: '#ffd09c' }}>Compare again; the two changed features are not lost.</p>}
        <button type="button" style={button} disabled={!comparisonReady || observations.includes('dated-image-comparison')} onClick={() => recordObservation('dated-image-comparison', { tool: 'dated-image-comparison', before: { frame: 'before', frameId: 'impact-before-training-v1' }, after: { frame: 'after', frameId: 'impact-after-training-v1' }, changedFeatures: ['rim-edge', 'surface-mark'] })}>{observations.includes('dated-image-comparison') ? 'Image comparison recorded' : 'Submit image comparison'}</button>
      </section>}
      {siteIndex === 2 && <section aria-labelledby="sample-heading" style={{ ...panel, marginTop: 14 }}>
        <h4 id="sample-heading" style={heading}>Candidate and reference sample</h4>
        <p style={body}>Inspect the two authored training samples. Values are shown after the corresponding inspect action.</p>
        <SampleDiagram />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <button type="button" style={button} onClick={() => { setSampleViewed((value) => ({ ...value, candidate: true })); setFeedback('Candidate measurement recorded: 1.6 relative signal units.'); }}>Inspect candidate</button>
          <button type="button" style={button} onClick={() => { setSampleViewed((value) => ({ ...value, reference: true })); setFeedback('Local reference measurement recorded: 1.2 relative signal units.'); }}>Inspect local reference</button>
        </div>
        {(sampleViewed.candidate || sampleViewed.reference) && <p style={body}>Candidate: {sampleViewed.candidate ? '1.6' : 'not inspected'} · Reference: {sampleViewed.reference ? '1.2' : 'not inspected'} relative signal units.</p>}
        <p style={body}>An appearance difference is not enough to establish a sample’s origin.</p>
        <button type="button" style={button} disabled={!sampleReady || observations.includes('sample-comparison')} onClick={() => recordObservation('sample-comparison', { tool: 'sample-comparison', candidate: { measurement: 1.6, unit: 'relative signal units' }, reference: { measurement: 1.2, unit: 'relative signal units' }, conclusion: IMPACT_SAMPLE_CONCLUSION })}>{observations.includes('sample-comparison') ? 'Sample comparison recorded' : 'Record measurements and conclusion'}</button>
      </section>}
    </>}
    <p style={body} aria-live="polite">{feedback}</p>
    {knownObservationCount >= 2 && <section aria-labelledby="console-heading" style={{ ...panel, marginTop: 16 }}>
      <h4 id="console-heading" style={heading}>Impact base console</h4>
      {!atConsole && <p style={body}>Return to the Impact base console and stand within 8 m, grounded and on foot, to review the survey ledger.</p>}
      {atConsole && <>
        <p style={body}>{knownObservationCount} of 3 tool observations are recorded.</p>
        {impactSurvey.paid ? <p style={body}>Survey package paid once. Impact stock now: {expedition.bases.impact.stock.energyEU} EU · {expedition.bases.impact.stock.meals} meals · {expedition.bases.impact.stock.water} water · {expedition.bases.impact.stock.air} air.</p> : <>
          <p style={body}>One-time package cost: 2 EU, 1 meal, 1 water, 1 air. Current stock: {expedition.bases.impact.stock.energyEU} EU · {expedition.bases.impact.stock.meals} meals · {expedition.bases.impact.stock.water} water · {expedition.bases.impact.stock.air} air.</p>
          <label style={{ ...body, display: 'flex', alignItems: 'flex-start', gap: 10 }}><input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} />I confirm the one-time survey package cost of 2 EU, 1 meal, 1 water, and 1 air.</label>
          <button type="button" style={button} disabled={!paymentConfirmed || !recordActionsReady || observations.length < 2} onClick={() => {
            if (!paymentConfirmed || !payImpactSurvey) return;
            const paid = payImpactSurvey(true, expedition.revision);
            setPaymentConfirmed(false);
            setFeedback(paid ? 'Survey package paid once; saved Impact stock is shown below.' : 'Package was not paid. Check the field action message before retrying.');
          }}>Confirm survey package</button>
        </>}
        {impactSurvey.paid && <ActivityPanel region="impact" progress={surveyProgress} assisted={false} onProgress={handleActivityProposal} onComplete={() => { /* Domain derives completion from the saved three-pair activity progress. */ }} />}
      </>}
    </section>}
    <p style={{ ...body, marginTop: 18, fontSize: 14 }}>Background reading: <a href="https://science.nasa.gov/solar-system/asteroids/" target="_blank" rel="noreferrer" style={{ color: '#8edce8', textDecoration: 'underline', textUnderlineOffset: 3 }}>NASA Solar System — Asteroids</a>. Illustrations above are authored training schematics, not NASA images.</p>
    {!recordActionsReady && <p role="status" style={body}>Expedition record actions are unavailable until the campaign is started.</p>}
    {expeditionActionError && <p role="alert" style={{ ...body, color: '#ffd09c' }}>{expeditionActionError}</p>}
  </div>;
}

export default ImpactFieldTools;
