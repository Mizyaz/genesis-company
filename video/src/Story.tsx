import { createContext, useContext } from 'react';
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { C, B } from './Brand';
import { pixelSamples, stepper, type Optimize, type SParams } from './story/Analysis';
import { type BlockLinks } from '../../src/shared/story/BlockView';
import { type CoilSample } from './story/CoilLab';
import { coilGlyphs } from '../../src/shared/story/coil';
import { LitEmblem, Sunrise } from './story/Landing';
import { type Objective } from './story/Objective';
import { posed, Robot, ROBOT, ROBOT_SIZE, type Pose } from './story/Robot';
import { type Drawing } from '../../src/shared/story/Schematic';
import { ease, out, TRANSITION as DESIGN_TRANSITION } from '../../src/shared/story/motion';
import { FPS } from './storyboard';
import film from '../../src/content/film.json';
// The conversation and the schematic as the site shows them (scripts/export-story-data.mjs): the schematic exported from
// the shown layout's record, the conversation with no technology names.
import ask from '../../src/content/story/ask.json';
import flow from '../../src/content/story/flow.json';
const drawing = flow.schematic as Drawing;
import { BlocksView, CAPTIONS, CaptionBand, LayoutView, PANEL, SCENE_FRAMES, SchematicView } from '../../src/shared/story/scenes';
import { BLOCK_COLOURS } from '../../src/shared/story/colours';
import { AnyView, Chip3DView, VALIDATION_CAPTIONS, VALIDATION_FRAMES, ValidationView } from '../../src/shared/story/scenes-validation';
import { AskView, askCaptions, ASK_FRAMES, Bubble, PICKED } from '../../src/shared/story/scenes-ask';
import { DEMO_CAPTIONS, DEMO_FRAMES, DemoView, EndView, END_FRAMES, Signature } from '../../src/shared/story/scenes-end';
import { ANALYSIS_CAPTIONS, SpecView, TestbenchView } from '../../src/shared/story/scenes-analysis';
import { OPT, optimizeCaptions, OptimizeView } from '../../src/shared/story/scenes-optimize';

// The 2D story film: an illustration of the GENESIS flow drawn from records. The conversation and the four schematics
// come from recorded takes, the testbenches and the signoff from the chip's config and verify record, and the layout
// from the chip's GDS as the 3D viewer reads it (story/collect.mjs and story/layout_layers.mjs write the inputs).
export type StoryData = {
  prompt: string;
  conversation: { message: string; choices: string[]; answer: { card?: string; text?: string } | null }[];
  schematics: Drawing[];
  testbenches: { name: string; cell: string; modes: string[]; ports: number; states: string[] }[];
  outputs: string[];
  signoff: { status: string; drc: boolean; lvs: boolean; gds_sha256: string; cell?: string; drc_violations?: number; drc_rule_checks?: number; drc_not_executed?: number; lvs_status?: string };
};
export type LayoutData = {
  die: [number, number, number, number]; width: number; height: number; files: Record<string, { file: string; boxes: number }>;
  stages: string[]; layers: { name: string; color: string; z_um: number }[];
  blocks: { name: string; box: [number, number, number, number] }[];
  members: { block: string; member: string; cell: string; box: [number, number, number, number] }[];
  /** The chip's own coil shapes, by member, as drawn in its GDS. */
  shapes?: Record<string, Pick<CoilSample, 'layers' | 'bbox'>>;
  /** The ground tiles as the GDS places them (story/gnd_tiles.py): each tile's box in microns and its master. */
  tiles?: { box: [number, number, number, number]; master: string }[];
};
/** A further circuit's clean layout (story/circuit_layouts.mjs): its drawn layers and its signoff records. */
export type CircuitLayout = Pick<LayoutData, 'die' | 'width' | 'height' | 'files' | 'blocks'> & {
  id: string; signoff: { status: string; drc_violations: number; drc_rule_checks: number; lvs: string; density_markers: number; gds_sha256: string };
};
/** Coil candidates GC drew for the film at one scale (story/coil_frames.mjs); spirals first, then pixel grids. */
export type CoilFrames = { px_per_um: number; frames: { id: string; family: string; layers: string[]; extent_um: [number, number]; px: [number, number]; file: string; ports_px?: { in: [number, number]; out: [number, number] } }[] };
/** The best designs of the chip coil's own search (story/coil_candidates.py), drawn beside the chosen coil. */
export type CoilCandidates = { candidates: (Pick<CoilSample, 'layers' | 'bbox'> & { run: string })[] };
export type StoryProps = { alt?: boolean; theme?: 'dark' | 'light'; story: StoryData | null; layout: LayoutData | null; links: BlockLinks | null; sparams: SParams | null; optimize: Optimize | null; circuits: { circuits: CircuitLayout[] } | null; coilFrames: CoilFrames | null; objective: Objective | null; candidates: CoilCandidates | null };

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const TRANSITION = DESIGN_TRANSITION;

