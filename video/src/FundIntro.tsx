import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { alpha, B, C, GRADIENT } from './Brand';
import { LitEmblemView, SunriseView } from '../../src/shared/story/landing';
import { Chip3DView } from '../../src/shared/story/scenes-validation';
import { ease, out } from '../../src/shared/story/motion';
import site from '../../src/content/site.json';

// The fund film, for investors, in the order of a startup pitch: a short intro with music only; the companies building RF chips and their problem, then
// GENESIS; the team; the cost of the problem in sourced numbers; why it is hard, our approach; then (as a cut of the story film in plain words, joined by
// fund.mjs) the product; then the business model and the close. The head part
// renders everything before the product cut, the tail part everything after it. Names and roles come from the site's
// content, the founders' facts from their public pages (FOUNDERS), and the layout from a GENESIS chip's drawn layers
// (layout.json and layout/*.png in the inputs folder, as the story film reads them). The narration sets the pace:
// timing.json in the inputs folder (written by the narration planner) gives each scene its length and maps its design
// frames (the frames written in the scenes below) to film frames, so a scene stretches where a voice needs more time.

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

type Layout = { die: [number, number, number, number]; width: number; height: number; files: Record<string, { file: string }>; layers: { name: string }[] };
/** Per scene: its length in film frames, and [design frame, film frame] pairs from 0 to the scene's design end. */
type Timing = Record<string, { frames: number; beats: [number, number][] }>;
export type FundProps = { part: 'head' | 'tail'; layout: Layout | null; timing: Timing | null };
export const fundMetadata: CalculateMetadataFunction<FundProps> = async ({ props }) => {
  const [layout, timing] = await Promise.all(['layout.json', 'timing.json'].map(async file => (await fetch(staticFile(file))).json()));
  return { props: { ...props, layout, timing }, durationInFrames: fundFrames(props.part, timing) };
};

const SceneBeats = createContext<[number, number][] | undefined>(undefined);
/** The scene's design frame at this film frame: piecewise linear between the beats, so the animation slows where the
 * narration needs more time and every caption lands when its line starts. */
const useSceneFrame = () => {
  const frame = useCurrentFrame(), beats = useContext(SceneBeats);
  if (!beats) return frame;
  let k = 0;
  while (k < beats.length - 2 && frame >= beats[k + 1][1]) k++;
  const [[d0, f0], [d1, f1]] = [beats[k], beats[k + 1]];
  return d0 + (frame - f0) * (d1 - d0) / (f1 - f0);
};

const FADE = 16;
const [ISLAM, MEHMET] = site.about.people;
/** Public facts on the founders (read 2026-11-01): citations from their scholar profiles, Mehmet's companies as his
 * LinkedIn profile names them and his UC San Diego years (İslam, 11-01), İslam's degree and group from his research-group page and his master's lab. */
const FOUNDERS = {
  islam: { citations: 253,
    intro: ['PhD researcher at Université catholique de Louvain.', 'He worked on multi-agent systems and UAV systems.', 'He now works on non-intuitive design methods for RF chips.'],
    places: ['Université catholique de Louvain', 'Özyeğin University'] },
  mehmet: { citations: 400,
    intro: ['More than ten years designing millimeter-wave chips at Nokia Siemens Networks, Panasonic, Broadcom and Anokiwave.',
      'At UC San Diego, he launched Radiofast Microsystems from his PhD research.', 'He holds an MBA.'],
    places: ['UC San Diego', 'Nokia Siemens Networks', 'Panasonic', 'Broadcom', 'Anokiwave', 'Radiofast Microsystems'] },
};

