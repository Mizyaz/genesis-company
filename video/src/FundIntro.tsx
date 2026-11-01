import { type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/fonts';
import { alpha, B, C, GRADIENT } from './Brand';
import { LitEmblemView, SunriseView, Wordmark } from '../../src/shared/story/landing';
import { Signature } from '../../src/shared/story/scenes-end';
import { CaptionBand } from '../../src/shared/story/scenes';
import { ease, out } from '../../src/shared/story/motion';
import site from '../../src/content/site.json';
import publications from '../../src/content/publications.json';

// The opening of the team film for a fund application: GENESIS, the team as the site presents it (site.json's people and
// publications.json), why this team, the market GENESIS serves, then the story film (GenesisStory) follows as a cut.
// Every name, role and count is read from the site's content; the picture's type, colours and motion are the story's.

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

const FADE = 16;
/** Frames between two records of a founder, so each is read before the next comes in. */
const RECORD_PITCH = 66;
const [ISLAM, MEHMET] = site.about.people;
const papersOf = (id: string) => publications.filter(p => p.people.includes(id));
const since = (id: string) => Math.min(...papersOf(id).map(p => p.year));
const journals = (list: typeof publications) => list.filter(p => p.type === 'Journal').length;
const JOINT = publications.filter(p => p.people.length > 1).length;
const MICROWAVE_TRANSACTIONS = papersOf(MEHMET.id).filter(p => p.venue === 'IEEE Transactions on Microwave Theory and Techniques').length;
const RF_SYNTHESIS = publications.filter(p => p.year === 2026 && p.keywords.some(k => /RF synthesis|Pixelated/.test(k))).length;

const font: CSSProperties = { fontFamily: 'Inter' };
const rise = (k: number, px = 24): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * px}px)` });
const count = (n: number, frame: number, from: number) => Math.round(n * ease(frame, from, from + 36));

/** A portrait in a ring of the brand colour. */
function Portrait({ person, size, colour, k }: { person: typeof ISLAM; size: number; colour: string; k: number }) {
  return <div style={{ width: size, height: size * 1.12, borderRadius: 28, padding: 4, background: `linear-gradient(160deg, ${colour}, ${alpha(colour, .15)})`,
    boxShadow: `0 0 ${60 * k}px ${alpha(colour, .35)}`, opacity: k, transform: `scale(${.92 + .08 * k})` }}>
    <Img src={staticFile(person.image.replace(/^\//, ''))} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 24, display: 'block' }} />
  </div>;
}

const Chip = ({ children, colour, k }: { children: ReactNode; colour: string; k: number }) =>
  <span style={{ ...font, ...rise(k, 14), display: 'inline-block', padding: '10px 20px', borderRadius: 999, fontSize: 24, fontWeight: 600, color: C.text,
    background: alpha(colour, .12), border: `2px solid ${alpha(colour, .55)}` }}>{children}</span>;

/** A number that counts up, with its line. */
function Stat({ value, suffix = '', line, colour, frame, at, small }: { value: number; suffix?: string; line: string; colour: string; frame: number; at: number; small?: boolean }) {
  const k = out(frame, at, at + 16);
  return <div style={{ ...font, ...rise(k), padding: small ? '14px 22px' : '22px 28px', borderRadius: 22, background: C.card, border: `1px solid ${C.border}`, borderTop: `4px solid ${colour}`, minWidth: 250 }}>
    <div style={{ fontSize: small ? 58 : 76, fontWeight: 800, lineHeight: 1, color: colour, letterSpacing: '-.02em' }}>{count(value, frame, at)}{suffix}</div>
    <div style={{ marginTop: small ? 6 : 10, fontSize: small ? 21 : 24, fontWeight: 500, color: C.muted, maxWidth: 320, lineHeight: 1.3 }}>{line}</div>
  </div>;
}

/** One line of a record list: a dot in the person's colour, the result and where it was published. */
function Record({ what, where, colour, k, lit = 0 }: { what: string; where: string; colour: string; k: number; lit?: number }) {
  return <div style={{ ...font, ...rise(k, 18), display: 'flex', gap: 18, alignItems: 'baseline', margin: '0 -18px', padding: '8px 18px', borderRadius: 14, background: alpha(colour, .14 * lit), boxShadow: `inset 3px 0 0 ${alpha(colour, lit)}` }}>
    <span style={{ width: 14, height: 14, borderRadius: 7, background: colour, flex: 'none', transform: 'translateY(-4px)', boxShadow: `0 0 14px ${colour}` }} />
    <span style={{ fontSize: 31, fontWeight: 650, color: C.text }}>{what}<span style={{ fontWeight: 500, color: C.muted }}>{'  ·  '}{where}</span></span>
  </div>;
}

const Scene = ({ children, chapter, captions }: { children: ReactNode; chapter: string; captions: [number, string][] }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: C.page, overflow: 'hidden' }}>{children}<CaptionBand chapter={chapter} captions={captions} frame={frame} shade={out(frame, 4, 16)} /></AbsoluteFill>;
};

/** GENESIS, as the story film opens and ends: the daybreak, the lit mark and the signature. */
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

/** The two founders side by side, as the site's team section shows them. */
function Team() {
  const frame = useCurrentFrame();
  const card = (person: typeof ISLAM, colour: string, at: number) => {
    const k = out(frame, at, at + 22);
    return <div style={{ ...font, ...rise(k, 40), width: 780, display: 'flex', gap: 36, alignItems: 'center', padding: 34, borderRadius: 32, background: alpha(C.card, .9), border: `1px solid ${C.border}`, boxShadow: `0 30px 80px ${alpha('#000', .35)}` }}>
      <div style={{ flex: 'none' }}><Portrait person={person} size={250} colour={colour} k={k} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.text, letterSpacing: '-.01em' }}>{person.name}</div>
        <div style={{ fontSize: 27, fontWeight: 600, color: colour, lineHeight: 1.25 }}>{person.role}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {person.focus.map((f, i) => <Chip key={f} colour={colour} k={out(frame, at + 30 + i * 8, at + 46 + i * 8)}>{f}</Chip>)}
        </div>
      </div>
    </div>;
  };
  return <Scene chapter="Team" captions={[[0, site.about.headline], [150, 'Millimeter-wave silicon and learning machines, in one team.']]}>
    <SunriseView frame={frame} k={.45} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', gap: 60 }}>
      {card(ISLAM, B.brand1, 10)}{card(MEHMET, B.brand3, 34)}
    </div>
  </Scene>;
}

/** One founder: the portrait, the background from the site, the records and the counts from the publications. */
function Person({ person, colour, chapter, captions, background, records, stats }: {
  person: typeof ISLAM; colour: string; chapter: string; captions: [number, string][]; background: string;
  records: { what: string; where: string }[]; stats: { value: number; suffix?: string; line: string }[];
}) {
  const frame = useCurrentFrame(), head = out(frame, 6, 26);
  return <Scene chapter={chapter} captions={captions}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 18% 30%, ${alpha(colour, .16)}, transparent 55%)` }} />
    <div style={{ position: 'absolute', left: 110, top: 96 }}><Portrait person={person} size={300} colour={colour} k={head} /></div>
    <div style={{ position: 'absolute', left: 110, top: 462, width: 338, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {stats.map((s, i) => <Stat key={s.line} {...s} small colour={colour} frame={frame} at={40 + i * 22} />)}
    </div>
    <div style={{ position: 'absolute', left: 540, right: 110, top: 104, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...font, ...rise(head), fontSize: 64, fontWeight: 800, color: C.text, letterSpacing: '-.015em' }}>{person.name}</div>
      <div style={{ ...font, ...rise(out(frame, 14, 32)), fontSize: 32, fontWeight: 600, color: colour, marginTop: 6 }}>{person.role}</div>
      <div style={{ ...font, ...rise(out(frame, 24, 44)), fontSize: 33, fontWeight: 500, color: C.muted, lineHeight: 1.4, marginTop: 28, maxWidth: 1180 }}>{background}</div>
      <div style={{ height: 3, width: `${out(frame, 50, 80) * 100}%`, maxWidth: 1180, background: GRADIENT, borderRadius: 2, margin: '34px 0 30px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {records.map((r, i) => { const at = 80 + i * RECORD_PITCH; return <Record key={r.what} {...r} colour={colour} k={out(frame, at, at + 20)} lit={out(frame, at, at + 12) * (1 - (i < records.length - 1 ? out(frame, at + RECORD_PITCH, at + RECORD_PITCH + 12) : 0))} />; })}
      </div>
    </div>
  </Scene>;
}

const Islam = () => <Person person={ISLAM} colour={B.brand1} chapter="Team · Builder of GENESIS"
  captions={[[0, `${ISLAM.name} builds GENESIS end to end.`], [230, 'Automated RF synthesis, published at IEEE conferences.'], [440, 'Learning and optimization, from drones to circuits.']]}
  background={ISLAM.description}
  records={[
    { what: 'GENESIS: from performance targets to a validated layout', where: 'built end to end' },
    { what: 'Learning-based synthesis of wideband RF passive circuits', where: 'IEEE SMACD 2026, two papers' },
    { what: 'Discrete Bayesian optimization of multilayer passive circuits', where: 'MIKON 2026' },
    { what: 'Survey of integrated circuit design with artificial intelligence', where: 'IEEE Access 2025' },
    { what: 'Multi-agent reinforcement learning', where: 'IEEE Transactions on Vehicular Technology 2024' },
  ]}
  stats={[
    { value: papersOf(ISLAM.id).length, line: `Publications since ${since(ISLAM.id)}` },
    { value: RF_SYNTHESIS, line: 'Papers on automated RF synthesis in 2026' },
  ]} />;

const Mehmet = () => <Person person={MEHMET} colour={B.brand3} chapter="Team · Millimeter-wave silicon and ventures"
  captions={[[0, `${MEHMET.name}: millimeter-wave chips since ${since(MEHMET.id)}.`], [230, 'Record front-ends in silicon, from 60 to 90 GHz.'], [440, 'More than 20 years building technology ventures.']]}
  background={MEHMET.description}
  records={[
    { what: 'DC to 60 GHz silicon switch, 2.5 dB insertion loss', where: 'IEEE CSICS 2011' },
    { what: 'Q-band low-noise amplifier, 2.9 dB noise figure', where: 'IEEE CICC 2011' },
    { what: '77 to 90 GHz bidirectional amplifier', where: 'IEEE CICC 2010' },
    { what: 'W-band phase shifter in silicon-germanium', where: 'IEEE Microwave and Wireless Components Letters 2010' },
    { what: 'Millimeter-wave mixer and switch, radar signal processors', where: 'IEEE Transactions on Microwave Theory and Techniques' },
  ]}
  stats={[
    { value: papersOf(MEHMET.id).length, line: `Publications since ${since(MEHMET.id)}` },
    { value: MICROWAVE_TRANSACTIONS, line: 'Papers in IEEE Transactions on Microwave Theory and Techniques' },
  ]} />;

const RF_TOPICS = /RF|Circuit|Microwave|Radar|Integrated/;
const JOINT_PAPERS = publications.filter(p => p.people.length > 1).sort((a, b) => a.year - b.year);

/** The founders' joint papers, one card each in the order they were published, RF work in cyan and the rest in violet. */
function JointWork() {
  const frame = useCurrentFrame();
  return <Scene chapter="Team · Joint work" captions={[[0, `Together since ${JOINT_PAPERS[0].year}: ${JOINT} joint papers.`], [270, `${RF_SYNTHESIS} of them on automated RF synthesis, the research behind GENESIS.`]]}>
    <div style={{ position: 'absolute', left: 110, right: 110, top: 80, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
      {JOINT_PAPERS.map((p, i) => { const at = 16 + i * 26, k = out(frame, at, at + 18), colour = RF_TOPICS.test(p.title) ? B.brand1 : B.brand3;
        return <div key={p.id} style={{ ...font, ...rise(k, 30), minHeight: 196, boxSizing: 'border-box', padding: '22px 26px', borderRadius: 22, background: C.card, border: `1px solid ${C.border}`, borderLeft: `5px solid ${colour}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: colour }}>{p.year} · {p.venue.replace(/ \(.*\)$/, '')}</div>
          <div style={{ fontSize: 25, fontWeight: 600, lineHeight: 1.3, color: C.text }}>{p.title}</div>
        </div>; })}
    </div>
  </Scene>;
}

/** Why this team: the two backgrounds run in as two streams and join in the mark; the joint record counts below. */
function WhyTeam() {
  const frame = useCurrentFrame(), draw = ease(frame, 10, 70), mark = out(frame, 60, 90);
  const stream = (y: number, colour: string, label: string, at: number, below = false) => <>
    <path d={`M 160 ${y} C 620 ${y}, 700 330, 1060 330`} fill="none" stroke={colour} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} style={{ filter: `drop-shadow(0 0 12px ${colour})` }} />
    <foreignObject x={150} y={below ? y + 26 : y - 92} width={720} height={70}><div style={{ ...font, ...rise(out(frame, at, at + 18)), fontSize: 34, fontWeight: 700, color: colour }}>{label}</div></foreignObject>
  </>;
  return <Scene chapter="Why this team" captions={[[0, 'Front-end silicon experience meets learning and optimization.'], [230, `${JOINT} joint papers, and GENESIS working today.`]]}>
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {stream(200, B.brand3, 'Millimeter-wave front-ends in silicon', 6)}
      {stream(470, B.brand1, 'Machine learning, optimization and agents', 18, true)}
    </svg>
    <div style={{ position: 'absolute', left: 1060, top: 330, transform: `translate(-6%, -50%) scale(${.6 + .4 * mark})`, opacity: mark, display: 'flex', alignItems: 'center', gap: 28 }}>
      <LitEmblemView frame={frame} width={200} from={60} />
      <Wordmark size={92} />
    </div>
    <div style={{ position: 'absolute', left: 160, right: 160, top: 620, display: 'flex', gap: 26, justifyContent: 'center' }}>
      <Stat value={publications.length} line="Publications between the two founders" colour={B.brand2} frame={frame} at={110} />
      <Stat value={journals(publications)} line="Journal articles" colour={B.brand2} frame={frame} at={128} />
      <Stat value={JOINT} line="Papers written together" colour={B.brand2} frame={frame} at={146} />
      <Stat value={RF_SYNTHESIS} line="Joint papers on automated RF synthesis, 2026" colour={B.brand2} frame={frame} at={164} />
    </div>
  </Scene>;
}

/** Simple line icons for where RF front-ends go. */
const ICONS: Record<string, ReactNode> = {
  phone: <><rect x={22} y={6} width={36} height={68} rx={8} /><path d="M34 64h12" /><path d="M64 22a14 14 0 0 1 0 20M70 16a24 24 0 0 1 0 32" /></>,
  radar: <><path d="M10 64a34 34 0 0 1 60 0" /><path d="M20 64a24 24 0 0 1 40 0" /><path d="M40 64 62 26" /><circle cx={40} cy={64} r={4} /></>,
  satellite: <><rect x={30} y={30} width={20} height={20} rx={3} transform="rotate(45 40 40)" /><path d="M14 14l12 12M54 54l12 12" /><rect x={4} y={4} width={16} height={16} rx={2} /><rect x={60} y={60} width={16} height={16} rx={2} /><path d="M58 18a8 8 0 0 1 4 4M60 10a16 16 0 0 1 10 10" /></>,
  sensing: <><circle cx={40} cy={40} r={8} /><circle cx={40} cy={40} r={20} /><circle cx={40} cy={40} r={32} /></>,
};

/** The market: where RF front-ends go, then how their layout is made today and with GENESIS. */
function Market() {
  const frame = useCurrentFrame(), uses: [string, string][] = [['phone', 'Phones and base stations, 5G and 6G'], ['radar', 'Automotive and imaging radar'], ['satellite', 'Satellite and backhaul links'], ['sensing', 'Sensing and security scanners']];
  const second = out(frame, 135, 160), first = 1 - second;
  const bar = (label: string, value: string, width: number, colour: string, at: number) => {
    const k = ease(frame, at, at + 40);
    return <div style={{ ...font, display: 'flex', flexDirection: 'column', gap: 10, opacity: out(frame, at, at + 12) }}>
      <div style={{ fontSize: 30, fontWeight: 650, color: C.text }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ height: 34, width: width * k, borderRadius: 17, background: colour, boxShadow: `0 0 26px ${alpha(colour, .45)}` }} />
        <div style={{ fontSize: 34, fontWeight: 800, color: colour, opacity: out(frame, at + 30, at + 44), whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>;
  };
  return <Scene chapter="Market" captions={[[0, 'Every radio, radar and satellite link needs an RF front-end.'], [140, 'Its layout is still drawn by hand, for every band and every process.'], [225, 'GENESIS automates it, from the schematic to the validated layout.']]}>
    <div style={{ position: 'absolute', left: 140, right: 140, top: 150, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 34, opacity: first }}>
      {uses.map(([icon, label], i) => { const k = out(frame, 10 + i * 14, 34 + i * 14), colour = [B.brand1, B.brand2, B.brand3, B.brand4][i];
        return <div key={icon} style={{ ...font, ...rise(k, 40), padding: '44px 30px', borderRadius: 30, background: C.card, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <svg viewBox="0 0 80 80" width={150} height={150} fill="none" stroke={colour} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${alpha(colour, .6)})` }}>{ICONS[icon]}</svg>
          <div style={{ fontSize: 32, fontWeight: 650, color: C.text, textAlign: 'center', lineHeight: 1.25 }}>{label}</div>
        </div>; })}
      <div style={{ ...font, gridColumn: '1 / -1', textAlign: 'center', marginTop: 34, fontSize: 36, fontWeight: 600, color: C.muted, opacity: out(frame, 60, 80) }}>
        Each new band and each new process needs its front-end designed and laid out again.
      </div>
    </div>
    <div style={{ position: 'absolute', left: 200, right: 200, top: 170, display: 'flex', flexDirection: 'column', gap: 54, opacity: second }}>
      {bar('By hand: expert engineers, block by block, rule by rule', 'Repeated for every circuit', 1050, C.muted, 150)}
      {bar('GENESIS: automated layout, from schematic to finished layout', '< 30 minutes', 90, B.brand1, 180)}
      {bar('GENESIS: full design, with circuit simulations and optimization', '< 6 hours', 230, B.brand3, 205)}
    </div>
  </Scene>;
}

/** The hand-off into the story film: what GENESIS does, then the page darkens as the film's opening does. */
function Bridge() {
  const frame = useCurrentFrame(), k = out(frame, 4, 24), dark = ease(frame, 56, 80);
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

const SCENES: [string, number, () => ReactNode][] = [
  ['opening', 150, Opening], ['team', 360, Team], ['islam', 630, Islam], ['mehmet', 630, Mehmet], ['joint', 560, JointWork], ['why', 540, WhyTeam], ['market', 320, Market], ['bridge', 80, Bridge],
];
export const fundIntroFrames = () => SCENES.reduce((n, [, f]) => n + f, 0) - FADE * (SCENES.length - 1);

export function FundIntro() {
  return <AbsoluteFill><TransitionSeries>
    {SCENES.flatMap(([id, frames, View], i) => [
      ...(i ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />] : []),
      <TransitionSeries.Sequence key={id} name={id} durationInFrames={frames}><View /></TransitionSeries.Sequence>,
    ])}
  </TransitionSeries></AbsoluteFill>;
}
