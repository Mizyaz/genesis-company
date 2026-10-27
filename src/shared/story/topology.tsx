import type { ReactNode } from 'react';
import { alpha, C, P } from './palette';

// The choice cards of the conversation: each topology as one switch arm (antenna on the left, RF port on the right) and
// its textbook trade-offs. The marks are qualitative (low, medium, high), no measured values: a series FET alone passes
// the most with the least, a shunt FET to ground adds isolation, and a line of coils with shunt FETs (distributed)
// spreads the FET capacitance for bandwidth at the cost of area and line modelling.
const TRADES = ['Isolation', 'Bandwidth', 'Low loss', 'Compact'] as const;
const LEVELS: Record<string, [number, number, number, number]> = {
  Series: [1, 2, 3, 3],
  'Series–shunt': [3, 2, 2, 2],
  'Distributed / tuned': [2, 3, 2, 1],
};
export const hasSketch = (name: string) => name in LEVELS;

type Stroke = { stroke: string; strokeWidth: number; fill: string; strokeLinecap: 'round'; strokeLinejoin: 'round' };
/** A FET drawn along the wire (series, from x - 22 to x + 22 at y) or down from it to ground (shunt, from y to y + 44 at x). */
function Fet({ x, y, shunt, p }: { x: number; y: number; shunt?: boolean; p: Stroke }) {
  const d = 'M-22 0H-11V-9H11V0H22M-11 -17H11M0 -17V-27';
  if (!shunt) return <path transform={`translate(${x} ${y})`} d={d} {...p} />;
  // Down from the wire to ground.
  return <g><path transform={`translate(${x} ${y + 22}) rotate(90)`} d={d} {...p} />
    <path d={`M${x - 11} ${y + 44}H${x + 11}M${x - 7} ${y + 50}H${x + 7}M${x - 3} ${y + 56}H${x + 3}`} {...p} /></g>;
}
const coil = (x: number, y: number, w: number) => `M${x} ${y}` + [0, 1, 2].map(i => `a${w / 6} ${w / 6} 0 0 1 ${w / 3} 0`).join('');

/** One arm of the topology, drawn 264 units wide and shown w x h, in the card's colour. */
export function TopologySketch({ name, w: shownW, h: shownH, colour }: { name: string; w: number; h: number; colour: string }) {
  const w = 264, h = 264 * shownH / shownW;
  const p: Stroke = { stroke: colour, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const y = h * .3, a = 14, b = w - 14;
  const port = (x: number, label: string) => <g><circle cx={x} cy={y} r={5} fill={C.card} stroke={colour} strokeWidth={2.4} />
    <text x={x} y={y + 22} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={12} fill={C.muted}>{label}</text></g>;
  let body: ReactNode;
  if (name === 'Series') {
    const m = w / 2;
    body = <><path d={`M${a + 7} ${y}H${m - 22}M${m + 22} ${y}H${b - 7}`} {...p} /><Fet x={m} y={y} p={p} /></>;
  } else if (name === 'Series–shunt') {
    const m = w * .4, n = w * .68;
    body = <><path d={`M${a + 7} ${y}H${m - 22}M${m + 22} ${y}H${b - 7}`} {...p} /><Fet x={m} y={y} p={p} /><circle cx={n} cy={y} r={4} fill={colour} /><Fet x={n} y={y} shunt p={p} /></>;
  } else {
    // An artificial line: coils in series, a shunt FET at each node between them.
    const seg = (b - a - 10) / 3, c = 30, xs = [0, 1, 2].map(i => a + 7 + i * seg + (seg - c) / 2);
    body = <>{xs.map((x, i) => <g key={i}><path d={`M${i ? xs[i - 1] + c : a + 7} ${y}H${x}`} {...p} /><path d={coil(x, y, c)} {...p} /></g>)}
      <path d={`M${xs[2] + c} ${y}H${b - 7}`} {...p} />
      {[0, 1].map(i => { const x = (xs[i] + c + xs[i + 1]) / 2; return <g key={i}><circle cx={x} cy={y} r={4} fill={colour} /><Fet x={x} y={y} shunt p={p} /></g>; })}</>;
  }
  return <svg width={shownW} height={shownH} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>{body}{port(a + 5, 'ANT')}{port(b - 5, 'RF')}</svg>;
}

/** The topology's trade-offs as three-step bars, filled by `k` (0 to 1) so they grow in. */
export function TradeBars({ name, colour, k }: { name: string; colour: string; k: number }) {
  const levels = LEVELS[name];
  return <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 9, alignItems: 'center', fontFamily: 'Inter' }}>
    {TRADES.map((t, i) => <div key={t} style={{ display: 'contents' }}>
      <span style={{ fontSize: 21, fontWeight: 500, color: C.muted }}>{t}</span>
      <span style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(j => {
        const fill = Math.max(0, Math.min(1, k * 3 * 1.2 - j * 1.1 - i * .25));
        return <span key={j} style={{ flex: 1, height: 12, borderRadius: 4, background: alpha(P.glow, 0x14 / 255), overflow: 'hidden' }}>
          {j < levels[i] && <span style={{ display: 'block', height: '100%', width: `${fill * 100}%`, background: colour, borderRadius: 4 }} />}</span>;
      })}</span>
    </div>)}
  </div>;
}