const font: CSSProperties = { fontFamily: 'Inter' };
const rise = (k: number, px = 24): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * px}px)` });
const count = (n: number, frame: number, from: number) => Math.round(n * ease(frame, from, from + 40));

const Chip = ({ children, colour, k }: { children: ReactNode; colour: string; k: number }) =>
  <span style={{ ...font, ...rise(k, 14), display: 'inline-block', padding: '10px 20px', borderRadius: 999, fontSize: 24, fontWeight: 600, color: C.text,
    background: alpha(colour, .12), border: `2px solid ${alpha(colour, .55)}`, whiteSpace: 'nowrap' }}>{children}</span>;

/** Text with its key words marked as *words*: those are set bold and underlined in the brand cyan. */
const Marked = ({ text }: { text: string }) => <>{text.split(/\*([^*]+)\*/).map((part, i) => i % 2
  ? <span key={i} style={{ fontWeight: 800, textDecoration: 'underline', textDecorationColor: C.cyan, textDecorationThickness: 4, textUnderlineOffset: 10 }}>{part}</span>
  : part.split(/(GENESIS)/).map((bit, j) => bit === 'GENESIS' ? <span key={`${i}.${j}`} style={{ fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span> : bit))}</>;

const CROSS = 8;
/** The caption band: the chapter and the caption of the moment, in a regular weight with its key words marked. A caption
 * left empty shows no band, so a scene speaks through its picture where the picture already says it. */
const Captions = ({ chapter, captions, frame }: { chapter: string; captions: [number, string][]; frame: number }) => {
  const at = captions.reduce((last, [from], i) => frame >= from ? i : last, -1), [from, text] = captions[at] ?? [0, ''], next = captions[at + 1]?.[0];
  const k = text ? out(frame, from + 2, from + 12) * (next === undefined ? 1 : 1 - out(frame, next - CROSS, next)) : 0;
  return <>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, opacity: k, background: `linear-gradient(180deg, ${alpha(C.page, 0)} 0%, ${alpha(C.page, .8)} 45%, ${alpha(C.page, .95)} 100%)` }} />
    <div style={{ ...font, position: 'absolute', left: 96, right: 96, bottom: 74, opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
      <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 22, letterSpacing: '.18em', textTransform: 'uppercase', color: C.cyan }}>{chapter}</div>
      <div style={{ fontWeight: 500, fontSize: 52, lineHeight: 1.25, letterSpacing: '-.01em', color: C.text, textShadow: '0 4px 30px #000a' }}><Marked text={text} /></div>
    </div>
  </>;
};

const Scene = ({ children, chapter, captions }: { children: ReactNode; chapter: string; captions: [number, string][] }) => {
  const frame = useSceneFrame();
  return <AbsoluteFill style={{ background: C.page, overflow: 'hidden' }}>{children}<Captions chapter={chapter} captions={captions} frame={frame} /></AbsoluteFill>;
};

const Grid = ({ children, columns, top = 220 }: { children: ReactNode; columns: number; top?: number }) =>
  <div style={{ position: 'absolute', left: 150, right: 150, top, display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 36 }}>{children}</div>;

/** Simple line icons for where RF chips are used. */
const ICONS: Record<string, ReactNode> = {
  phone: <><rect x={22} y={6} width={36} height={68} rx={8} /><path d="M34 64h12" /><path d="M64 22a14 14 0 0 1 0 20M70 16a24 24 0 0 1 0 32" /></>,
  car: <><path d="M8 52l6-18a6 6 0 0 1 6-4h28a6 6 0 0 1 6 4l6 18v10H8z" /><circle cx={20} cy={62} r={6} /><circle cx={52} cy={62} r={6} /><path d="M64 34a12 12 0 0 1 0 16M70 28a20 20 0 0 1 0 28" /></>,
  router: <><rect x={8} y={46} width={64} height={20} rx={5} /><path d="M22 46V30M58 46V30" /><circle cx={20} cy={56} r={2.5} /><circle cx={30} cy={56} r={2.5} /><path d="M30 22a14 14 0 0 1 20 0M24 15a24 24 0 0 1 32 0" /></>,
  satellite: <><rect x={30} y={30} width={20} height={20} rx={3} transform="rotate(45 40 40)" /><path d="M14 14l12 12M54 54l12 12" /><rect x={4} y={4} width={16} height={16} rx={2} /><rect x={60} y={60} width={16} height={16} rx={2} /><path d="M58 18a8 8 0 0 1 4 4M60 10a16 16 0 0 1 10 10" /></>,
};
const COLOURS = [B.brand1, B.brand2, B.brand3, B.brand4];

const StageImg = ({ src, style }: { src: string; style: CSSProperties }) => <Img src={src} style={style} />;
const layoutSrc = (layout: Layout) => (key: string) => layout.files[key] ? staticFile(layout.files[key].file) : null;

/** Companies building RF and millimeter-wave chips, named as plain text (no logos: none has granted its use), each with
 * the public record of such a chip: Qualcomm's QTM052 5G mm-wave module (2018), Broadcom's 60 GHz mesh chipset,
 * Infineon's 76–81 GHz RASIC radar transceivers (2022), Nokia's ReefShark RFICs (2018), imec's 140 GHz radar-on-chip (2018). */
const COMPANIES = ['Qualcomm', 'Broadcom', 'Infineon', 'Nokia', 'imec'];

/** The opening (İslam, 11-01): these chips are everywhere in daily life; the major actors build them; they are expensive
 * and hard to design, with many metal layers (the chip's stack lifts apart in 3D); then GENESIS as the solution. */
function Opening({ layout }: FundProps) {
  const frame = useSceneFrame(), ACTORS = 150, HARD = 300, SWAP = 480;
  const uses: [string, string][] = [['phone', 'Phones'], ['car', 'Car radar'], ['router', 'Wi-Fi'], ['satellite', 'Satellite links']];
  const life = 1 - out(frame, ACTORS - 16, ACTORS), actors = out(frame, ACTORS, ACTORS + 16) * (1 - out(frame, HARD - 16, HARD));
  const hard = out(frame, HARD, HARD + 16) * (1 - out(frame, SWAP - 20, SWAP)), us = out(frame, SWAP, SWAP + 24);
  const headline = (text: string, at: number) => <div style={{ ...font, ...rise(out(frame, at + 4, at + 24)), fontSize: 60, fontWeight: 500, color: C.text, letterSpacing: '-.01em', textAlign: 'center' }}><Marked text={text} /></div>;
  return <Scene chapter="RF chips" captions={[[0, '']]}>
    <SunriseView frame={frame} k={.35} />
    {life > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 220, opacity: life }}>
      {headline('Millimeter-wave and RF chips are *everywhere* in our daily lives', 0)}
      {uses.map(([icon, label], i) => <Node key={icon} x={480 + i * 320} y={420} name={icon} label={label} colour={COLOURS[i]} k={out(frame, 30 + i * 14, 50 + i * 14)} size={130} />)}
    </div>}
    {actors > 0 && <div style={{ ...font, position: 'absolute', left: 0, right: 0, top: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64, opacity: actors }}>
      {headline('Many *major actors* build these chips', ACTORS)}
      <div style={{ display: 'flex', gap: 34 }}>{COMPANIES.map((name, i) => <div key={name} style={{ ...rise(out(frame, ACTORS + 30 + i * 12, ACTORS + 50 + i * 12), 30), padding: '30px 46px', borderRadius: 24,
        background: C.card, border: `1px solid ${C.border}`, fontSize: 58, fontWeight: 750, color: C.text, letterSpacing: '-.01em' }}>{name}</div>)}</div>
    </div>}
    {hard > 0 && layout && <div style={{ position: 'absolute', inset: 0, opacity: hard }}>
      <div style={{ position: 'absolute', left: -420, top: -40, width: 1920, height: 1080 }}>
        <Chip3DView frame={frame - HARD + 60} die={layout.die} layers={layout.layers} src={layoutSrc(layout)} Image={StageImg} />
      </div>
      <div style={{ position: 'absolute', left: 1080, right: 90, top: 200, display: 'flex', flexDirection: 'column', gap: 64 }}>
        <Point name="coin" text="Expensive" colour={B.brand2} frame={frame} at={HARD + 20} />
        <Point name="goals" text="Hard to design" colour={B.brand1} frame={frame} at={HARD + 70} />
        <Point name="layers" text="Many metal layers" colour={B.brand3} frame={frame} at={HARD + 120} />
      </div>
    </div>}
    {us > 0 && <div style={{ position: 'absolute', left: 0, right: 0, top: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, opacity: us }}>
      <LitEmblemView frame={frame} width={300} from={SWAP} />
      <div style={{ ...font, ...rise(us), fontSize: 76, fontWeight: 500, color: C.text, letterSpacing: '-.015em' }}><Marked text="GENESIS is *the solution*" /></div>
      <div style={{ ...font, ...rise(out(frame, SWAP + 50, SWAP + 70)), fontSize: 44, fontWeight: 500, color: C.muted }}>It designs these chips with AI.</div>
    </div>}
  </Scene>;
}

/** A sourced number: the figure, what it counts, and its source line. */
function Figure({ value, line, source, colour, frame, at }: { value: string; line: string; source: string; colour: string; frame: number; at: number }) {
  const k = out(frame, at, at + 22);
  return <div style={{ ...font, ...rise(k, 36), padding: '34px 30px', borderRadius: 28, background: C.card, border: `1px solid ${C.border}`, borderTop: `5px solid ${colour}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontSize: 80, fontWeight: 850, color: colour, letterSpacing: '-.02em' }}>{value}</div>
    <div style={{ fontSize: 34, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{line}</div>
    <div style={{ fontSize: 23, fontWeight: 500, color: C.muted }}>Source: {source}</div>
  </div>;
}

/** The expensive problem: three sourced numbers, then many variables pulling against many goals. */
function Problem() {
  const frame = useSceneFrame(), knobs = out(frame, 330, 360), pull = Math.sin(frame / 9);
  return <Scene chapter="An expensive problem" captions={[[0, 'Chip design is an *expensive* engineering problem.'], [100, ''], [200, ''], [330, 'Every design balances *many variables* against *many goals* at once.']]}>
    <Grid columns={3} top={130}>
      <Figure value="$4.9 billion" line="Chip design software and IP sold in one quarter" source="SEMI ESD Alliance, Q4 2024" colour={B.brand1} frame={frame} at={10} />
      <Figure value="$127,590" line="Median yearly pay of an electronics engineer in the US" source="US Bureau of Labor Statistics, 2024" colour={B.brand3} frame={frame} at={200} />
      <Figure value="27,300" line="Engineers missing in the US chip industry by 2030" source="SIA and Oxford Economics, 2023" colour={B.brand4} frame={frame} at={260} />
    </Grid>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: knobs }}>
      {Array.from({ length: 9 }, (_, i) => { const x = 330 + i * 160, a = (i * 37 % 90 - 45 + 30 * pull * (i % 2 ? 1 : -1)) * Math.PI / 180;
        return <g key={i}><circle cx={x} cy={600} r={38} fill="none" stroke={COLOURS[i % 4]} strokeWidth={5} />
          <line x1={x} y1={600} x2={x + 29 * Math.sin(a)} y2={600 - 29 * Math.cos(a)} stroke={COLOURS[i % 4]} strokeWidth={5} strokeLinecap="round" /></g>; })}
      {Array.from({ length: 4 }, (_, i) => { const w = 260 + 120 * Math.sin(frame / 11 + i * 1.7);
        return <g key={i}><rect x={420 + i * 280} y={680} width={220} height={14} rx={7} fill={alpha(C.muted, .25)} />
          <rect x={420 + i * 280} y={680} width={Math.max(20, w * 220 / 380)} height={14} rx={7} fill={COLOURS[i]} /></g>; })}
    </svg>
  </Scene>;
}

