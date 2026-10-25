import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { Caption } from './AppScene';
import { C, GRADIENT } from './Brand';
import { OptimizeView, SParamPlots, type Optimize, type SParams } from './story/Analysis';
import { blockCentres, BlockView, type BlockLinks } from './story/BlockView';
import { LitEmblem, Sunrise } from './story/Landing';
import { fit, mix, Schematic, type Drawing } from './story/Schematic';
import { FPS } from './storyboard';

// The 2D story film: an illustration of the GENESIS flow drawn from records. The conversation and the four schematics
// come from recorded takes, the testbenches and the signoff from the chip's config and verify record, and the layout
// from the chip's GDS as the 3D viewer reads it (story/collect.mjs and story/layout_layers.mjs write the inputs).
export type StoryData = {
  prompt: string;
  conversation: { message: string; choices: string[]; answer: { card?: string; text?: string } | null }[];
  schematics: Drawing[];
  testbenches: { name: string; cell: string; modes: string[]; ports: number; states: string[] }[];
  outputs: string[];
  signoff: { status: string; drc: boolean; lvs: boolean; gds_sha256: string };
};
export type LayoutData = {
  die: [number, number, number, number]; width: number; height: number; files: Record<string, { file: string; boxes: number }>;
  stages: string[]; layers: { name: string; color: string; z_um: number }[];
  blocks: { name: string; box: [number, number, number, number] }[];
  members: { block: string; member: string; cell: string; box: [number, number, number, number] }[];
};
/** A further circuit's clean layout (story/circuit_layouts.mjs): its drawn layers and its signoff records. */
export type CircuitLayout = Pick<LayoutData, 'die' | 'width' | 'height' | 'files' | 'blocks'> & {
  id: string; signoff: { status: string; drc_violations: number; drc_rule_checks: number; lvs: string; density_markers: number; gds_sha256: string };
};
export type StoryProps = { story: StoryData | null; layout: LayoutData | null; links: BlockLinks | null; sparams: SParams | null; optimize: Optimize | null; circuits: { circuits: CircuitLayout[] } | null };

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const out = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const BLOCK_COLOURS = ['#41dce8', '#b08af4', '#f5a623', '#6fe0a5', '#ff7aa8', '#6fb9ed', '#ffd166', '#9be15d', '#ff9f6e', '#c9a7ff'];
const MODES: Record<string, string> = { dc: 'DC operating point', sp: 'S-parameters', hb: 'Harmonic balance', tran: 'Transient', ac: 'AC', noise: 'Noise', pss: 'Periodic steady state' };
const STAGES: Record<string, string> = { essentials: 'Essentials', interconnect: 'RF lines', drops: 'Drops', dc_lines: 'DC lines', gnd_tiling: 'GND tiling', density: 'Density fill' };
const TRANSITION = 12;
// Content stays above the caption band. From the proposal on, the circuit always sits on the right (CIRCUIT) and the
// words and plots about it on the left (PANEL); the circuit's view only moves forward: schematic, blocks, testbench,
// layout, 3D.
const CIRCUIT = { left: 790, top: 30, width: 1040, height: 700 };
const PANEL = { left: 96, top: 40, width: 640 };
// The blocks and the testbench sit lower, with room above for the DC sources and below for a port.
const BENCH = { x: CIRCUIT.left + 40, y: 95, w: CIRCUIT.width - 80, h: 660 };

/** Scenes in order, in seconds. */
const SCENES = [
  ['ask', 14], ['schematic', 6.5], ['blocks', 8], ['testbench', 13], ['optimize', 15], ['layout', 15], ['signoff', 4.5], ['chip3d', 7], ['any', 9], ['end', 5.5],
] as const;
export const storyFrames = () => SCENES.reduce((n, [, s]) => n + Math.round(s * FPS), 0) - TRANSITION * (SCENES.length - 1);

export const storyMetadata: CalculateMetadataFunction<StoryProps> = async () => {
  const [story, layout, links, sparams, optimize, circuits] = await Promise.all(['story.json', 'layout.json', 'blocks.json', 'sparams.json', 'optimize.json', 'circuit_layouts.json'].map(async f => (await fetch(staticFile(f))).json()));
  return { durationInFrames: storyFrames(), props: { story, layout, links, sparams, optimize, circuits } };
};

function Wordmark({ size }: { size: number }) {
  return <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: size, letterSpacing: '.08em', background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</div>;
}