/** Scenes in order, in seconds. The alternative film (alt) ends on the robot, a longer last scene. */
const SCENES = [
  ['ask', ASK_FRAMES / FPS], ['schematic', SCENE_FRAMES.schematic / FPS], ['blocks', SCENE_FRAMES.blocks / FPS], ['testbench', 7.4], ['spec', 8.5], ['optimize', OPT.length / FPS], ['layout', SCENE_FRAMES.layout / FPS], ['signoff', VALIDATION_FRAMES.validation / FPS], ['chip3d', VALIDATION_FRAMES.chip3d / FPS], ['any', VALIDATION_FRAMES.any / FPS], ['demo', DEMO_FRAMES / FPS], ['end', END_FRAMES / FPS],
] as const;
const scenesOf = (alt?: boolean) => SCENES.map(([id, s]) => [id, id === 'end' && alt ? 12 : s] as const);
// Scenes that cut in, no fade: those that go on from the last one's picture (the proposed schematic, its components,
// the blocks, the testbench's plots, the specification's block view and score, the optimized block view).
const CUT_IN = new Set<string>(['schematic', 'blocks', 'testbench', 'spec', 'optimize', 'layout']);
const SceneId = createContext('');
export const storyFrames = (alt?: boolean) => scenesOf(alt).reduce((n, [, s]) => n + Math.round(s * FPS), 0) - TRANSITION * SCENES.slice(1).filter(([id]) => !CUT_IN.has(id)).length;

export const storyMetadata: CalculateMetadataFunction<StoryProps> = async ({ props }) => {
  const [story, layout, links, sparams, optimize, circuits, coilFrames, objective, candidates] = await Promise.all(['story.json', 'layout.json', 'blocks.json', 'sparams.json', 'optimize.json', 'circuit_layouts.json', 'coil_frames.json', 'objective.json', 'coil_candidates.json'].map(async f => (await fetch(staticFile(f))).json()));
  // The ground tiles are optional: an inputs folder without gnd_tiles.json shows the tiling layer as drawn.
  const tiles = await fetch(staticFile('gnd_tiles.json')).then(r => r.ok ? r.json() : null, () => null);
  return { durationInFrames: storyFrames(props.alt), props: { ...props, story, layout: tiles ? { ...layout, tiles: tiles.tiles } : layout, links, sparams, optimize, circuits, coilFrames, objective, candidates } };
};

/** The caption band (CaptionBand) on the scene's frames: it fades in on a scene that fades in, and out before a scene
 * that fades in after it. */
function Band({ chapter, captions }: { chapter: string; captions: [number, string][] }) {
  const frame = useCurrentFrame(), { durationInFrames } = useVideoConfig(), id = useContext(SceneId);
  const enter = CUT_IN.has(id) ? 1 : out(frame, TRANSITION / 2, TRANSITION + 4), next = SCENES[SCENES.findIndex(([s]) => s === id) + 1]?.[0];
  const leave = !next || CUT_IN.has(next) ? 1 : 1 - interpolate(frame, [durationInFrames - TRANSITION, durationInFrames - TRANSITION / 2], [0, 1], clamp);
  return <CaptionBand chapter={chapter} captions={captions} frame={frame} k={enter * leave} shade={CUT_IN.has(id) ? 1 : out(frame, 4, 16)} />;
}

function Ask({ story }: { story: StoryData }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <AskView frame={useCurrentFrame()} story={{ ...story, ...ask } as StoryData} drawing={drawing} />
    <Band {...askCaptions(story)} />
  </AbsoluteFill>;
}