/** Line icons for the business-model scenes, drawn on an 80-unit square. */
const SYMBOLS: Record<string, ReactNode> = {
  university: <><path d="M8 30L40 12l32 18z" /><path d="M16 36v24M30 36v24M50 36v24M64 36v24" /><path d="M8 68h64" /></>,
  team: <><circle cx={40} cy={24} r={9} /><path d="M24 58a16 16 0 0 1 32 0" /><circle cx={16} cy={32} r={7} /><path d="M4 62a12 12 0 0 1 20-8" /><circle cx={64} cy={32} r={7} /><path d="M76 62a12 12 0 0 0-20-8" /></>,
  factory: <><path d="M8 70V38l16 9v-9l16 9v-9l16 9V12h12v58z" /><path d="M4 70h72" /></>,
  coin: <><circle cx={40} cy={40} r={28} /><path d="M49 30c-3-4-15-5-17 1s15 6 17 12-13 8-17 3M40 18v44" /></>,
  cycle: <><path d="M62 30a24 24 0 0 0-44 2M18 50a24 24 0 0 0 44-2" /><path d="M64 16v14H50M16 64V50h14" /></>,
  rules: <><path d="M8 16h24a8 8 0 0 1 8 8v46a6 6 0 0 0-6-6H8z" /><path d="M72 16H48a8 8 0 0 0-8 8v46a6 6 0 0 1 6-6h26z" /><path d="M16 30h14M16 40h14M50 30h14M50 40h14" /></>,
  agent: <><path d="M36 8l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" /><path d="M62 50l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" /></>,
  chip: <><rect x={18} y={18} width={44} height={44} rx={6} /><path d="M18 30H8M18 50H8M62 30h10M62 50h10M30 18V8M50 18V8M30 62v10M50 62v10" /></>,
  check: <path d="M28 41l8 8 16-17" />,
  lock: <><rect x={18} y={36} width={44} height={34} rx={6} /><path d="M28 36V26a12 12 0 0 1 24 0v10" /><circle cx={40} cy={53} r={4} /></>,
  layers: <><path d="M40 10L72 26 40 42 8 26z" /><path d="M8 40l32 16 32-16M8 54l32 16 32-16" /></>,
  goals: <><circle cx={40} cy={40} r={28} /><circle cx={40} cy={40} r={17} /><circle cx={40} cy={40} r={6} /></>,
  cloud: <path d="M22 62h36a14 14 0 0 0 2-28 20 20 0 0 0-38-2 15 15 0 0 0 0 30z" />,
  computer: <><rect x={8} y={12} width={64} height={42} rx={5} /><path d="M28 68h24M40 54v14" /></>,
};
const Symbol = ({ name, colour, size = 120, k = 1, glow = .6 }: { name: string; colour: string; size?: number; k?: number; glow?: number }) =>
  <svg viewBox="0 0 80 80" width={size} height={size} fill="none" stroke={colour} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
    style={{ opacity: k, transform: `scale(${.85 + .15 * k})`, filter: `drop-shadow(0 0 12px ${alpha(colour, glow)})` }}>{SYMBOLS[name] ?? ICONS[name]}</svg>;