/** The caption band: a chapter chip and the caption, switching at the given frames. */
function Band({ chapter, captions }: { chapter: string; captions: [number, string][] }) {
  const frame = useCurrentFrame(), k = out(frame, 4, 16);
  return <>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, opacity: k, background: 'linear-gradient(180deg, #04132500 0%, #041325cc 45%, #041325f2 100%)' }} />
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 74, opacity: k }}>
      <div style={{ marginBottom: 18, fontFamily: 'Inter', fontWeight: 600, fontSize: 24, letterSpacing: '.18em', textTransform: 'uppercase', color: C.cyan }}>{chapter}</div>
      {captions.map(([from, text], i) => <Sequence key={i} from={from} durationInFrames={i < captions.length - 1 ? captions[i + 1][0] - from : undefined} layout="none"><Caption text={text} /></Sequence>)}
    </div>
  </>;
}

/** Words of a text revealed one after another from `from`, `rate` words per frame. */
const reveal = (text: string, frame: number, from: number, rate = .9) => text.split(' ').slice(0, Math.max(0, Math.floor((frame - from) * rate))).join(' ');

function Bubble({ who, children, k }: { who: 'user' | 'genesis'; children: React.ReactNode; k: number }) {
  const user = who === 'user';
  return <div style={{ alignSelf: user ? 'flex-end' : 'flex-start', maxWidth: user ? 1000 : 1400, opacity: k, transform: `translateY(${(1 - k) * 18}px)`,
    padding: '18px 26px', borderRadius: 22, fontFamily: 'Inter', fontSize: 34, lineHeight: 1.4, color: C.text,
    background: user ? '#163a5c' : C.surface, border: `1px solid ${user ? '#2f6a96' : C.border}`, boxShadow: '0 12px 40px #0006' }}>
    {!user && <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 20, letterSpacing: '.12em' }}><span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span></div>}
    {children}
  </div>;
}

/** The landing page and the conversation: the prompt is typed and sent, GENESIS answers with its question and choice
 * cards, the recorder's choice is taken and GENESIS proposes the schematic: its proposal stays on the left and the
 * chosen topology draws itself on the right. */
