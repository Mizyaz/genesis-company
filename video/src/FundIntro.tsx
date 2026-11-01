import { type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { alpha, B, C, GRADIENT } from './Brand';
import { LitEmblemView, SunriseView } from '../../src/shared/story/landing';
import { Signature } from '../../src/shared/story/scenes-end';
import { CaptionBand } from '../../src/shared/story/scenes';
import { Chip3DView } from '../../src/shared/story/scenes-validation';
import { ease, out } from '../../src/shared/story/motion';
import site from '../../src/content/site.json';

// The opening of the team film for a fund application, for viewers outside the field: GENESIS, the two founders, why
// this team, what millimeter-wave is, why its layout is hard, why silicon is the bottleneck, and GENESIS against the
// hand process; the story film (GenesisStory) follows as a cut. Names, roles and claims come from the site's content,
// the founders' citation counts from their public scholar profiles (FOUNDERS), and the layout from a GENESIS chip's
// drawn layers (layout.json and layout/*.png in the inputs folder, as the story film reads them).

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

export type FundProps = { layout: { die: [number, number, number, number]; width: number; height: number; files: Record<string, { file: string }>; layers: { name: string }[] } | null };
export const fundMetadata: CalculateMetadataFunction<FundProps> = async ({ props }) =>
  ({ props: { ...props, layout: await (await fetch(staticFile('layout.json'))).json() } });

const FADE = 16;
/** The site's claims strip (ProcessCards' CLAIMS): layout and full design times. */
const CLAIMS = [{ value: '< 30 minutes', line: 'Automated layout, from schematic to finished layout' }, { value: '< 6 hours', line: 'Full design, with circuit simulations and optimization' }];
const [ISLAM, MEHMET] = site.about.people;
/** Public facts on the founders (read 2026-11-01): citations and publications from their scholar profiles, Mehmet's
 * industry, startup and degrees from his research-group page and his interview with the microwave society, İslam's
 * degree and group from his research-group page and his master's lab. A slot left null is a fact no public page
 * confirms; it shows nothing until it is filled. */
const FOUNDERS = {
  islam: { citations: 253, publications: 'Multi-drone networks, radar signal classification, and RF circuit design with learning',
    intro: ['PhD researcher at Université catholique de Louvain.', 'He builds GENESIS end to end: learning systems that design RF circuits and their layout.'],
    academic: ["Master's in electrical engineering, Özyeğin University, 2024", 'Networked and Autonomous Systems Lab: multi-drone planning with reinforcement learning'],
    phd: 'PhD researcher, RF group, Université catholique de Louvain', advisor: null as string | null },
  mehmet: { citations: 400, publications: 31, chips: 13,
    intro: ['More than ten years designing millimeter-wave chips in industry, at Broadcom among others.', 'He founded a millimeter-wave startup from his PhD research, and holds an MBA.'],
    industry: ['Broadcom: millimeter-wave backhaul transceivers and a 60 GHz mesh chipset', 'Also Nokia Siemens Networks, Panasonic and Anokiwave'],
    startup: ['Founder, Radiofast Microsystems, from his PhD research', 'Winner, UC San Diego Entrepreneur Challenge'],
    education: ["Bachelor's in electrical engineering, Middle East Technical University, 2005", 'PhD in electrical engineering, UC San Diego, 2012', 'MBA, UC Irvine, Paul Merage School of Business, 2019'] },
};

const font: CSSProperties = { fontFamily: 'Inter' };
const rise = (k: number, px = 24): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * px}px)` });
const count = (n: number, frame: number, from: number) => Math.round(n * ease(frame, from, from + 40));

function Portrait({ person, size, colour, k }: { person: typeof ISLAM; size: number; colour: string; k: number }) {
  return <div style={{ flex: 'none', width: size, height: size * 1.12, borderRadius: 28, padding: 4, background: `linear-gradient(160deg, ${colour}, ${alpha(colour, .15)})`,
    boxShadow: `0 0 ${60 * k}px ${alpha(colour, .35)}`, opacity: k, transform: `scale(${.92 + .08 * k})` }}>
    <Img src={staticFile(person.image.replace(/^\//, ''))} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 24, display: 'block' }} />
  </div>;
}

const Chip = ({ children, colour, k }: { children: ReactNode; colour: string; k: number }) =>
  <span style={{ ...font, ...rise(k, 14), display: 'inline-block', padding: '10px 20px', borderRadius: 999, fontSize: 24, fontWeight: 600, color: C.text,
    background: alpha(colour, .12), border: `2px solid ${alpha(colour, .55)}`, whiteSpace: 'nowrap' }}>{children}</span>;

const Scene = ({ children, chapter, captions }: { children: ReactNode; chapter: string; captions: [number, string][] }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: C.page, overflow: 'hidden' }}>{children}<CaptionBand chapter={chapter} captions={captions} frame={frame} shade={out(frame, 4, 16)} /></AbsoluteFill>;
};

function Opening() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: C.page }}>
    <SunriseView frame={frame} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LitEmblemView frame={frame} width={440} from={6} />
      <div style={{ marginTop: 22 }}><Signature frame={frame} at={18} motto={`${site.home.headline} ${site.home.accent}`} /></div>
    </div>
  </AbsoluteFill>;
}

/** One team window: İslam, then Mehmet, fill the same window in turn, each with two sentences. */
function Team() {
  const frame = useCurrentFrame(), SWAP = 500;
  const page = (person: typeof ISLAM, colour: string, lines: string[], from: number, to: number) => {
    const k = out(frame, from + 6, from + 28) * (1 - out(frame, to - 18, to));
    if (k <= 0) return null;
    return <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 70, alignItems: 'center', padding: '0 70px', opacity: k }}>
      <Portrait person={person} size={330} colour={colour} k={k} />
      <div style={{ ...font, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...rise(k), fontSize: 64, fontWeight: 800, color: C.text, letterSpacing: '-.015em' }}>{person.name}</div>
        <div style={{ ...rise(out(frame, from + 16, from + 36)), fontSize: 30, fontWeight: 650, color: colour }}>{person.role}</div>
        {lines.map((l, i) => <div key={l} style={{ ...rise(out(frame, from + 50 + i * 90, from + 72 + i * 90)), fontSize: 36, fontWeight: 500, color: C.text, lineHeight: 1.4, maxWidth: 1000, marginTop: i ? 0 : 14 }}>{l}</div>)}
      </div>
    </div>;
  };
  return <Scene chapter="Team" captions={[[0, site.about.headline], [SWAP, 'Millimeter-wave chips and artificial intelligence, in one team.']]}>
    <SunriseView frame={frame} k={.4} />
    <div style={{ position: 'absolute', left: 120, right: 120, top: 90, height: 560, borderRadius: 36, background: alpha(C.card, .92), border: `1px solid ${C.border}`, boxShadow: `0 30px 90px ${alpha('#000', .4)}`, overflow: 'hidden' }}>
      {page(ISLAM, B.brand1, FOUNDERS.islam.intro, 0, SWAP)}
      {page(MEHMET, B.brand3, FOUNDERS.mehmet.intro, SWAP, 10_000)}
    </div>
  </Scene>;
}

/** One row of the portfolio: a heading and its lines, lit when it arrives. */
function Row({ heading, lines, colour, frame, at, lead = false }: { heading: string; lines: string[]; colour: string; frame: number; at: number; lead?: boolean }) {
  const k = out(frame, at, at + 18);
  return <div style={{ ...font, ...rise(k, 20), padding: lead ? '12px 20px' : '2px 20px', borderRadius: 20, background: lead ? alpha(colour, .1) : 'transparent', borderLeft: `4px solid ${alpha(colour, lead ? 1 : .5)}` }}>
    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: colour }}>{heading}</div>
    {lines.map(l => <div key={l} style={{ marginTop: 4, fontSize: 25, fontWeight: 550, color: C.text, lineHeight: 1.3 }}>{l}</div>)}
  </div>;
}

/** The joint portfolio: both founders side by side, İslam first, Mehmet's industry first in his column. */
function Portfolio() {
  const frame = useCurrentFrame(), { islam, mehmet } = FOUNDERS;
  const column = (person: typeof ISLAM, colour: string, rows: [string, string[], boolean?][], from: number) =>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 6 }}>
        <Portrait person={person} size={96} colour={colour} k={out(frame, from - 30, from - 10)} />
        <div style={{ ...font, ...rise(out(frame, from - 30, from - 10)), fontSize: 40, fontWeight: 800, color: C.text }}>{person.name}</div>
      </div>
      {rows.map(([heading, lines, lead], i) => <Row key={heading} heading={heading} lines={lines} colour={colour} frame={frame} at={from + i * 75} lead={lead} />)}
    </div>;
  const islamRows: [string, string[], boolean?][] = [
    ['Publications', [`${islam.citations} citations`, islam.publications]],
    ['Academic experience', islam.academic],
    ['PhD', [islam.phd]],
    ...(islam.advisor ? [['Advisor', [islam.advisor]] as [string, string[]]] : []),
  ];
  const mehmetRows: [string, string[], boolean?][] = [
    ['Industry', mehmet.industry, true],
    ['Startup', mehmet.startup, true],
    ['Publications', [`${mehmet.citations} citations, ${mehmet.publications} publications`, `${mehmet.chips} of them RF and millimeter-wave chip designs`]],
    ['Education', mehmet.education],
  ];
  const together = out(frame, 760, 780);
  return <Scene chapter="Team · Portfolio" captions={[[0, `${ISLAM.name}: learning systems that design RF circuits.`], [360, `${MEHMET.name}: millimeter-wave chips, in industry and in his own startup.`], [760, 'Together, they are GENESIS, working today.']]}>
    <div style={{ position: 'absolute', left: 90, right: 90, top: 40, display: 'flex', gap: 60 }}>
      {column(ISLAM, B.brand1, islamRows, 40)}
      <div style={{ width: 2, background: alpha(C.border, .8), opacity: out(frame, 330, 350) }} />
      {column(MEHMET, B.brand3, mehmetRows, 380)}
    </div>
    <div style={{ ...font, ...rise(together), position: 'absolute', left: 110, top: 690, display: 'flex', alignItems: 'center', gap: 20 }}>
      <LitEmblemView frame={frame} width={80} from={760} />
      <div style={{ fontSize: 30, fontWeight: 700, color: C.text }}>
        <span style={{ color: B.brand2, fontWeight: 800 }}>{count(islam.citations + mehmet.citations, frame, 770)}</span> citations together
      </div>
    </div>
  </Scene>;
}

/** Simple line icons for where millimeter-wave is felt. */
const ICONS: Record<string, ReactNode> = {
  phone: <><rect x={22} y={6} width={36} height={68} rx={8} /><path d="M34 64h12" /><path d="M64 22a14 14 0 0 1 0 20M70 16a24 24 0 0 1 0 32" /></>,
  car: <><path d="M8 52l6-18a6 6 0 0 1 6-4h28a6 6 0 0 1 6 4l6 18v10H8z" /><circle cx={20} cy={62} r={6} /><circle cx={52} cy={62} r={6} /><path d="M64 34a12 12 0 0 1 0 16M70 28a20 20 0 0 1 0 28" /></>,
  satellite: <><rect x={30} y={30} width={20} height={20} rx={3} transform="rotate(45 40 40)" /><path d="M14 14l12 12M54 54l12 12" /><rect x={4} y={4} width={16} height={16} rx={2} /><rect x={60} y={60} width={16} height={16} rx={2} /><path d="M58 18a8 8 0 0 1 4 4M60 10a16 16 0 0 1 10 10" /></>,
  sensing: <><circle cx={40} cy={40} r={8} /><circle cx={40} cy={40} r={20} /><circle cx={40} cy={40} r={32} /></>,
};

/** What millimeter-wave is: the radio spectrum with the band lit, then where it is felt every day. */
function WhatIs() {
  const frame = useCurrentFrame(), uses: [string, string][] = [['phone', '5G and 6G phone links'], ['car', 'Car radar'], ['satellite', 'Satellite internet'], ['sensing', 'Sensing and imaging']];
  // The spectrum from 0.1 to 300 GHz on a log scale; the millimeter-wave band is 30 to 300 GHz.
  const X0 = 200, X1 = 1720, x = (ghz: number) => X0 + (X1 - X0) * (Math.log10(ghz) + 1) / (Math.log10(300) + 1), lit = out(frame, 30, 60);
  const wave = (from: number, to: number, cycles: number) => Array.from({ length: 240 }, (_, i) => { const t = i / 239, px = from + (to - from) * t; return `${i ? 'L' : 'M'}${px.toFixed(1)} ${(210 + 34 * Math.sin(t * cycles * 2 * Math.PI - frame / 4)).toFixed(1)}`; }).join(' ');
  return <Scene chapter="What is millimeter-wave" captions={[[0, 'Millimeter-wave: radio from 30 to 300 GHz, waves a few millimeters long.'], [170, 'You meet it every day.']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      <rect x={x(30)} y={130} width={(x(300) - x(30)) * lit} height={160} rx={18} fill={alpha(B.brand1, .14)} stroke={alpha(B.brand1, .6 * lit)} strokeWidth={2} />
      <path d={wave(X0, x(30), 5)} fill="none" stroke={C.muted} strokeWidth={4} opacity={.7} />
      <path d={wave(x(30), X1, 26)} fill="none" stroke={B.brand1} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${B.brand1})` }} opacity={lit} />
      <line x1={X0} y1={300} x2={X1} y2={300} stroke={C.grid} strokeWidth={2} />
      {[1, 10, 30, 100, 300].map(g => <g key={g}><line x1={x(g)} y1={292} x2={x(g)} y2={308} stroke={C.muted} strokeWidth={2} />
        <text x={x(g)} y={340} textAnchor="middle" fill={C.muted} style={{ ...font, fontSize: 24, fontWeight: 600 }}>{g} GHz</text></g>)}
      <text x={(x(30) + x(300)) / 2} y={115} textAnchor="middle" fill={B.brand1} opacity={lit} style={{ ...font, fontSize: 30, fontWeight: 800, letterSpacing: '.08em' }}>MILLIMETER-WAVE</text>
      <text x={(X0 + x(30)) / 2} y={115} textAnchor="middle" fill={C.muted} style={{ ...font, fontSize: 26, fontWeight: 600 }}>Classic radio, Wi-Fi, 4G</text>
    </svg>
    <div style={{ position: 'absolute', left: 200, right: 200, top: 400, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30 }}>
      {uses.map(([icon, label], i) => { const k = out(frame, 160 + i * 14, 184 + i * 14), colour = [B.brand1, B.brand2, B.brand3, B.brand4][i];
        return <div key={icon} style={{ ...font, ...rise(k, 40), padding: '30px 24px', borderRadius: 28, background: C.card, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <svg viewBox="0 0 80 80" width={110} height={110} fill="none" stroke={colour} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${alpha(colour, .6)})` }}>{ICONS[icon]}</svg>
          <div style={{ fontSize: 30, fontWeight: 650, color: C.text, textAlign: 'center' }}>{label}</div>
        </div>; })}
    </div>
  </Scene>;
}

const StageImg = ({ src, style }: { src: string; style: CSSProperties }) => <Img src={src} style={style} />;

/** Why it is hard: a GENESIS layout builds up, its lines and passive devices light as parts of the circuit, then its
 * layers lift apart in 3D as the story film shows them. */
function WhyHard({ layout }: FundProps) {
  const frame = useCurrentFrame();
  if (!layout) return null;
  const src = (key: string) => layout.files[key] ? staticFile(layout.files[key].file) : null;
  const flat = 1 - out(frame, 195, 215), W = 1000, H = W * layout.height / layout.width, glow = .5 + .5 * Math.sin(frame / 7);
  const stages = ['stage_gnd_tiling', 'stage_essentials', 'stage_dc_lines', 'stage_interconnect'];
  const marks: [string, number][] = [['stage_interconnect', 80], ['block_input_l1', 130], ['block_output_l2', 130], ['block_output_l3', 130]];
  const labels: [string, number, number, number][] = [['Every line is a transmission line', 80, 480, 80], ['Every metal shape is a device', 130, 1100, 640]];
  return <Scene chapter="Why it is hard" captions={[[0, 'At these frequencies, every wire and metal shape is part of the circuit.'], [170, 'So the layout decides the performance.']]}>
    {flat > 0 && <div style={{ position: 'absolute', left: 960 - W / 2, top: 60, width: W, height: H, opacity: flat, borderRadius: 18, overflow: 'hidden', background: C.die, border: `1px solid ${C.border}` }}>
      {stages.map((s, i) => { const u = src(s), k = out(frame, 6 + i * 14, 26 + i * 14);
        return u && <Img key={s} src={u} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: k * (i === 0 ? .55 : 1) }} />; })}
      {marks.map(([key, at]) => { const u = src(key), k = out(frame, at, at + 16);
        return u && <Img key={key} src={u} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: k, filter: `brightness(${1.4 + .6 * glow}) drop-shadow(0 0 ${10 + 10 * glow}px ${B.brand4})` }} />; })}
    </div>}
    {flat > 0 && labels.map(([label, at, left, top]) => <div key={label} style={{ ...font, ...rise(out(frame, at, at + 16)), opacity: out(frame, at, at + 16) * flat, position: 'absolute', left, top,
      padding: '12px 22px', borderRadius: 999, background: alpha(C.page, .85), border: `2px solid ${B.brand4}`, fontSize: 28, fontWeight: 700, color: C.text }}>{label}</div>)}
    {frame >= 190 && <div style={{ position: 'absolute', inset: 0, opacity: out(frame, 190, 210) }}>
      <Chip3DView frame={frame - 190} die={layout.die} layers={layout.layers} src={src} Image={StageImg} />
    </div>}
  </Scene>;
}

/** Why silicon is the bottleneck: the hand loop of drawing, fabrication and measurement, and digital design beside it. */
function Bottleneck() {
  const frame = useCurrentFrame();
  const steps: [string, string, string][] = [['A few experts draw each block by hand', 'Weeks', B.brand3], ['The chip is fabricated', 'Months, at high cost', B.brand2], ['Measured in silicon', 'A mistake shows only now', B.brand4]];
  const loop = ease(frame, 140, 190), digital = out(frame, 230, 255);
  return <Scene chapter="The bottleneck" captions={[[0, 'Each RF chip goes through a slow loop by hand.'], [140, 'A mistake means another round of months.'], [230, 'Digital layout was automated decades ago. RF layout still waits.']]}>
    <div style={{ position: 'absolute', left: 150, right: 150, top: 110, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 90 }}>
      {steps.map(([what, time, colour], i) => { const k = out(frame, 20 + i * 40, 44 + i * 40);
        return <div key={what} style={{ ...font, ...rise(k, 36), position: 'relative', padding: '34px 30px', borderRadius: 28, background: C.card, border: `1px solid ${C.border}`, borderTop: `5px solid ${colour}`, minHeight: 210 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: colour }}>Step {i + 1}</div>
          <div style={{ marginTop: 14, fontSize: 34, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{what}</div>
          <div style={{ marginTop: 16, fontSize: 30, fontWeight: 800, color: colour }}>{time}</div>
          {i < 2 && <div style={{ position: 'absolute', right: -74, top: '50%', fontSize: 54, fontWeight: 800, color: C.muted, transform: 'translateY(-50%)', opacity: out(frame, 44 + i * 40, 60 + i * 40) }}>→</div>}
        </div>; })}
    </div>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <path d="M 1500 420 C 1500 540, 1300 560, 960 560 C 620 560, 420 540, 420 420" fill="none" stroke={B.brand4} strokeWidth={6} strokeDasharray="14 12"
        style={{ clipPath: `inset(0 0 0 ${(1 - loop) * 100}%)`, filter: `drop-shadow(0 0 10px ${B.brand4})` }} />
      <path d="M 406 444 l 14 -26 l 14 26" fill="none" stroke={B.brand4} strokeWidth={6} opacity={out(frame, 185, 195)} />
      <text x={960} y={610} textAnchor="middle" fill={B.brand4} opacity={loop} style={{ ...font, fontSize: 30, fontWeight: 700 }}>Start again</text>
    </svg>
    <div style={{ ...font, ...rise(digital), position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center', gap: 30 }}>
      <Chip colour={B.brand1} k={1}>Digital chips: layout by software, for decades</Chip>
      <Chip colour={B.brand3} k={1}>RF and millimeter-wave chips: layout by hand</Chip>
    </div>
  </Scene>;
}

/** GENESIS against the hand process, with the site's claims. */
function Answer() {
  const frame = useCurrentFrame();
  const bar = (label: string, value: string, width: number, colour: string, at: number) => {
    const k = ease(frame, at, at + 40);
    return <div style={{ ...font, display: 'flex', flexDirection: 'column', gap: 10, opacity: out(frame, at, at + 12) }}>
      <div style={{ fontSize: 32, fontWeight: 650, color: C.text }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ height: 38, width: width * k, borderRadius: 19, background: colour, boxShadow: `0 0 26px ${alpha(colour, .45)}` }} />
        <div style={{ fontSize: 38, fontWeight: 800, color: colour, opacity: out(frame, at + 30, at + 44), whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>;
  };
  return <Scene chapter="GENESIS" captions={[[0, 'GENESIS designs and lays out the circuit automatically.'], [115, 'A validated layout in your own process, ready for silicon.']]}>
    <div style={{ position: 'absolute', left: 200, right: 200, top: 130, display: 'flex', flexDirection: 'column', gap: 50 }}>
      {bar('By hand: expert engineers, block by block', 'Weeks', 1150, C.muted, 10)}
      {bar(`GENESIS: ${CLAIMS[0].line.toLowerCase()}`, CLAIMS[0].value, 40, B.brand1, 50)}
      {bar(`GENESIS: ${CLAIMS[1].line.toLowerCase()}`, CLAIMS[1].value, 140, B.brand3, 80)}
    </div>
  </Scene>;
}

function Bridge() {
  const frame = useCurrentFrame(), k = out(frame, 4, 24), dark = ease(frame, 50, 72);
  return <AbsoluteFill style={{ background: C.page }}>
    <SunriseView frame={frame} k={.6 * (1 - dark)} />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, opacity: 1 - dark }}>
      <div style={{ ...font, ...rise(k), fontSize: 26, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: C.cyan }}>Product and progress</div>
      <div style={{ ...font, ...rise(out(frame, 12, 32)), fontSize: 74, fontWeight: 800, color: C.text, letterSpacing: '-.015em' }}>
        <span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span> at work
      </div>
    </div>
  </AbsoluteFill>;
}

const SCENES: [string, number, (props: FundProps) => ReactNode][] = [
  ['opening', 140, Opening], ['team', 1000, Team], ['portfolio', 1260, Portfolio],
  ['what', 300, WhatIs], ['hard', 360, WhyHard], ['bottleneck', 330, Bottleneck], ['answer', 210, Answer], ['bridge', 74, Bridge],
];
export const fundIntroFrames = () => SCENES.reduce((n, [, f]) => n + f, 0) - FADE * (SCENES.length - 1);

export function FundIntro(props: FundProps) {
  return <AbsoluteFill><TransitionSeries>
    {SCENES.flatMap(([id, frames, View], i) => [
      ...(i ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />] : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={frames}><View {...props} /></TransitionSeries.Sequence>,
    ])}
  </TransitionSeries></AbsoluteFill>;
}