/** A symbol centred on (x, y) with a short label under it. */
const Node = ({ x, y, name, label, colour, k, size = 130 }: { x: number; y: number; name: string; label?: string; colour: string; k: number; size?: number }) =>
  <div style={{ ...font, position: 'absolute', left: x - 200, top: y - size / 2, width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, ...rise(k, 24) }}>
    <Symbol name={name} colour={colour} size={size} k={k} />
    {label && <div style={{ fontSize: 30, fontWeight: 650, color: C.text, textAlign: 'center' }}>{label}</div>}
  </div>;

/** A line from one point to another that draws itself from `at`, with light pulses running along it. */
function Flow({ from, to, colour, frame, at, span = 24 }: { from: [number, number]; to: [number, number]; colour: string; frame: number; at: number; span?: number }) {
  const k = ease(frame, at, at + span), [x1, y1] = from, [x2, y2] = to;
  return <g>
    <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k} stroke={alpha(colour, .5)} strokeWidth={4} strokeLinecap="round" />
    {k >= 1 && [0, 1, 2].map(i => { const t = ((frame - at - span) / 40 + i / 3) % 1;
      return <circle key={i} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r={7} fill={colour} style={{ filter: `drop-shadow(0 0 8px ${colour})` }} />; })}
  </g>;
}