function Ask({ story }: { story: StoryData }) {
  const frame = useCurrentFrame(), sent = 118;
  const typed = story.prompt.slice(0, Math.floor(interpolate(frame, [62, 108], [0, story.prompt.length], clamp)));
  const box = out(frame, 34, 58), title = 1 - ease(frame, sent, sent + 18);
  // Each reply and answer gets a start frame; replies are revealed word by word.
  const items: { at: number; node: (k: number) => React.ReactNode }[] = [{ at: sent + 4, node: k => <Bubble who="user" k={k}>{story.prompt}</Bubble> }];
  let at = sent + 26;
  for (const turn of story.conversation) {
    const start = at, words = turn.message.split(' ').length;
    items.push({ at: start, node: k => <Bubble who="genesis" k={k}>{reveal(turn.message, frame, start)}</Bubble> });
    at = start + words / .9 + 8;
    if (turn.choices.length) {
      const cardsAt = at, chosen = turn.answer?.card, pickAt = cardsAt + 40;
      items.push({ at: cardsAt, node: k => <div style={{ display: 'flex', gap: 16, opacity: k }}>{turn.choices.map((c, i) => {
        const on = c === chosen ? out(frame, pickAt, pickAt + 10) : 0, ki = out(frame, cardsAt + i * 4, cardsAt + i * 4 + 12);
        return <div key={c} style={{ padding: '18px 28px', borderRadius: 16, fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text, opacity: ki,
          transform: `translateY(${(1 - ki) * 14}px) scale(${1 + on * .05})`, background: mix('#091d32', '#12405a', on), border: `2px solid ${mix('#20364b', '#41dce8', on)}` }}>{c}</div>;
      })}</div> });
      at = pickAt + 22;
    }
    if (turn.answer?.text) { const t = turn.answer.text; items.push({ at, node: k => <Bubble who="user" k={k}>{t}</Bubble> }); at += 26; }
  }
  const proposal = story.conversation[story.conversation.length - 1].message, chosen = story.conversation.find(t => t.answer?.card)?.answer?.card;
  const turnAt = at + 10, turn = ease(frame, turnAt, turnAt + 18);
  // The column scrolls so the newest item stays above the caption band.
  const shown = items.filter(i => i.at <= frame).length;
  const scroll = interpolate(frame, [sent + 120, sent + 150], [0, 160], clamp) * (shown > 3 ? 1 : 0);
  return <AbsoluteFill style={{ background: C.page }}>
    <Sunrise k={1 - .55 * ease(frame, sent, sent + 30)} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 66 - (1 - title) * 60, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: title }}>
      <LitEmblem width={240} />
      <div style={{ marginTop: 18, opacity: out(frame, 14, 40), filter: `blur(${(1 - out(frame, 14, 40)) * 7}px)`, transform: `translateY(${(1 - out(frame, 14, 40)) * 3}px)` }}><Wordmark size={120} /></div>
      <div style={{ marginTop: 12, fontFamily: 'Inter', fontSize: 34, color: C.muted, opacity: out(frame, 14, 40) }}>Whatever you want to design.</div>
    </div>
    <div style={{ position: 'absolute', left: 260, width: 1400, top: 56 - scroll, display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 - turn }}>
      {items.map((item, i) => frame >= item.at && <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>{item.node(out(frame, item.at, item.at + 12))}</div>)}
    </div>
    <div style={{ position: 'absolute', left: 360, width: 1200, top: interpolate(box, [0, 1], [640, 560]) + ease(frame, sent, sent + 24) * 320, opacity: box * (1 - ease(frame, sent, sent + 20)),
      padding: '26px 30px', borderRadius: 24, background: '#0b2238ee', border: `1.5px solid ${mix('#20364b', '#41dce8', out(frame, 60, 70))}`, boxShadow: '0 20px 60px #0008',
      fontFamily: 'Inter', fontSize: 32, color: typed ? C.text : C.muted }}>
      {typed || 'Describe your circuit…'}<span style={{ opacity: Math.floor(frame / 15) % 2 && frame < sent ? 1 : 0, color: C.cyan }}>|</span>
    </div>
    {frame >= turnAt && <>
      <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 40, width: PANEL.width, display: 'flex', opacity: out(frame, turnAt + 6, turnAt + 22) }}>
        <Bubble who="genesis" k={1}><span style={{ fontSize: 30 }}>{proposal}</span></Bubble>
      </div>
      <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}`, opacity: out(frame, turnAt + 4, turnAt + 20) }}>
        <div style={{ position: 'absolute', left: 30, top: 70, right: 30, bottom: 30 }}>
          <Schematic drawing={story.schematics[0]} width={CIRCUIT.width - 60} height={CIRCUIT.height - 100} t={interpolate(frame, [turnAt + 10, turnAt + 80], [0, 1], clamp)} />
        </div>
        {chosen && <div style={{ position: 'absolute', left: 22, top: 18, padding: '8px 18px', borderRadius: 999, background: '#12405a', border: '2px solid #41dce8', fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{chosen}</div>}
      </div>
    </>}
    <Band chapter="Ask" captions={[[0, ''], [58, 'Tell GENESIS what you want to design.'], [sent + 26, 'GENESIS asks what your circuit needs.'], [at - 20, 'GENESIS proposes the schematic.']]} />
  </AbsoluteFill>;
}

/** Block colours: the colouring groups of the drawing, in order, each with its members' labels. */
function blockColours(drawing: Drawing) {
  const byLabel = new Map<string, string>();
  Object.values(drawing.colouring).forEach((g, i) => g.members.forEach(m => byLabel.set(m, BLOCK_COLOURS[i % BLOCK_COLOURS.length])));
  return byLabel;
}

/** Screen boxes of the colouring groups, from their members' part positions. */
function groupBoxes(drawing: Drawing, w: number, h: number) {
  const { k, dx, dy } = fit(drawing, w, h);
  return Object.entries(drawing.colouring).map(([name, g], i) => {
    const parts = drawing.parts.filter(p => g.members.includes(p.label));
    if (!parts.length) return null;
    const xs = parts.map(p => p.x * k + dx), ys = parts.map(p => p.y * k + dy), pad = 46 * Math.max(k, .6);
    return { name, colour: BLOCK_COLOURS[i % BLOCK_COLOURS.length], x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad, cx: xs.reduce((a, b) => a + b) / xs.length, cy: ys.reduce((a, b) => a + b) / ys.length };
  }).filter(g => g !== null);
}

const KINDS: Record<string, [string, string]> = { port: ['port', 'ports'], nmos: ['transistor', 'transistors'], pmos: ['transistor', 'transistors'], inductor: ['inductor', 'inductors'],
  capacitor: ['capacitor', 'capacitors'], resistor: ['resistor', 'resistors'], vdc: ['DC source', 'DC sources'] };

/** The proposed schematic on the right, now on the PDK, and its parts by kind on the left: each kind lights its parts. */
function SchematicScene({ story }: { story: StoryData }) {
  const frame = useCurrentFrame(), drawing = story.schematics[0];
  const kinds = [...new Set(drawing.parts.map(p => p.kind))].filter(k => KINDS[k]);
  const step = 26, active = Math.floor((frame - 16) / step), lit = kinds[active];
  const colours = new Map(drawing.parts.filter(p => p.kind === lit).map(p => [p.label, '#41dce8']));
  return <AbsoluteFill style={{ background: C.page }}>
    <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ position: 'absolute', left: 30, top: 70, right: 30, bottom: 30 }}>
        <Schematic drawing={drawing} width={CIRCUIT.width - 60} height={CIRCUIT.height - 100} t={1} tint={lit ? 1 : 0} colours={colours} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 30, width: PANEL.width, fontFamily: 'Inter' }}>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 20 }}>{drawing.title} parts</div>
      {kinds.map((kind, i) => {
        const n = drawing.parts.filter(p => p.kind === kind).length, on = kind === lit, k = out(frame, 10 + i * step, 22 + i * step);
        return <div key={kind} style={{ opacity: k, display: 'flex', alignItems: 'baseline', gap: 18, padding: '10px 20px', marginBottom: 8, borderRadius: 14,
          background: on ? '#0f2c46' : 'transparent', border: `1px solid ${on ? '#41dce866' : 'transparent'}` }}>
          <span style={{ width: 60, textAlign: 'right', fontSize: 40, fontWeight: 700, color: on ? C.cyan : C.text }}>{n}</span>
          <span style={{ fontSize: 34, color: on ? C.text : C.muted }}>{KINDS[kind][n === 1 ? 0 : 1]}</span>
        </div>;
      })}
    </div>
    <Band chapter="Schematic" captions={[[0, 'GENESIS draws the schematic on your PDK.']]} />
  </AbsoluteFill>;
}

/** The schematic's block groups, then the chip's blocks as one symbolic floorplan: a hierarchy of blocks and members on
 * the left, glyph cards with the pads at their places on the die, joined by the RF lines and the DC nets. */
function BlocksScene({ story, layout, links }: { story: StoryData; layout: LayoutData; links: BlockLinks }) {
  const frame = useCurrentFrame(), drawing = story.schematics[0], colours = blockColours(drawing), tint = ease(frame, 4, 34);
  const away = ease(frame, 40, 62), chip = new Map(layout.blocks.map((b, i) => [b.name, BLOCK_COLOURS[i % BLOCK_COLOURS.length]]));
  const sw = CIRCUIT.width - 60, sh = CIRCUIT.height - 100;
  return <AbsoluteFill style={{ background: C.page }}>
    <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}`, opacity: 1 - away }}>
      <div style={{ position: 'absolute', left: 30, top: 70, width: sw, height: sh }}>
        <svg width={sw} height={sh} style={{ position: 'absolute', overflow: 'visible' }}>
          {groupBoxes(drawing, sw, sh).map((g, i) => {
            const k = out(frame, 10 + i * 2, 24 + i * 2);
            return <g key={g.name} opacity={k}>
              <rect x={g.x0} y={g.y0} width={g.x1 - g.x0} height={g.y1 - g.y0} rx={14} fill={g.colour} fillOpacity={.08} stroke={g.colour} strokeOpacity={.7} strokeWidth={2} strokeDasharray="8 6" />
              <text x={g.x0 + 10} y={g.y0 - 10} fontFamily="Inter" fontWeight={650} fontSize={24} fill={g.colour}>{g.name.replace(/_/g, ' ')}</text>
            </g>;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0 }}><Schematic drawing={drawing} width={sw} height={sh} t={1} tint={tint} colours={colours} labels={false} /></div>
      </div>
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, fontFamily: 'Inter', opacity: out(frame, 50, 66) }}>
      <div style={{ fontWeight: 700, fontSize: 34, color: C.text, marginBottom: 14 }}>Chip C1 blocks</div>
      {layout.blocks.map((b, i) => {
        const k = out(frame, 56 + i * 3, 68 + i * 3), members = layout.members.filter(m => m.block === b.name);
        return <div key={b.name} style={{ opacity: k, transform: `translateX(${(1 - k) * -20}px)`, display: 'flex', alignItems: 'center', gap: 14, padding: '7px 0 7px 16px', borderLeft: `2px solid ${C.border}` }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, background: chip.get(b.name), flex: 'none' }} />
          <span style={{ fontWeight: 600, fontSize: 28, color: C.text, width: 290 }}>{b.name.replace(/_/g, ' ')}</span>
          <span style={{ fontSize: 24, color: C.muted, fontFamily: 'ui-monospace, monospace' }}>{members.length > 4 ? `${members.length} members` : members.map(m => m.member.replace(/^PAD_/, '')).join(' ')}</span>
        </div>;
      })}
    </div>
    <BlockView layout={layout} links={links} colours={chip} frame={frame} x={BENCH.x} y={BENCH.y} w={BENCH.w} h={BENCH.h} start={54} />
    <Band chapter="Blocks" captions={[[0, 'GENESIS splits it into layout blocks.'], [60, 'Chip C1 in blocks: pads, RF lines and bias nets.']]} />
  </AbsoluteFill>;
}

