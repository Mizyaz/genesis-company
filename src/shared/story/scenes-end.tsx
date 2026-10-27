import { out, ease } from './motion';
import { B, C, GRADIENT } from './palette';
import { LitEmblemView, SunriseView, Wordmark } from './landing';

// The film's demonstrator and ending scenes as functions of the scene's frame (the film plays them on Remotion's
// clock, the site on the page's clock). The caption band is the caller's.
export const DEMO_FRAMES = 135, END_FRAMES = 225;
export const DEMO_CAPTIONS = { chapter: 'Silicon demonstrator', captions: [[0, 'Technology-independent flow for a quick silicon demonstrator.']] as [number, string][] };

// Transistor technology classes, by kind, no foundry or lab named: the demonstrator is the same flow on any of them.
export const TECHNOLOGIES = [['Bulk CMOS', 'FD-SOI', 'FinFET', 'Gate-all-around'], ['SiGe BiCMOS', 'GaN HEMT', 'InP HBT']];

/** Any transistor technology: the technology classes stand left and right of a die, are wired to it and go into it,
 * and the die lights as a quick silicon demonstrator. */
export function DemoView({ frame }: { frame: number }) {
  const die = { x: 960, y: 380, s: 320 }, draw = ease(frame, 26, 58), wire = ease(frame, 56, 84), into = ease(frame, 84, 110), lit = out(frame, 96, 120);
  const tiles = TECHNOLOGIES.flatMap((column, c) => column.map((name, i) => ({ name, x: c ? 1430 : 490, y: die.y + (i - (column.length - 1) / 2) * 128 })));
  const pads = Array.from({ length: 28 }, (_, i) => { const side = Math.floor(i / 7), j = i % 7, u = -die.s / 2 + 34 + j * (die.s - 68) / 6, v = die.s / 2 - 18;
    return [[u, -v], [v, u], [-u, v], [-v, -u]][side]; });
  return <>
    <SunriseView frame={frame} k={lit * .8} />
    <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
      <defs><linearGradient id="demo-core" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={B.brand1} /><stop offset=".5" stopColor={B.brand2} /><stop offset="1" stopColor={B.brand3} /></linearGradient></defs>
      {tiles.map((t, i) => { const side = t.x < die.x ? 1 : -1, from = [t.x + side * 150, t.y], to = [die.x - side * die.s / 2, die.y + (t.y - die.y) * .5];
        return <path key={i} d={`M${from[0]} ${from[1]}C${(from[0] + to[0]) / 2} ${from[1]} ${(from[0] + to[0]) / 2} ${to[1]} ${to[0]} ${to[1]}`} fill="none" stroke={B.brand2} strokeOpacity={wire > 0 ? .55 * (1 - into) : 0} strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - wire} />; })}
      <rect x={die.x - die.s / 2} y={die.y - die.s / 2} width={die.s} height={die.s} rx={18} fill={C.card} fillOpacity={draw} stroke={B.brand2} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      {pads.map(([u, v], i) => <rect key={i} x={die.x + u - 9} y={die.y + v - 9} width={18} height={18} rx={3} fill="#c9a24a" opacity={out(frame, 40 + i, 48 + i)} />)}
      <rect x={die.x - die.s / 2 + 48} y={die.y - die.s / 2 + 48} width={die.s - 96} height={die.s - 96} rx={10} fill="url(#demo-core)" opacity={(.15 + .75 * lit) * draw} style={{ filter: `drop-shadow(0 0 ${30 * lit}px ${B.brand2})` }} />
      {Array.from({ length: 5 }, (_, i) => { const u = die.x - die.s / 2 + 48 + (i + 1) * (die.s - 96) / 6;
        return <g key={i} opacity={.35 * draw}><line x1={u} y1={die.y - die.s / 2 + 48} x2={u} y2={die.y + die.s / 2 - 48} stroke="#041325" strokeWidth={2} /><line y1={u - die.x + die.y} x1={die.x - die.s / 2 + 48} y2={u - die.x + die.y} x2={die.x + die.s / 2 - 48} stroke="#041325" strokeWidth={2} /></g>; })}
      {lit > 0 && <path d={`M${die.x - 46} ${die.y + 2}l32 32l62 -70`} stroke="#041325" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - out(frame, 108, 124)} />}
    </svg>
    {tiles.map((t, i) => { const k = out(frame, 6 + i * 6, 20 + i * 6), x = t.x + (die.x - t.x) * into, y = t.y + (die.y - t.y) * into;
      return <div key={t.name} style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${(.9 + .1 * k) * (1 - .7 * into)})`, opacity: k * (1 - into),
        padding: '16px 30px', borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 34, color: C.text, whiteSpace: 'nowrap' }}>{t.name}</div>; })}
  </>;
}

/** The name, what it stands for, and the line: the expansion comes in word by word under GENESIS, then the line rises
 * out of a soft blur with a light sweeping across it and a rule drawn under it. `at` is the frame GENESIS lands on. */
export function Signature({ frame, at, size = 150, motto = 'Whatever you want to design.' }: { frame: number; at: number; size?: number; motto?: string }) {
  const name = out(frame, at, at + 28), words = ACRONYM.split(' '), line = out(frame, at + 64, at + 96), sweep = -30 + 160 * Math.min(1, Math.max(0, (frame - at - 70) / 50));
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ opacity: name, transform: `translateY(${(1 - name) * 24}px)`, filter: `blur(${(1 - name) * 8}px)` }}><Wordmark size={size} /></div>
    <div style={{ marginTop: 10, display: 'flex', gap: '0 .42em', fontFamily: 'Inter', fontWeight: 500, fontSize: 30, letterSpacing: '.06em', color: '#b8c8d8' }}>
      {words.map((w, i) => { const k = out(frame, at + 22 + i * 5, at + 38 + i * 5);
        return <span key={i} style={{ opacity: k, transform: `translateY(${(1 - k) * 10}px)` }}><span style={{ color: /^[A-Z]/.test(w) ? C.cyan : undefined, fontWeight: /^[A-Z]/.test(w) ? 700 : 500 }}>{w[0]}</span>{w.slice(1)}</span>; })}
    </div>
    <div style={{ marginTop: 44, position: 'relative', opacity: line, transform: `translateY(${(1 - line) * 18}px)`, filter: `blur(${(1 - line) * 10}px)`, letterSpacing: `${.02 + (1 - line) * .2}em`,
      fontFamily: 'Inter', fontWeight: 600, fontSize: 52, color: C.text }}>
      {motto}
      <span style={{ position: 'absolute', inset: 0, color: 'transparent', backgroundImage: `linear-gradient(100deg, transparent ${sweep - 12}%, #e9fdff ${sweep}%, transparent ${sweep + 12}%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>{motto}</span>
      <div style={{ position: 'absolute', left: '50%', bottom: -16, height: 3, borderRadius: 2, width: `${out(frame, at + 84, at + 116) * 100}%`, transform: 'translateX(-50%)', background: GRADIENT }} />
    </div>
  </div>;
}
const ACRONYM = 'Generative Evolution of Silicon Intelligent Systems';

/** The closing scene: the sunrise, the mark and the signature. */
export function EndView({ frame }: { frame: number }) {
  return <>
    <SunriseView frame={frame} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LitEmblemView frame={frame} width={460} from={6} />
      <div style={{ marginTop: 22 }}><Signature frame={frame} at={18} /></div>
    </div>
  </>;
}