/** Business model, customers: RF research knowledge reaches the RF design teams of chip companies through GENESIS. */
function Customers() {
  const frame = useSceneFrame(), uses: [string, string][] = [['phone', 'Phones'], ['car', 'Car radar'], ['router', 'Wi-Fi'], ['satellite', 'Satellite links']];
  return <Scene chapter="Business model" captions={[[0, 'Our years at Broadcom, Nokia Siemens Networks and Anokiwave showed us *where the need is*.'], [130, 'Our customers are *the RF design teams* at chip companies.']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <Flow from={[520, 300]} to={[820, 300]} colour={B.brand1} frame={frame} at={30} />
      <Flow from={[1100, 300]} to={[1400, 300]} colour={B.brand2} frame={frame} at={120} />
      {uses.map((_, i) => <Flow key={i} from={[1500, 380]} to={[1160 + i * 190, 560]} colour={COLOURS[i]} frame={frame} at={170 + i * 10} span={18} />)}
    </svg>
    <Node x={400} y={290} name="university" label="RF research" colour={B.brand1} k={out(frame, 6, 26)} />
    <div style={{ position: 'absolute', left: 960 - 130, top: 170, ...rise(out(frame, 50, 70)) }}><LitEmblemView frame={frame} width={260} from={50} /></div>
    <Node x={1520} y={290} name="team" label="RF design teams" colour={B.brand3} k={out(frame, 130, 150)} />
    {uses.map(([icon, label], i) => <Node key={icon} x={1160 + i * 190} y={600} name={icon} label={label} colour={COLOURS[i]} k={out(frame, 186 + i * 10, 204 + i * 10)} size={80} />)}
  </Scene>;
}

/** Business model, value: a month of expert work folds into hours; the chip passes the checks; many designs instead of a few. */
function Value() {
  const frame = useSceneFrame(), fold = ease(frame, 70, 100), spin = (frame - 100) * 6;
  const cells = Array.from({ length: 20 }, (_, i) => ({ x: 260 + (i % 5) * 64, y: 230 + Math.floor(i / 5) * 64, k: out(frame, 8 + i * 2.5, 16 + i * 2.5) }));
  const tried = (n: number, seed: number) => Array.from({ length: n }, (_, i) => { const a = Math.sin(i * 12.9898 + seed) * 43758.5453, b = Math.sin(i * 78.233 + seed) * 12345.678;
    return [1340 + 360 * (a - Math.floor(a)), 220 + 260 * (b - Math.floor(b))]; });
  const hand = tried(6, 1), many = tried(70, 7), best = many.reduce((m, p) => p[0] - p[1] > m[0] - m[1] ? p : m);
  return <Scene chapter="Business model" captions={[[0, ''], [130, '']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, fontFamily: 'Inter' }}>
      <g opacity={1 - fold}>{cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={52} height={52} rx={8} fill={alpha(B.brand1, .2 + .5 * c.k)} stroke={B.brand1} strokeWidth={2} opacity={c.k} />)}</g>
      <g opacity={fold} transform={`translate(420 340) scale(${.6 + .4 * fold})`} style={{ filter: `drop-shadow(0 0 14px ${alpha(B.brand1, .6)})` }}>
        <circle r={110} fill="none" stroke={B.brand1} strokeWidth={8} />
        <line x1={0} y1={0} x2={0} y2={-70} stroke={B.brand1} strokeWidth={8} strokeLinecap="round" transform={`rotate(${spin / 12})`} />
        <line x1={0} y1={0} x2={0} y2={-92} stroke={B.brand2} strokeWidth={6} strokeLinecap="round" transform={`rotate(${spin})`} />
      </g>
      <text x={420} y={560} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.text}>{fold < .5 ? 'Weeks of expert work' : 'A few hours'}</text>
      <text x={1520} y={560} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.text} opacity={out(frame, 140, 160)}>Far more designs tried</text>
      {hand.map(([x, y], i) => <circle key={`h${i}`} cx={x} cy={y} r={11} fill={C.muted} opacity={out(frame, 130 + i * 4, 140 + i * 4)} />)}
      {many.map(([x, y], i) => <circle key={`m${i}`} cx={x} cy={y} r={7} fill={COLOURS[i % 4]} opacity={.85 * out(frame, 160 + i, 168 + i)} />)}
      <circle cx={best[0]} cy={best[1]} r={22} fill="none" stroke={B.brand2} strokeWidth={4} opacity={out(frame, 240, 252)} style={{ filter: `drop-shadow(0 0 10px ${B.brand2})` }} />
    </svg>
    <div style={{ position: 'absolute', left: 960 - 110, top: 230, opacity: out(frame, 120, 140) }}>
      <svg viewBox="0 0 80 80" width={220} height={220} fill="none" stroke={B.brand3} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 14px ${alpha(B.brand3, .6)})` }}>
        {SYMBOLS.chip}<path d="M28 41l8 8 16-17" stroke={B.brand2} strokeWidth={4.5} strokeDasharray={40} strokeDashoffset={40 * (1 - ease(frame, 150, 175))} />
      </svg>
    </div>
    <div style={{ ...font, position: 'absolute', left: 760, width: 400, top: 530, textAlign: 'center', fontSize: 34, fontWeight: 700, color: C.text, opacity: out(frame, 150, 170) }}>Ready to manufacture</div>
  </Scene>;
}

/** Business model, revenue: three steps that rise, each a larger source of revenue than the last. */
function Revenue() {
  const frame = useSceneFrame(), BASE = 650;
  const steps: [string, string, number][] = [['coin', 'Paid pilots', 130], ['cycle', 'Yearly subscription', 230], ['factory', 'Chip factory partnerships', 330]];
  const at = [100, 200, 300];
  const curve = ease(frame, 100, 380);
  return <Scene chapter="Business model" captions={[[0, ''], [100, 'From our startup experience, we start with *paid pilots*, where we design RF blocks for a fee.'], [200, ''], [300, 'Finally, chip factories partner with us, so *GENESIS comes with their tools*.']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <line x1={200} y1={BASE} x2={1720} y2={BASE} stroke={alpha(C.muted, .4)} strokeWidth={3} />
      {steps.map(([, , h], i) => { const k = ease(frame, at[i], at[i] + 30);
        return <rect key={i} x={260 + i * 480} y={BASE - h * k} width={440} height={h * k} rx={14} fill={alpha(COLOURS[i], .18)} stroke={COLOURS[i]} strokeWidth={3} />; })}
      <path d="M260 600 C 700 590, 1000 470, 1660 240" fill="none" stroke={B.brand2} strokeWidth={5} strokeDasharray="1600" strokeDashoffset={1600 * (1 - curve)} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${B.brand2})` }} />
      {frame > 330 && Array.from({ length: 10 }, (_, i) => { const a = -Math.PI * (.1 + .8 * i / 9), r = 60 + 80 * ease(frame, 330 + i * 3, 370 + i * 3);
        return <circle key={i} cx={1440 + r * Math.cos(a)} cy={230 + r * Math.sin(a) * .6} r={8} fill={B.brand4} opacity={.9} />; })}
    </svg>
    {steps.map(([icon, label, h], i) => { const k = out(frame, at[i] + 10, at[i] + 30), top = BASE - h - 210;
      return <div key={icon} style={{ ...font, position: 'absolute', left: 260 + i * 480, width: 440, top, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, ...rise(k, 24) }}>
        <Symbol name={icon} colour={COLOURS[i]} size={110} k={k} />
        <div style={{ fontSize: 34, fontWeight: 750, color: C.text, textAlign: 'center' }}>{label}</div>
      </div>; })}
  </Scene>;
}