/** The testbench is built on the blocks: the view pulls back, ports land on the RF pads and sources on the DC pads, the
 * testbenches are listed on the left, then the S-parameter plots replace them. */
function TestbenchScene({ story, layout, links, sparams }: { story: StoryData; layout: LayoutData; links: BlockLinks; sparams: SParams }) {
  const frame = useCurrentFrame(), plots = 150, gone = ease(frame, plots - 16, plots);
  const chip = new Map(layout.blocks.map((b, i) => [b.name, BLOCK_COLOURS[i % BLOCK_COLOURS.length]]));
  return <AbsoluteFill style={{ background: C.page }}>
    <BlockView layout={layout} links={links} colours={chip} frame={frame} start={-200} bench={out(frame, 16, 60)} {...BENCH} />
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 - gone }}>
      {story.testbenches.map((tb, i) => {
        const k = out(frame, 30 + i * 14, 46 + i * 14);
        return <div key={tb.name} style={{ opacity: k, transform: `translateX(${(1 - k) * -40}px)`, padding: '22px 26px', borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, fontFamily: 'Inter' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 34, color: C.text }}>{tb.modes.map(m => MODES[m] ?? m).join(' + ')}</span>
            <span style={{ fontSize: 26, color: C.muted }}>{tb.ports} ports</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{tb.states.map(s =>
            <span key={s} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 26, color: C.cyan, border: '1px solid #41dce855' }}>{s.replace(/_/g, ' ')}</span>)}</div>
        </div>;
      })}
    </div>
    {frame >= plots - 10 && <SParamPlots sparams={sparams} frame={frame} x={PANEL.left} y={PANEL.top - 10} w={PANEL.width} h={CIRCUIT.height} start={plots} />}
    <Band chapter="Testbench" captions={[[0, 'GENESIS builds every testbench and measurement.'], [plots, 'GENESIS runs the analyses and plots every S-parameter.']]} />
  </AbsoluteFill>;
}

