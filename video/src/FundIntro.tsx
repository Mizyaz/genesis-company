import { type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { alpha, B, C, GRADIENT } from './Brand';
import { LitEmblemView, SunriseView, Wordmark } from '../../src/shared/story/landing';
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
/** From the founders' public scholar profiles (read 2026-11-01): citations, publications and research directions.
 * Mehmet's industry line (role, years, the startups he built) is set here once Islam gives it; until then the card
 * shows the site's own line. */
const FOUNDERS = {
  islam: { citations: 253, themes: ['RF circuit synthesis with learning', 'Chip design with artificial intelligence', 'Multi-agent reinforcement learning', 'Drone swarms and wireless networks', 'Radar signal classification', 'Joint communication and sensing'] },
  mehmet: { citations: 400, publications: 31, chips: 13, phd: 'PhD on millimeter-wave circuits in silicon, University of California San Diego',
    industry: null as string | null,
    designs: [['DC to 60 GHz', 'Switch, 2.5 dB loss'], ['Q-band', 'Low-noise amplifier, 2.9 dB noise figure'], ['77 to 90 GHz', 'Bidirectional amplifier'], ['W-band', 'Phase shifter']] },
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

/** A large number that counts up, with its line. */
function Big({ value, line, colour, frame, at, suffix = '' }: { value: number; line: string; colour: string; frame: number; at: number; suffix?: string }) {
  const k = out(frame, at, at + 16);
  return <div style={{ ...font, ...rise(k), maxWidth: 520 }}>
    <div style={{ fontSize: 112, fontWeight: 800, lineHeight: 1, color: colour, letterSpacing: '-.03em', textShadow: `0 0 40px ${alpha(colour, .35)}` }}>{count(value, frame, at)}{suffix}</div>
    <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>{line}</div>
  </div>;
}

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

function Team() {
  const frame = useCurrentFrame();
  const card = (person: typeof ISLAM, colour: string, at: number) => {
    const k = out(frame, at, at + 22);
    return <div style={{ ...font, ...rise(k, 40), width: 780, display: 'flex', gap: 36, alignItems: 'center', padding: 34, borderRadius: 32, background: alpha(C.card, .9), border: `1px solid ${C.border}`, boxShadow: `0 30px 80px ${alpha('#000', .35)}` }}>
      <Portrait person={person} size={250} colour={colour} k={k} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.text, letterSpacing: '-.01em' }}>{person.name}</div>
        <div style={{ fontSize: 27, fontWeight: 600, color: colour, lineHeight: 1.25 }}>{person.role}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {person.focus.map((f, i) => <Chip key={f} colour={colour} k={out(frame, at + 30 + i * 8, at + 46 + i * 8)}>{f}</Chip>)}
        </div>
      </div>
    </div>;
  };
  return <Scene chapter="Team" captions={[[0, site.about.headline], [170, 'Millimeter-wave chips and artificial intelligence, in one team.']]}>
    <SunriseView frame={frame} k={.45} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', gap: 60 }}>
      {card(MEHMET, B.brand3, 10)}{card(ISLAM, B.brand1, 34)}
    </div>
  </Scene>;
}