/** Business model, why now: AI agents and the factory's rules meet in a chip that passes its checks. */
function WhyNow() {
  const frame = useSceneFrame();
  return <Scene chapter="Why now" captions={[[0, 'Today, AI can plan and check this work, so *full automation is possible now*.']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <Flow from={[560, 230]} to={[1250, 360]} colour={B.brand1} frame={frame} at={30} />
      <Flow from={[560, 520]} to={[1250, 400]} colour={B.brand3} frame={frame} at={44} />
    </svg>
    <Node x={460} y={220} name="agent" label="AI agents" colour={B.brand1} k={out(frame, 4, 24)} size={110} />
    <Node x={460} y={500} name="rules" label="Factory rules" colour={B.brand3} k={out(frame, 18, 38)} size={110} />
    <div style={{ position: 'absolute', left: 1380 - 120, top: 260, ...rise(out(frame, 60, 80)) }}>
      <svg viewBox="0 0 80 80" width={240} height={240} fill="none" stroke={B.brand2} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 16px ${alpha(B.brand2, .7)})` }}>
        {SYMBOLS.chip}<path d="M28 41l8 8 16-17" strokeWidth={4.5} strokeDasharray={40} strokeDashoffset={40 * (1 - ease(frame, 80, 104))} />
      </svg>
      <div style={{ ...font, fontSize: 34, fontWeight: 750, color: C.text, textAlign: 'center', marginTop: 10, width: 240 }}>Full automation</div>
    </div>
  </Scene>;
}

/** A short line with its symbol, rising in at `at`: the points beside the chip's layers. */
const Point = ({ name, text, colour, frame, at }: { name: string; text: string; colour: string; frame: number; at: number }) => {
  const k = out(frame, at, at + 20);
  return <div style={{ ...font, ...rise(k, 24), display: 'flex', alignItems: 'center', gap: 28 }}>
    <Symbol name={name} colour={colour} size={96} k={k} />
    <div style={{ fontSize: 38, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{text}</div>
  </div>;
};

/** Why it is hard: the chip's metal layers lift apart in 3D; the market, then what makes the design hard and closed. */
function MillimeterWave({ layout }: FundProps) {
  const frame = useSceneFrame(), SWAP = 190;
  if (!layout) return null;
  const src = layoutSrc(layout), market = 1 - out(frame, SWAP - 16, SWAP);
  return <Scene chapter="Why it is hard" captions={[[0, 'Millimeter-wave is the next step for *5G, car radar and satellite links*.'], [100, 'At these frequencies, *every wire and every metal layer* is part of the circuit.'],
    [SWAP, ''], [SWAP + 100, 'It is built on technology stacks held in *proprietary design kits*.'], [SWAP + 200, 'Those kits are *under NDA*, so cloud AI models cannot access them.']]}>
    <div style={{ position: 'absolute', left: -420, top: -40, width: 1920, height: 1080, opacity: out(frame, 0, 20) }}>
      <Chip3DView frame={frame + 60} die={layout.die} layers={layout.layers} src={src} Image={StageImg} />
    </div>
    {market > 0 && <div style={{ position: 'absolute', left: 1120, right: 110, top: 170, opacity: market }}>
      <Figure value="$69.7 billion" line="RF chip market by 2030, from $51.3 billion in 2024" source="Yole Group, 2025" colour={B.brand2} frame={frame} at={20} />
    </div>}
    <div style={{ position: 'absolute', left: 1080, right: 90, top: 140, display: 'flex', flexDirection: 'column', gap: 60 }}>
      <Point name="goals" text="Many performance goals" colour={B.brand1} frame={frame} at={SWAP} />
      <Point name="layers" text="Complex technology stacks" colour={B.brand3} frame={frame} at={SWAP + 100} />
      <Point name="lock" text="Design kits under NDA" colour={B.brand4} frame={frame} at={SWAP + 200} />
    </div>
  </Scene>;
}

/** Our approach: RF know-how with AI methods and local language models, on local hardware, light in the cloud. */
function Approach() {
  const frame = useSceneFrame(), load = .18 + .04 * Math.sin(frame / 8);
  return <Scene chapter="Our approach" captions={[[0, 'With our AI expertise, we combine academic RF knowledge with AI methods and *local language models*.'], [150, 'Our models run on local hardware, so *the design kits never leave the company*.'], [270, '']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <Flow from={[520, 250]} to={[800, 360]} colour={B.brand1} frame={frame} at={20} />
      <Flow from={[520, 520]} to={[800, 400]} colour={B.brand3} frame={frame} at={34} />
      <Flow from={[1120, 380]} to={[1400, 380]} colour={B.brand2} frame={frame} at={270} />
      <g opacity={out(frame, 290, 310)}>
        <rect x={1380} y={560} width={300} height={16} rx={8} fill={alpha(C.muted, .3)} />
        <rect x={1380} y={560} width={300 * load} height={16} rx={8} fill={B.brand2} />
      </g>
    </svg>
    <Node x={420} y={240} name="university" label="RF knowledge" colour={B.brand1} k={out(frame, 4, 24)} size={110} />
    <Node x={420} y={510} name="agent" label="AI methods" colour={B.brand3} k={out(frame, 16, 36)} size={110} />
    <div style={{ position: 'absolute', left: 960 - 160, top: 230, width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', ...rise(out(frame, 60, 80)) }}>
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        <div style={{ position: 'absolute', inset: 0 }}><Symbol name="computer" colour={B.brand2} size={300} /></div>
        <div style={{ position: 'absolute', left: 95, top: 62 }}><LitEmblemView frame={frame} width={110} from={70} /></div>
      </div>
      <div style={{ ...font, fontSize: 34, fontWeight: 750, color: C.text, textAlign: 'center' }}>Local models</div>
    </div>
    <div style={{ position: 'absolute', left: 1080, top: 520, ...rise(out(frame, 160, 180)) }}><Symbol name="lock" colour={B.brand4} size={80} /></div>
    <Node x={1530} y={380} name="cloud" label="Cloud, low load" colour={B.brand2} k={out(frame, 280, 300)} size={150} />
  </Scene>;
}

/** The bridge to the product: the GENESIS mark, then the demonstration begins with the chat screen. */
/** The film's first seconds, music only: the light rises, the emblem lights up, the name and what it does. */
function Intro() {
  const frame = useSceneFrame();
  return <AbsoluteFill style={{ background: C.page }}>
    <SunriseView frame={frame} k={.15 + .45 * ease(frame, 0, 120)} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
      <LitEmblemView frame={frame} width={340} from={10} />
      <div style={{ ...font, ...rise(out(frame, 40, 70)), fontSize: 96, fontWeight: 800, letterSpacing: '.06em', background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</div>
      <div style={{ ...font, ...rise(out(frame, 70, 96)), fontSize: 40, fontWeight: 600, color: C.text }}>RF chip design, automated with AI.</div>
    </div>
  </AbsoluteFill>;
}

function Demo() {
  const frame = useSceneFrame();
  return <AbsoluteFill style={{ background: C.page }}>
    <SunriseView frame={frame} k={.5} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
      <LitEmblemView frame={frame} width={320} from={2} />
      <div style={{ ...font, ...rise(out(frame, 30, 52)), fontSize: 60, fontWeight: 750, color: C.text, letterSpacing: '-.01em' }}>Now to the demonstration.</div>
    </div>
  </AbsoluteFill>;
}

/** The team: both founders side by side in one window. */
function Team() {
  const frame = useSceneFrame(), { islam, mehmet } = FOUNDERS;
  const column = (person: typeof ISLAM, colour: string, facts: typeof islam, from: number) => {
    const k = out(frame, from, from + 22);
    return <div style={{ ...font, flex: 1, display: 'flex', flexDirection: 'column', gap: 16, opacity: k }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ flex: 'none', width: 170, height: 190, borderRadius: 24, padding: 4, background: `linear-gradient(160deg, ${colour}, ${alpha(colour, .15)})`, boxShadow: `0 0 ${40 * k}px ${alpha(colour, .35)}` }}>
          <Img src={staticFile(person.image.replace(/^\//, ''))} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20, display: 'block' }} />
        </div>
        <div>
          <div style={{ ...rise(k), fontSize: 50, fontWeight: 800, color: C.text, letterSpacing: '-.015em' }}>{person.name}</div>
          <div style={{ ...rise(out(frame, from + 10, from + 30)), fontSize: 26, fontWeight: 650, color: colour, marginTop: 6 }}>{person.role}</div>
        </div>
      </div>
      {facts.intro.map((l, i) => <div key={l} style={{ ...rise(out(frame, from + 30 + i * 30, from + 50 + i * 30)), fontSize: 32, fontWeight: 500, color: C.text, lineHeight: 1.35 }}>{l}</div>)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>{facts.places.map((p, i) => <Chip key={p} colour={colour} k={out(frame, from + 30 + facts.intro.length * 30 + i * 8, from + 46 + facts.intro.length * 30 + i * 8)}>{p}</Chip>)}</div>
    </div>;
  };
  const together = out(frame, 400, 420);
  return <Scene chapter="Team" captions={[[0, 'We are the founders of GENESIS, and we build *the AI that designs RF chips*.'], [220, 'We bring *more than ten years* of millimeter-wave chip design in the industry, and the experience of *founding a chip startup*.']]}>
    <div style={{ position: 'absolute', left: 100, right: 100, top: 60, display: 'flex', gap: 70 }}>
      {column(ISLAM, B.brand1, islam, 0)}
      <div style={{ width: 2, background: alpha(C.border, .8) }} />
      {column(MEHMET, B.brand3, mehmet, 220)}
    </div>
    <div style={{ ...font, ...rise(together), position: 'absolute', left: 0, right: 0, top: 740, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
      <LitEmblemView frame={frame} width={70} from={400} />
      <div style={{ fontSize: 34, fontWeight: 500, color: C.text }}>
        <Marked text="Together, we build *GENESIS end to end*" /><span style={{ color: C.muted }}> · </span>
        <span style={{ color: B.brand2, fontWeight: 800 }}>{count(islam.citations + mehmet.citations, frame, 410)}</span> citations
      </div>
    </div>
  </Scene>;
}

/** The close: the three points to remember. */
function Close() {
  const frame = useSceneFrame(), points = ['Chip design, automated with AI', 'Ready to manufacture', 'Hours instead of weeks'];
  return <AbsoluteFill style={{ background: C.page }}>
    <SunriseView frame={frame} k={.6} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44 }}>
      <LitEmblemView frame={frame} width={300} from={4} />
      <div style={{ display: 'flex', gap: 28 }}>{points.map((p, i) => <span key={p} style={{ ...font, ...rise(out(frame, 20 + i * 14, 40 + i * 14)), padding: '16px 32px', borderRadius: 999, fontSize: 36, fontWeight: 700, color: C.text,
        background: alpha(COLOURS[i], .12), border: `2px solid ${alpha(COLOURS[i], .6)}` }}>{p}</span>)}</div>
    </div>
  </AbsoluteFill>;
}

const SCENES: Record<FundProps['part'], [string, number, (props: FundProps) => ReactNode][]> = {
  head: [['intro', 165, Intro], ['opening', 600, Opening], ['team', 480, Team], ['problem', 450, Problem], ['mmwave', 500, MillimeterWave], ['approach', 390, Approach], ['demo', 120, Demo]],
  tail: [['customers', 270, Customers], ['value', 280, Value], ['revenue', 420, Revenue], ['why-now', 180, WhyNow], ['close', 150, Close]],
};
/** The scenes of a part with their film lengths: the narration's timing where there is one, else the design length. */
const scenes = (part: FundProps['part'], timing: Timing | null) => SCENES[part].map(([id, frames, View]) => [id, timing?.[id]?.frames ?? frames, View] as const);
export const fundFrames = (part: FundProps['part'], timing: Timing | null = null) =>
  scenes(part, timing).reduce((n, [, f]) => n + f, 0) - FADE * (SCENES[part].length - 1);

export function FundIntro(props: FundProps) {
  return <AbsoluteFill><TransitionSeries>
    {scenes(props.part, props.timing).flatMap(([id, frames, View], i) => [
      ...(i ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />] : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={frames}>
        <SceneBeats.Provider value={props.timing?.[id]?.beats}><View {...props} /></SceneBeats.Provider>
      </TransitionSeries.Sequence>,
    ])}
  </TransitionSeries></AbsoluteFill>;
}