/** The optimizer runs on the left, one after another; on the right the testbench gives way to the blocks, with the
 * coils and transistors the runs tune lit. */
function OptimizeScene({ layout, links, optimize }: { layout: LayoutData; links: BlockLinks; optimize: Optimize }) {
  const frame = useCurrentFrame(), back = 1 - ease(frame, 0, 30);
  const chip = new Map(layout.blocks.map((b, i) => [b.name, BLOCK_COLOURS[i % BLOCK_COLOURS.length]]));
  return <AbsoluteFill style={{ background: C.page }}>
    <BlockView layout={layout} links={links} colours={chip} frame={frame} start={-200} bench={back} focus={{ kinds: ['inductor', 'transistor'], k: out(frame, 24, 44) }} {...BENCH} />
    <OptimizeView optimize={optimize} frame={frame} x={PANEL.left} y={PANEL.top - 10} w={PANEL.width} phases={[[16, 156], [156, 296], [296, 446]]} />
    <Band chapter="Optimization" captions={[[0, 'GENESIS tunes coil pixels, coil shapes and transistor sizes.'], [156, 'Each step is one recorded evaluation.']]} />
  </AbsoluteFill>;
}

/** The layout's box on screen and the map from microns to it. */
function layoutFrame(layout: LayoutData, left: number, top: number, height: number) {
  const [x0, y0, x1, y1] = layout.die, width = height * (x1 - x0) / (y1 - y0);
  return { left, top, width, height, px: (x: number) => (x - x0) / (x1 - x0) * width, py: (y: number) => (y1 - y) / (y1 - y0) * height };
}
const image = (layout: Pick<LayoutData, 'files'>, key: string) => layout.files[key] ? staticFile(layout.files[key].file) : null;
const wipe = (k: number) => `inset(0 ${100 - k * 100}% 0 0)`;

/** Stage times in the layout scene (frames): the floorplanner's stages run in their order. */
const STAGE_AT: Record<string, [number, number]> = { essentials: [24, 120], interconnect: [130, 175], drops: [186, 236], dc_lines: [292, 336], gnd_tiling: [346, 392], density: [398, 436] };

/** All stage layers of the chip, bottom to top: ground tiles and fill (dimmed, so the blocks stay readable), then the blocks (`blocks`, or the essentials layer),
 * then the routes, as the viewer draws them. */