/** A founder's page: the portrait and name on the left, the numbers and the story on the right. */
function Founder({ person, colour, chapter, captions, children }: { person: typeof ISLAM; colour: string; chapter: string; captions: [number, string][]; children: ReactNode }) {
  const frame = useCurrentFrame(), head = out(frame, 6, 26);
  return <Scene chapter={chapter} captions={captions}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 15% 32%, ${alpha(colour, .16)}, transparent 55%)` }} />
    <div style={{ position: 'absolute', left: 110, top: 100, width: 360, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Portrait person={person} size={320} colour={colour} k={head} />
      <div style={{ ...font, ...rise(head), fontSize: 46, fontWeight: 800, color: C.text, letterSpacing: '-.01em' }}>{person.name}</div>
      <div style={{ ...font, ...rise(out(frame, 14, 32)), fontSize: 26, fontWeight: 600, color: colour, lineHeight: 1.3, marginTop: -12 }}>{person.role}</div>
    </div>
    <div style={{ position: 'absolute', left: 560, right: 110, top: 100, bottom: 330 }}>{children}</div>
  </Scene>;
}

/** Mehmet: citations and chip designs from his scholar profile, the front-ends he designed, his industry line. */
function Mehmet() {
  const frame = useCurrentFrame(), m = FOUNDERS.mehmet;
  return <Founder person={MEHMET} colour={B.brand3} chapter="Team · Millimeter-wave chips and ventures"
    captions={[[0, `${MEHMET.name} has designed millimeter-wave chips since 2010.`], [400, 'More than 20 years building technology ventures.']]}>
    <div style={{ display: 'flex', gap: 90 }}>
      <Big value={m.citations} line="Citations" colour={B.brand3} frame={frame} at={30} />
      <Big value={m.publications} line={`Publications, ${m.chips} of them RF and millimeter-wave chip designs`} colour={B.brand3} frame={frame} at={52} />
    </div>
    <div style={{ ...font, ...rise(out(frame, 90, 110)), marginTop: 36, fontSize: 30, fontWeight: 600, color: C.text }}>{m.phd}</div>
    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {m.designs.map(([band, what], i) => { const at = 130 + i * 55, k = out(frame, at, at + 18);
        return <div key={band} style={{ ...font, ...rise(k, 30), padding: '20px 22px', borderRadius: 22, background: C.card, border: `1px solid ${C.border}`, borderTop: `4px solid ${B.brand3}` }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: B.brand3, letterSpacing: '-.01em' }}>{band}</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{what}</div>
        </div>; })}
    </div>
    {/* The industry slot: Islam's line on Mehmet's industry role and startups replaces the site's line here. */}
    <div style={{ ...font, ...rise(out(frame, 400, 420)), marginTop: 30, fontSize: 30, fontWeight: 500, color: C.muted, lineHeight: 1.4, minHeight: 126 }}>{m.industry ?? MEHMET.description}</div>
  </Founder>;
}

/** İslam: citations from his scholar profile and the directions of his research, joined in GENESIS. */
function Islam() {
  const frame = useCurrentFrame(), themes = FOUNDERS.islam.themes, cx = 620, cy = 380, rx = 560, ry = 200, join = 70 + themes.length * 40;
  const centre = out(frame, join, join + 30);
  const at = (i: number) => { const a = -Math.PI / 2 + i * 2 * Math.PI / themes.length; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
  return <Founder person={ISLAM} colour={B.brand1} chapter="Team · Learning systems and GENESIS"
    captions={[[0, `${ISLAM.name}: learning systems, from drone swarms to RF circuits.`], [420, 'He builds GENESIS end to end.']]}>
    <Big value={FOUNDERS.islam.citations} line="Citations" colour={B.brand1} frame={frame} at={30} />
    <svg width={1250} height={650} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {themes.map((_, i) => { const [x, y] = at(i), k = ease(frame, join, join + 50);
        return <line key={i} x1={x} y1={y} x2={x + (cx - x) * k} y2={y + (cy - y) * k} stroke={alpha(B.brand1, .55)} strokeWidth={3} />; })}
    </svg>
    {themes.map((t, i) => { const [x, y] = at(i), k = out(frame, 70 + i * 40, 90 + i * 40);
      return <div key={t} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${.8 + .2 * k})`, opacity: k, borderRadius: 999, background: C.page }}>
        <Chip colour={i < 2 ? B.brand1 : B.brand2} k={1}>{t}</Chip>
      </div>; })}
    <div style={{ position: 'absolute', left: cx, top: cy, transform: `translate(-50%, -50%) scale(${.6 + .4 * centre})`, opacity: centre, display: 'flex', alignItems: 'center', gap: 18,
      padding: '14px 26px', borderRadius: 26, background: alpha(C.page, .9) }}>
      <LitEmblemView frame={frame} width={110} from={join} /><Wordmark size={60} />
    </div>
  </Founder>;
}

/** Why this team: the two backgrounds run in as two streams and join in the mark. */
function WhyTeam() {
  const frame = useCurrentFrame(), draw = ease(frame, 10, 70), mark = out(frame, 60, 90);
  const stream = (y: number, colour: string, label: string, at: number, below = false) => <>
    <path d={`M 160 ${y} C 620 ${y}, 700 330, 1060 330`} fill="none" stroke={colour} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 12px ${colour})` }} />
    <foreignObject x={150} y={below ? y + 26 : y - 92} width={760} height={70}><div style={{ ...font, ...rise(out(frame, at, at + 18)), fontSize: 34, fontWeight: 700, color: colour }}>{label}</div></foreignObject>
  </>;
  return <Scene chapter="Why this team" captions={[[0, 'Chips that work in silicon, and learning systems that design them.'], [300, 'Together, they are GENESIS, working today.']]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {stream(200, B.brand3, 'Millimeter-wave chips, designed and measured', 6)}
      {stream(470, B.brand1, 'Machine learning, optimization and agents', 18, true)}
    </svg>
    <div style={{ position: 'absolute', left: 1060, top: 330, transform: `translate(-6%, -50%) scale(${.6 + .4 * mark})`, opacity: mark, display: 'flex', alignItems: 'center', gap: 28 }}>
      <LitEmblemView frame={frame} width={200} from={60} /><Wordmark size={92} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', gap: 120, justifyContent: 'center' }}>
      <Big value={FOUNDERS.mehmet.citations + FOUNDERS.islam.citations} line="Citations together" colour={B.brand2} frame={frame} at={110} />
      <Big value={FOUNDERS.mehmet.chips} line="RF and millimeter-wave chip designs" colour={B.brand3} frame={frame} at={130} />
      <Big value={20} suffix="+" line="Years of venture building" colour={B.brand1} frame={frame} at={150} />
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
  ['opening', 140, Opening], ['team', 420, Team], ['mehmet', 780, Mehmet], ['islam', 720, Islam], ['why', 600, WhyTeam],
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
