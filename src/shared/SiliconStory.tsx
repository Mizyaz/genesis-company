import { useEffect, useId, useState, type MouseEvent } from 'react';
import { useLanguage } from './Language';
import { curvePath, designs, response, x, y } from './designStory';

// Illustrative measured points, slightly below the simulated curve as bench losses usually are.
const measured = response(designs.length - 1, 13).slice(1, -1).map((point, i) => ({ f: point.f, db: point.db - 0.5 - 0.3 * Math.sin(i * 1.7) }));

// A square spiral inductor that starts on the outer edge (toward its pad) and ends inside, where an underpass leaves it.
const spiral = (cx: number, cy: number, half: number, pitch: number, turns: number, side: 1 | -1) => {
  let d = `M${cx - side * half} ${cy}`;
  for (let i = 0; i < turns; i++) {
    const h = half - i * pitch;
    d += `V${cy - h}H${cx + side * h}V${cy + h}H${cx - side * (h - pitch)}`;
  }
  return `${d}V${cy}`;
};

// The dies that lie wholly on the wafer, in the order a prober steps through them: row by row, turning at each end.
const dies = Array.from({ length: 49 }, (_, i) => ({ i, col: i % 7, row: Math.floor(i / 7), x: 18 + (i % 7) * 24, y: 88 + Math.floor(i / 7) * 24 }));
const route = dies.filter(die => Math.hypot(die.x + 10 - 100, die.y + 10 - 170) + 14.2 < 86)
  .sort((a, b) => a.row - b.row || (a.row % 2 ? b.col - a.col : a.col - b.col));
// Ground, signal and ground pads on the input and output edges of the close-up, and where each probe tip lands.
const pads = [68, 88, 108];
const edges = [{ side: 'left', pad: 230, tip: 236 }, { side: 'right', pad: 358, tip: 364 }] as const;

/** From wafer to measurement, the way a probe station works: the die is magnified, GSG probes come in from both sides
 * onto its ground-signal-ground pads and the sweep measures it against its simulation. Then the prober steps on to the
 * next die; picking a die on the wafer (or Enter) probes that one instead. */
export function SiliconStory({ legend, active, motion }: { legend: string[]; active: boolean; motion: boolean }) {
  const { t } = useLanguage();
  const id = `service-wafer-${useId().replace(/:/g, '')}`;
  const plot = { left: 244, right: 460, top: 206, bottom: 290 };
  const [probing, setProbing] = useState({ stop: 0, run: 0, measured: false });
  const probe = (stop: number) => setProbing(current => ({ stop, run: current.run + 1, measured: false }));
  // Once a die is measured, the prober moves on after a moment, while the picture is on screen and moving.
  useEffect(() => {
    if (!active || !motion || !probing.measured) return;
    const timer = window.setTimeout(() => probe((probing.stop + 1) % route.length), 1800);
    return () => window.clearTimeout(timer);
  }, [active, motion, probing]);
  const pick = (event: MouseEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const distance = (die: typeof route[number]) => Math.hypot(die.x + 10 - point.x, die.y + 10 - point.y);
    probe(route.reduce((best, die, index) => distance(die) < distance(route[best]) ? index : best, 0));
  };
  const die = route[probing.stop];
  return <svg className="silicon-story" viewBox="0 0 480 320">
    <defs>
      <clipPath id={`${id}-clip`}><circle cx="100" cy="170" r="86" /></clipPath>
      <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".38" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".05" /></linearGradient>
    </defs>
    <g className="silicon-wafer-map" role="button" tabIndex={0} aria-label={t("Probe the next die")} onClick={pick}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); probe((probing.stop + 1) % route.length); } }}>
      <circle className="silicon-wafer" cx="100" cy="170" r="88" />
      <g clipPath={`url(#${id}-clip)`}>{dies.map(item => <rect key={item.i} className="silicon-die" data-reachable={route.includes(item) || undefined} x={item.x} y={item.y} width="20" height="20" rx="2" />)}</g>
    </g>
    <text className="silicon-hint" x="100" y="311" aria-hidden="true">{t("Pick a die to probe it")}</text>
    <g key={probing.run} className="silicon-run" aria-hidden="true">
      {/* The magnified view grows out of the probed die, inside one light beam. */}
      <polygon className="silicon-beam" fill={`url(#${id}-beam)`} points={`${die.x},${die.y + 20} ${die.x},${die.y} 220,24 380,24 380,152 220,152`} />
      <rect className="silicon-die silicon-die-picked" x={die.x} y={die.y} width="20" height="20" rx="2" />
      <g className="silicon-zoom" style={{ transformOrigin: `${die.x + 10}px ${die.y + 10}px` }}>
        <rect className="silicon-closeup" x="220" y="24" width="160" height="128" rx="6" />
        <path className="silicon-ground" d="M236 62V32H364V62M236 114V144H364V114" />
        <path className="silicon-metal" d={`M242 88H255${spiral(270, 88, 15, 5, 2, 1)}${spiral(330, 88, 15, 5, 2, -1)}M345 88H358`} />
        <path className="silicon-underpass" d="M266 88H292M308 88H334" />
        <g className="silicon-via">{[264, 332].map(x => <rect key={x} x={x} y="86" width="4" height="4" />)}</g>
        <rect className="silicon-device" x="292" y="76" width="16" height="24" rx="1" /><path className="silicon-fingers" d="M296 76v24M300 76v24M304 76v24" />
        {edges.map(edge => pads.map(y => <rect key={`${edge.side}${y}`} className="silicon-pad" data-signal={y === 88 || undefined} x={edge.pad} y={y - 6} width="12" height="12" rx="1.5" />))}
      </g>
      {/* A GSG probe from each side, its three tips landing on the ground-signal-ground pads. */}
      {edges.map(edge => {
        const side = (value: number) => edge.side === 'left' ? value : 600 - value;
        return <g key={edge.side} className={`silicon-probe silicon-probe-${edge.side}`}>
          <path className="silicon-probe-body" d={`M${side(174)} 58L${side(216)} 64V112L${side(174)} 118Z`} />
          <path className="silicon-probe-tips" d={pads.map(y => `M${side(216)} ${y}H${edge.tip}`).join('')} />
          {pads.map(y => <circle key={y} className="silicon-contact" cx={edge.tip} cy={y} r="2.5" />)}
        </g>;
      })}
      <path className="silicon-flow" d="M300 152V188m-5-6 5 6 5-6" />
      <path className="silicon-sweep" d="M244 200V290" />
      <g className="silicon-measured" onAnimationEnd={event => { if (event.target === event.currentTarget) setProbing(current => ({ ...current, measured: true })); }}>
        {measured.map(point => <circle key={point.f} cx={x(point.f, plot)} cy={y(point.db, plot)} r="3" />)}
      </g>
    </g>
    <path className="silicon-axis" d="M244 196V290H460" />
    <path className="silicon-simulated" d={curvePath(designs.length - 1, plot)} />
    <g className="silicon-legend" aria-hidden="true"><path d="M244 308h16" /><text x="266" y="311">{legend[0]}</text><circle cx="352" cy="308" r="3" /><text x="362" y="311">{legend[1]}</text></g>
  </svg>;
}