function Chip({ layout, frame, staged, blocks }: { layout: Pick<LayoutData, 'files'>; frame: number; staged: boolean; blocks?: React.ReactNode }) {
  const at = (stage: string) => staged ? ease(frame, ...STAGE_AT[stage]) : 1;
  const img = (key: string, k: number, opacity = 1) => image(layout, key) && <Img key={key} src={image(layout, key)!} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, clipPath: wipe(k) }} />;
  return <>
    {img('stage_gnd_tiling', at('gnd_tiling'), .35)}
    {img('stage_density', at('density'), .3)}
    {blocks ?? img('stage_essentials', 1)}
    {img('stage_interconnect', at('interconnect'))}
    {img('stage_drops', at('drops'))}
    {img('stage_dc_lines', at('dc_lines'))}
  </>;
}

/** The chip's layout box on the right. */
const chipFrame = (layout: LayoutData) => {
  const [x0, y0, x1, y1] = layout.die, w = Math.min(CIRCUIT.width, CIRCUIT.height * (x1 - x0) / (y1 - y0)), h = w * (y1 - y0) / (x1 - x0);
  return layoutFrame(layout, CIRCUIT.left + (CIRCUIT.width - w) / 2, CIRCUIT.top + (CIRCUIT.height - h) / 2, h);
};