function blockColours(drawing: Drawing) {
  const byLabel = new Map<string, string>();
  Object.values(drawing.colouring).forEach((g, i) => g.members.forEach(m => byLabel.set(m, BLOCK_COLOURS[i % BLOCK_COLOURS.length])));
  return byLabel;
}


/** The proposed schematic on the right, now on the PDK, and its components by kind on the left: as each kind is listed
 * its parts take their block's colour, so the schematic is grouped by the time the list ends. */
function SchematicScene({ story, layout }: { story: StoryData; layout: LayoutData }) {
  const frame = useCurrentFrame();
  const proposal = ask.conversation[ask.conversation.length - 1].message, chosen = ask.conversation.find(t => t.answer?.card)?.answer?.card, hand = 1 - out(frame, 0, 12);
  return <AbsoluteFill style={{ background: C.page }}>
    <SchematicView frame={frame} drawing={drawing} layout={layout}
      inPanel={chosen && <div style={{ position: 'absolute', left: 22, top: 18, opacity: hand, padding: '8px 18px', borderRadius: 999, background: PICKED, border: `2px solid ${B.brand1}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{chosen}</div>}
      aside={hand > 0 && <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 40, width: PANEL.width, display: 'flex', opacity: hand }}>
        <Bubble who="genesis" k={1}><span style={{ fontSize: 30 }}>{proposal}</span></Bubble>
      </div>} />
    <Band {...CAPTIONS.schematic} />
  </AbsoluteFill>;
}

/** The schematic's block groups, then the chip's blocks as one symbolic floorplan: a hierarchy of blocks and members on
 * the left, glyph cards with the pads at their places on the die, joined by the RF lines and the DC nets. */
function BlocksScene({ story, layout, links }: { story: StoryData; layout: LayoutData; links: BlockLinks }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <BlocksView frame={useCurrentFrame()} drawing={drawing} layout={layout} links={links} />
    <Band {...CAPTIONS.blocks} />
  </AbsoluteFill>;
}

/** The testbench (TestbenchView): the shared view with the film's captions. */
function TestbenchScene({ story, layout, links, sparams }: { story: StoryData; layout: LayoutData; links: BlockLinks; sparams: SParams }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <TestbenchView frame={useCurrentFrame()} testbenches={story.testbenches} layout={layout} links={links} sparams={sparams} />
    <Band {...ANALYSIS_CAPTIONS.testbench} />
  </AbsoluteFill>;
}

/** From the testbench's curves to the specification (SpecView), with the film's captions. */
function SpecScene({ layout, links, sparams, objective }: { layout: LayoutData; links: BlockLinks; sparams: SParams; objective: Objective }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <SpecView frame={useCurrentFrame()} layout={layout} links={links} sparams={sparams} objective={objective} />
    <Band {...ANALYSIS_CAPTIONS.spec} />
  </AbsoluteFill>;
}

/** The chip's own coils as its GDS draws them, in place of the coil glyphs, shown by k. */
const chipCoils = (layout: LayoutData, k: number) => coilGlyphs(layout.shapes, k);

/** The optimizer at work on the block view (OptimizeView, shared with the site), with the film's caption band. */
function OptimizeScene({ layout, links, optimize, coilFrames, objective, candidates }: { layout: LayoutData; links: BlockLinks; optimize: Optimize; coilFrames: CoilFrames; objective: Objective; candidates: CoilCandidates }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <OptimizeView frame={useCurrentFrame()} layout={layout} links={links} run={optimize.pixels.evaluations} frames={coilFrames.frames} objective={objective} candidates={candidates.candidates} src={staticFile} />
    <Band {...optimizeCaptions(coilFrames.frames)} />
  </AbsoluteFill>;
}
const image = (layout: Pick<LayoutData, 'files'>, key: string) => layout.files[key] ? staticFile(layout.files[key].file) : null;


/** The film draws each stage picture with Remotion's Img, which holds the frame until the picture has loaded. */
const StageImg = ({ src, style }: { src: string; style: React.CSSProperties }) => <Img src={src} style={style} />;

function LayoutScene({ layout, links }: { layout: LayoutData; links: BlockLinks }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <LayoutView frame={useCurrentFrame()} layout={layout} links={links} src={key => image(layout, key)} Image={StageImg} zoomBlock="switch_fets" glyph={chipCoils(layout, 1)} />
    <Band {...CAPTIONS.layout} />
  </AbsoluteFill>;
}

/** The layout, scanned and validated (ValidationView): the checks come from the layout's verify record. */
function SignoffScene({ story, layout }: { story: StoryData; layout: LayoutData }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <ValidationView frame={useCurrentFrame()} layout={layout} record={story.signoff} src={key => image(layout, key)} Image={StageImg} />
    <Band {...VALIDATION_CAPTIONS.validation} />
  </AbsoluteFill>;
}

/** The layout's layers, lifted apart in z order and tilted into 3D (Chip3DView). */
function Chip3DScene({ layout }: { layout: LayoutData }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <Chip3DView frame={useCurrentFrame()} die={layout.die} layers={layout.layers} src={key => image(layout, key)} Image={StageImg} />
    <Band {...VALIDATION_CAPTIONS.chip3d} />
  </AbsoluteFill>;
}

/** The four recorded circuits, each drawn from its schematic (AnyView). */
function AnyScene({ story }: { story: StoryData }) {
  return <AbsoluteFill style={{ background: C.page }}>
    <AnyView frame={useCurrentFrame()} drawings={story.schematics} />
    <Band {...VALIDATION_CAPTIONS.any} />
  </AbsoluteFill>;
}

function DemoScene() {
  return <AbsoluteFill style={{ background: C.page }}><DemoView frame={useCurrentFrame()} /><Band {...DEMO_CAPTIONS} /></AbsoluteFill>;
}

function EndScene() {
  return <AbsoluteFill style={{ background: C.page }}><EndView frame={useCurrentFrame()} /></AbsoluteFill>;
}

// The arm hangs at the start (shoulder, elbow and wrist turned down) and is raised into the drawing's own pose like a
// machine: one joint after the other, each at a constant speed that starts and stops sharp (score.mjs ticks with it).
const LOWERED: Pose = { upper_arm: 75, forearm: 105, hand: 20 };
export const ARM = { upper_arm: [84, 105], forearm: [105, 135], hand: [135, 141] } as const;
/** Robot timing in frames of the end scene: the eyes wake, the picture switches on like an old television. */
export const WAKE = { eyes: 6, on: 36 } as const;
const jitter = (n: number, k: number) => (random(`${k}-${n}`) - .5) * 2;

/** The television's static: grain that changes every frame, and scanlines. */
function Static({ frame, k }: { frame: number; k: number }) {
  return k > .002 ? <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: k }}>
    <svg width="100%" height="100%"><filter id="tv-grain"><feTurbulence type="fractalNoise" baseFrequency=".85 .55" numOctaves={2} seed={frame} /><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .8  0 0 0 0 .95  0 0 0 1.6 -.55" /></filter>
      <rect width="100%" height="100%" filter="url(#tv-grain)" /></svg>
    <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, #00000000 0 3px, #0a1e3355 3px 4px)' }} />
  </AbsoluteFill> : null;
}

/** The alternative ending: two eyes light in the dark with a hum that shakes the screen, the whole robot switches on
 * like an old television as a quick silicon demonstrator, it raises its hand joint by joint, its index finger lights and opens
 * the GENESIS symbol, the camera flies into it and GENESIS comes out. */
function AltEndScene() {
  const frame = useCurrentFrame();
  const eyes = out(frame, WAKE.eyes, WAKE.eyes + 10) * (frame < WAKE.on + 30 ? .7 + .3 * random(`eye-${frame}`) : 1);
  const face = out(frame, 50, 90), lit = out(frame, 142, 154), open = out(frame, 152, 184);
  const fly = ease(frame, 184, 228), gone = ease(frame, 200, 228);
  const pose: Pose = Object.fromEntries(Object.entries(ARM).map(([part, [from, to]]) => [part, LOWERED[part] * interpolate(frame, [from, to], [1, 0], clamp)]));
  // The television switching on: a bright line across, opening top to bottom, then a flicker and tearing that calm down.
  const t = frame - WAKE.on, line = out(t, 0, 4), opening = ease(t, 4, 11), flash = t < 0 ? 0 : Math.max(0, 1 - Math.max(0, t - 6) / 12);
  const unsettled = t < 0 ? 0 : Math.max(0, 1 - t / 34), torn = unsettled * (random(`tear-${frame}`) > .55 ? 1 : 0);
  const flicker = 1 - unsettled * .45 * random(`flick-${frame}`);
  // The hum of the eyes and the switching on shake the screen a little.
  const quake = Math.max(0, 1 - Math.abs(frame - WAKE.eyes - 8) / 16) * 5 + unsettled * 7;
  const shake = `translate(${jitter(frame, 1) * quake}px, ${jitter(frame, 2) * quake}px)`;
  const grain = Math.max(.1 * Math.max(0, 1 - Math.abs(frame - WAKE.eyes - 10) / 20), .22 * unsettled, .05 * out(frame, WAKE.on, WAKE.on + 40) * (1 - gone));
  // The bust stands 1100 px tall right of the title, its body running off the bottom; the fly-in pulls the index
  // finger's tip to the symbol's place of the final card, growing the picture around it.
  const [W, H] = ROBOT_SIZE, s = 1.1 * 1000 / H, left = 1080 - ROBOT.face[0] * s, top = 10;
  const at = posed('hand', ROBOT.finger, pose), tip = [left + at[0] * s, top + at[1] * s], target = [960, 290], zoom = 1 + 5 * fly;
  const camera = `translate(${(target[0] - tip[0]) * fly}px, ${(target[1] - tip[1]) * fly}px) translate(${tip[0]}px, ${tip[1]}px) scale(${zoom}) translate(${-tip[0]}px, ${-tip[1]}px)`;
  const tv = `translateX(${torn * jitter(frame, 3) * 40}px) scale(${t < 0 ? 0 : .02 + .98 * line}, ${t < 0 ? 0 : .004 + .996 * opening})`;
  // The broken television stays on the body after the screen settles: bands of the picture slip sideways for a few
  // frames at a time, and dead pixels blink in and out over the body and the arms.
  const broken = (t < 0 ? 0 : 1) * (1 - fly), tick = Math.floor(frame / 3);
  const bands = Array.from({ length: 16 }, (_, i) => { const y = -200 + i * 90, slip = random(`slip-${i}-${tick}`) > .82;
    return { y, h: 90, dx: slip && y > 480 ? (random(`dx-${i}-${tick}`) - .5) * 60 * broken : 0 }; });
  const DEAD = ['#000000', '#ffffff', '#38e6ff', '#ff4fd8', '#4dff9a'];
  const dead = Array.from({ length: 46 }, (_, i) => { const r = (n: string) => random(`dead-${n}-${i}-${Math.floor(frame / (4 + i % 5))}`), size = 8 + 22 * r('s');
    const [x, y] = i % 4 === 3 ? [740 + 200 * r('x'), 260 + 440 * r('y')] : [180 + 640 * r('x'), 560 + 520 * r('y')];
    return { x, y, w: size * (r('w') > .6 ? 3 : 1), h: size, colour: DEAD[Math.floor(r('c') * DEAD.length)], k: broken * (r('on') > .45 ? .55 + .45 * r('k') : 0) }; });
  const glow = (x: number, y: number, rx: number, ry: number, k: number, colour: string, blur: number) =>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={colour} opacity={k} style={{ filter: `blur(${blur}px)` }} />;
  return <AbsoluteFill style={{ background: C.page, overflow: 'hidden' }}>
    <Sunrise from={30} k={out(frame, WAKE.on + 6, WAKE.on + 40)} />
    <div style={{ position: 'absolute', inset: 0, transform: shake }}>
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: camera, opacity: 1 - gone }}>
      <div style={{ position: 'absolute', left, top, width: W * s, height: H * s }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', transformOrigin: `${ROBOT.face[0] / W * 100}% ${ROBOT.eyes[0][1] / H * 100}%`, transform: tv,
          filter: `brightness(${(.75 + .35 * face) * flicker + .9 * flash}) saturate(${1 - .4 * flash})` }}>
          <defs>
            <radialGradient id="robot-head-fade"><stop offset=".72" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
            <mask id="robot-head" maskUnits="userSpaceOnUse" x={-200} y={-200} width={1400} height={1500}><ellipse cx={500} cy={300} rx={215} ry={255} fill="url(#robot-head-fade)" /></mask>
            <mask id="robot-body" maskUnits="userSpaceOnUse" x={-200} y={-200} width={1400} height={1500}><g style={{ filter: 'brightness(0) invert(1)' }}><Robot pose={pose} /></g></mask>
            {bands.map((b, i) => <clipPath key={i} id={`robot-band-${i}`}><rect x={-300} y={b.y} width={1600} height={b.h} /></clipPath>)}
          </defs>
          {/* A broken television: the body is soft and dim, torn in shifting bands, with dead pixels; the head stays sharp. */}
          <g style={{ filter: `blur(${3.5 * broken}px) brightness(${1 - .3 * broken})` }}>
            {bands.map((b, i) => <g key={i} clipPath={`url(#robot-band-${i})`} transform={`translate(${b.dx} 0)`}><Robot pose={pose} /></g>)}
          </g>
          <g mask="url(#robot-head)"><Robot pose={pose} /></g>
          <g mask="url(#robot-body)">{dead.map((d, i) => <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.colour} opacity={d.k} />)}</g>
        </svg>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', mixBlendMode: 'screen' }}>
          {glow(ROBOT.face[0], ROBOT.face[1], 200, 220, .25 * face, '#2f7fd8', 50)}
          {ROBOT.eyes.map(([x, y], i) => <g key={i}>{glow(x, y, ROBOT.eye[0] * 2.2, ROBOT.eye[1] * 3.4, eyes, '#3aa0ff', 30)}{glow(x, y, ROBOT.eye[0] * 1.2, ROBOT.eye[1] * 1.3, eyes, '#7cc8ff', 12)}{glow(x, y, ROBOT.eye[0] * .8, ROBOT.eye[1] * .7, eyes, '#eaf8ff', 5)}</g>)}
          {glow(at[0], at[1], 70, 70, lit * (1 - open * .6), '#9ff3fa', 18)}{glow(at[0], at[1], 14, 14, lit, '#ffffff', 3)}
        </svg>
      </div>
    </div>
    </div>
    <Static frame={frame} k={grain} />
    {/* The symbol opens at the index finger, then the camera carries it to the card's place. */}
    {frame >= 150 && <div style={{ position: 'absolute', left: tip[0] + (target[0] - tip[0]) * fly, top: tip[1] + (target[1] - tip[1]) * fly, transform: `translate(-50%, -50%) scale(${(.18 + .82 * fly) * (.3 + .7 * open)})`, opacity: open }}>
      <LitEmblem width={460} from={150} />
    </div>}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 290 + 160, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Signature frame={frame} at={226} motto="Designs your future." />
    </div>
  </AbsoluteFill>;
}


export function Story({ alt, theme, story, layout, links, sparams, optimize, circuits, coilFrames, objective, candidates }: StoryProps) {
  if (!story || !layout || !links || !sparams || !optimize || !circuits || !coilFrames || !objective || !candidates) throw new Error('story.json, layout.json, blocks.json, sparams.json, optimize.json, circuit_layouts.json, coil_frames.json, objective.json or coil_candidates.json is missing from the public folder');
  const scene: Record<string, React.ReactNode> = {
    ask: <Ask story={story} />, schematic: <SchematicScene story={story} layout={layout} />, blocks: <BlocksScene story={story} layout={layout} links={links} />, testbench: <TestbenchScene story={story} layout={layout} links={links} sparams={sparams} />,
    spec: <SpecScene layout={layout} links={links} sparams={sparams} objective={objective} />,
    optimize: <OptimizeScene layout={layout} links={links} optimize={optimize} coilFrames={coilFrames} objective={objective} candidates={candidates} />,
    layout: <LayoutScene layout={layout} links={links} />, signoff: <SignoffScene story={story} layout={layout} />, chip3d: <Chip3DScene layout={layout} />,
    any: <AnyScene story={story} />, demo: <DemoScene />, end: alt ? <AltEndScene /> : <EndScene />,
  };
  // The light film sets the light film tokens, as the site's light stage does; the dark film sets none.
  const tokens = theme === 'light' ? Object.fromEntries(Object.entries(film.tokens).map(([name, value]) => [`--film-${name}`, value.light])) : {};
  return <AbsoluteFill style={tokens}><TransitionSeries>
    {scenesOf(alt).flatMap(([id, seconds], i) => [
      ...(i && !CUT_IN.has(id) ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />] : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={Math.round(seconds * FPS)}><SceneId.Provider value={id}>{scene[id]}</SceneId.Provider></TransitionSeries.Sequence>,
    ])}
  </TransitionSeries></AbsoluteFill>;
}