function LayoutScene({ layout, links }: { layout: LayoutData; links: BlockLinks }) {
  const frame = useCurrentFrame(), f = chipFrame(layout);
  const chip = new Map(layout.blocks.map((b, i) => [b.name, BLOCK_COLOURS[i % BLOCK_COLOURS.length]]));
  // Each layout block flies in from its card in the block view, which stands where the chip will be.
  const cards = blockCentres(layout, BENCH.x, BENCH.y, BENCH.w, BENCH.h);
  const flights = layout.blocks.map((b, i) => {
    const cx = f.px((b.box[0] + b.box[2]) / 2), cy = f.py((b.box[1] + b.box[3]) / 2), card = cards.get(b.name);
    const from = card ? [card[0] - f.left, card[1] - f.top] : [cx, cy];
    return { block: b.name, cx, cy, from, matched: true, k: ease(frame, 22 + i * 6, 70 + i * 6) };
  });
  const blocks = 1 - ease(frame, 26, 70);
  // The camera pushes in on the switch core while the drops are drawn.
  const core = layout.blocks.find(b => b.name === 'switch_fets')?.box;
  const zoom = ease(frame, 176, 204) * (1 - ease(frame, 250, 282));
  const zx = core ? f.px((core[0] + core[2]) / 2) : f.width / 2, zy = core ? f.py((core[1] + core[3]) / 2) : f.height / 2, scale = 1 + 3.2 * zoom;
  const active = Object.entries(STAGE_AT).filter(([, [a]]) => frame >= a).pop()?.[0];
  return <AbsoluteFill style={{ background: C.page }}>
    <div style={{ position: 'absolute', inset: 0, opacity: blocks }}>
      <BlockView layout={layout} links={links} colours={chip} frame={frame} start={-200} {...BENCH} />
    </div>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, overflow: 'hidden', borderRadius: 10,
      boxShadow: `0 0 0 1px ${C.border}`, opacity: out(frame, 20, 40) }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${zx}px ${zy}px`, transform: `translate(${(f.width / 2 - zx) * zoom}px, ${(f.height / 2 - zy) * zoom}px) scale(${scale})` }}>
        <Chip layout={layout} frame={frame} staged blocks={flights.map(fl => image(layout, `block_${fl.block}`) && <Img key={fl.block} src={image(layout, `block_${fl.block}`)!} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: fl.matched ? Math.min(1, fl.k * 2.5) : fl.k, transformOrigin: `${fl.cx}px ${fl.cy}px`,
          transform: `translate(${(fl.from[0] - fl.cx) * (1 - fl.k)}px, ${(fl.from[1] - fl.cy) * (1 - fl.k)}px) scale(${.45 + .55 * fl.k})` }} />)} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 40, width: PANEL.width, fontFamily: 'Inter', opacity: out(frame, 70, 96) }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 18 }}>Floorplanner stages</div>
      {layout.stages.map(stage => {
        const on = stage === active, done = frame >= STAGE_AT[stage][1];
        return <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', marginBottom: 8, borderRadius: 14,
          background: on ? '#0f2c46' : 'transparent', border: `1px solid ${on ? '#41dce866' : 'transparent'}`, fontSize: 32, fontWeight: on ? 700 : 500, color: on || done ? C.text : C.muted }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: done ? C.cyan : on ? GRADIENT : '#ffffff22' }} />{STAGES[stage] ?? stage}
        </div>;
      })}
    </div>
    <Band chapter="Layout" captions={[[0, 'GENESIS turns the blocks into a layout.'], [130, 'GENESIS routes RF lines, drops and DC lines.'], [340, 'GENESIS tiles the ground and fills density.']]} />
  </AbsoluteFill>;
}

function SignoffScene({ story, layout }: { story: StoryData; layout: LayoutData }) {
  const frame = useCurrentFrame(), f = chipFrame(layout), scan = interpolate(frame, [8, 62], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const checks = [['Calibre DRC', story.signoff.drc], ['Calibre LVS', story.signoff.lvs]] as const;
  return <AbsoluteFill style={{ background: C.page }}>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, overflow: 'hidden', borderRadius: 10, boxShadow: `0 0 0 1px ${C.border}` }}>
      <Chip layout={layout} frame={frame} staged={false} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan * 100}%`, width: 6, marginLeft: -3, opacity: scan < 1 ? 1 : 0, background: C.cyan, boxShadow: '0 0 40px 14px #41dce888' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${scan * 100}%`, background: '#41dce80d' }} />
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 80, width: PANEL.width, display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter' }}>
      {checks.map(([name, ok], i) => {
        const k = out(frame, 50 + i * 10, 64 + i * 10);
        return <div key={name} style={{ opacity: k, transform: `scale(${.9 + .1 * k})`, transformOrigin: 'left', display: 'flex', alignItems: 'center', gap: 18, padding: '20px 26px', borderRadius: 18, background: C.surface, border: `1px solid ${ok ? '#6fe0a566' : '#ff7aa866'}` }}>
          <span style={{ fontSize: 40, color: ok ? '#6fe0a5' : '#ff7aa8' }}>{ok ? '✓' : '✗'}</span>
          <span style={{ fontSize: 34, fontWeight: 700, color: C.text }}>{name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 26, color: ok ? '#6fe0a5' : '#ff7aa8' }}>{ok ? 'clean' : 'open'}</span>
        </div>;
      })}
      <div style={{ opacity: out(frame, 76, 90), fontFamily: 'ui-monospace, monospace', fontSize: 24, color: C.muted }}>GDS sha256 {story.signoff.gds_sha256.slice(0, 16)}…</div>
    </div>
    <Band chapter="Signoff" captions={[[0, 'GENESIS checks it with Calibre DRC and LVS.']]} />
  </AbsoluteFill>;
}

/** The chip's metal layers, lifted apart in z order: the same top-down layers, tilted into 3D on the right, while the
 * layer names on the left light up as their layer lifts. */
function Chip3DScene({ layout }: { layout: LayoutData }) {
  const frame = useCurrentFrame(), tilt = ease(frame, 4, 64), lift = ease(frame, 40, 130), spin = interpolate(frame, [0, 210], [0, -14]);
  const layers = layout.layers.filter(l => layout.files[`layer_${l.name}`]), c = chipFrame(layout);
  // The tilted stack spreads wider than the flat chip, so it starts smaller.
  const f = { left: c.left + c.width * .14, top: c.top + c.height * .18, width: c.width * .72, height: c.height * .72 };
  return <AbsoluteFill style={{ background: C.page, perspective: 3200 }}>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top, width: PANEL.width, fontFamily: 'Inter', display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
      {layers.map((l, i) => { const k = out(frame, 40 + i * 6, 52 + i * 6);
        return <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: .35 + .65 * k, fontSize: 30, fontWeight: 600, color: C.text }}>
          <span style={{ width: 22, height: 22, borderRadius: 5, background: l.color }} />{l.name}
        </div>; })}
    </div>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, transformStyle: 'preserve-3d',
      transform: `rotateX(${56 * tilt}deg) rotateZ(${(-28 + spin) * tilt}deg) scale(${1 - .12 * tilt})` }}>
      {layers.map((l, i) => <Img key={l.name} src={image(layout, `layer_${l.name}`)!} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
        transform: `translateZ(${i * 30 * lift}px)`, opacity: .93 }} />)}
    </div>
    <Band chapter="3D" captions={[[0, 'GENESIS builds your chip in 3D.']]} />
  </AbsoluteFill>;
}

/** The four recorded circuits, each drawn from its schematic; a circuit with a clean layout then turns into it, with its signoff. */
function AnyScene({ story, circuits }: { story: StoryData; circuits: CircuitLayout[] }) {
  const frame = useCurrentFrame(), gap = 24, top = 30, w = (1920 - 3 * gap) / 2, h = (1080 - 300 - top - gap) / 2;
  const turn = out(frame, 140, 162);
  return <AbsoluteFill style={{ background: C.page }}>
    {story.schematics.map((d, i) => {
      const k = out(frame, i * 6, i * 6 + 16);
      return <div key={d.id} style={{ position: 'absolute', left: gap + (i % 2) * (w + gap), top: top + Math.floor(i / 2) * (h + gap), width: w, height: h, borderRadius: 18,
        background: C.surface, border: `1px solid ${C.border}`, opacity: k, transform: `scale(${.95 + .05 * k})`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 40, top: 56, width: w - 80, height: h - 80 }}>
          <Schematic drawing={d} width={w - 80} height={h - 80} t={interpolate(frame, [10 + i * 8, 130 + i * 8], [0, 1], clamp)} labels={false} />
        </div>
        {(() => {
          const c = circuits.find(c => c.id === d.id);
          if (!c) return null;
          // The view crops the die to its blocks with a 15 µm margin of ground tiles around them.
          const [x0, , x1, y1] = c.die, m = 15, bx0 = Math.min(...c.blocks.map(b => b.box[0])) - m, by0 = Math.min(...c.blocks.map(b => b.box[1])) - m;
          const bx1 = Math.max(...c.blocks.map(b => b.box[2])) + m, by1 = Math.max(...c.blocks.map(b => b.box[3])) + m;
          const lh = h - 150, lw = Math.min(w - 80, lh * (bx1 - bx0) / (by1 - by0)), px = lw / (bx1 - bx0), s = c.signoff;
          const facts = [`DRC ${s.drc_violations}`, s.lvs === 'LVS_CORRECT' ? 'LVS correct' : s.lvs, `density ${s.density_markers}`];
          return <div style={{ position: 'absolute', inset: 0, background: C.surface, opacity: turn }}>
            <div style={{ position: 'absolute', left: (w - lw) / 2, top: 84 + (lh - (by1 - by0) * px) / 2, width: lw, height: (by1 - by0) * px, overflow: 'hidden', borderRadius: 8, boxShadow: `0 0 0 1px ${C.border}` }}>
              <div style={{ position: 'absolute', left: (x0 - bx0) * px, top: (by1 - y1) * px, width: (x1 - x0) * px, height: c.height / c.width * (x1 - x0) * px }}><Chip layout={c} frame={frame} staged={false} /></div>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', fontFamily: 'Inter', fontSize: 22, color: C.muted }}>{c.blocks.map(b => b.name.replace(/_/g, ' ')).join(', ')} · layout from the GDS</div>
            <div style={{ position: 'absolute', right: 16, top: 14, display: 'flex', gap: 10 }}>
              {facts.map((t, j) => <div key={t} style={{ opacity: out(frame, 158 + j * 6, 170 + j * 6), padding: '8px 14px', borderRadius: 999, border: '1px solid #6fe0a566', background: '#041325d9', fontFamily: 'Inter', fontWeight: 650, fontSize: 22, color: '#6fe0a5' }}>✓ {t}</div>)}
            </div>
          </div>;
        })()}
        <div style={{ position: 'absolute', left: 16, top: 14, padding: '8px 16px', borderRadius: 999, background: '#041325d9', border: `1px solid ${C.border}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{d.title}</div>
      </div>;
    })}
    <Band chapter="Any circuit" captions={[[0, 'GENESIS designs any circuit you want.'], [150, 'GENESIS lays out the mixer and checks it with Calibre.']]} />
  </AbsoluteFill>;
}

function EndScene() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: C.page }}>
    <Sunrise />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LitEmblem width={360} from={6} />
      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: out(frame, 18, 46), transform: `translateY(${(1 - out(frame, 18, 46)) * 24}px)` }}><Wordmark size={150} />
      <div style={{ marginTop: 18, fontFamily: 'Inter', fontSize: 44, color: C.text }}>Whatever you want to design.</div></div>
    </div>
  </AbsoluteFill>;
}

export function Story({ story, layout, links, sparams, optimize, circuits }: StoryProps) {
  if (!story || !layout || !links || !sparams || !optimize || !circuits) throw new Error('story.json, layout.json, blocks.json, sparams.json, optimize.json or circuit_layouts.json is missing from the public folder');
  const scene: Record<string, React.ReactNode> = {
    ask: <Ask story={story} />, schematic: <SchematicScene story={story} />, blocks: <BlocksScene story={story} layout={layout} links={links} />, testbench: <TestbenchScene story={story} layout={layout} links={links} sparams={sparams} />,
    optimize: <OptimizeScene layout={layout} links={links} optimize={optimize} />,
    layout: <LayoutScene layout={layout} links={links} />, signoff: <SignoffScene story={story} layout={layout} />, chip3d: <Chip3DScene layout={layout} />,
    any: <AnyScene story={story} circuits={circuits.circuits} />, end: <EndScene />,
  };
  return <TransitionSeries>
    {SCENES.flatMap(([id, seconds], i) => [
      ...(i ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />] : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={Math.round(seconds * FPS)}>{scene[id]}</TransitionSeries.Sequence>,
    ])}
  </TransitionSeries>;
}
