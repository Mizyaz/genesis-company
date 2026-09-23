import { useId, type CSSProperties } from 'react';
import { Brand } from './ui';
import { useVisibleMotion } from './MotionSettings';
import '../styles/circuit-identity.css';

const wordmarkTraces = [
  'M0 108H38L64 134H198L210 146H326',
  'M706 70H662L640 48H564L544 28H464',
  'M150 160H230L248 142H452L468 126H594L616 148H706',
  'M16 38H116L132 22H246L262 38H302',
];

/** Keeps the shared wordmark intact; only this optional wrapper animates it. */
export function ElectricBrand() {
  const { ref, running } = useVisibleMotion<HTMLSpanElement>();
  return <span ref={ref} className="electric-brand" data-running={running}>
    <svg className="electric-brand-traces" viewBox="0 0 706 180" fill="none" aria-hidden="true">
      {wordmarkTraces.map((d, index) => <g key={d} style={{ '--phase': `${index * -1.7}s` } as CSSProperties}>
        <path className="identity-rail" d={d} />
        <path className="identity-signal" d={d} pathLength="100" />
      </g>)}
      {[[326, 146], [464, 28], [150, 160], [302, 38]].map(([cx, cy]) => <circle className="identity-contact" key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.8" />)}
    </svg>
    <Brand large />
  </span>;
}

const chips = [
  { x: 138, y: 150, scale: 1.2, angle: -14, phase: -7, duration: 32 },
  { x: 1242, y: 180, scale: .9, angle: 16, phase: -19, duration: 38 },
  { x: 280, y: 665, scale: .8, angle: 12, phase: -12, duration: 35 },
  { x: 1330, y: 603, scale: 1.25, angle: -12, phase: -24, duration: 42 },
  { x: 660, y: 60, scale: .5, angle: 22, phase: -4, duration: 34 },
  { x: 853, y: 814, scale: .65, angle: -18, phase: -28, duration: 40 },
];
const pins = [-30, -18, -6, 6, 18, 30];
const backgroundTraces = [
  'M0 295H148L206 237H348V177H478',
  'M1440 334H1295L1240 389H1156V469H1030',
  'M0 760H154L220 694H436L486 744H628',
  'M1440 718H1290L1238 770H1115L1065 820H967',
];

/** Decorative, deterministic SVG only. No renderer, product state or external assets. */
export function CircuitBackdrop() {
  const { ref, running } = useVisibleMotion<HTMLDivElement>();
  const chipId = useId();
  return <div ref={ref} className="circuit-backdrop" data-running={running} aria-hidden="true">
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs><g id={chipId} stroke="currentColor" strokeWidth="1">
        <rect x="-48" y="-48" width="96" height="96" rx="6" />
        <rect x="-39" y="-39" width="78" height="78" rx="2" />
        {pins.map(position => <path key={position} d={`M${position} -64v16M${position} 48v16M-64 ${position}h16M48 ${position}h16`} />)}
        {[-25, 5].flatMap(x => [-25, 5].map(y => <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="20" height="20" rx="1" />
          <path d={`M${x + 4} ${y + 5}h12m-12 5h12m-12 5h7`} opacity=".6" />
        </g>))}
        <path d="M-38 0H38M0-38V38M-30-39v-9M30 39v9M-39 30h-9M39-30h9" />
        <circle cx="-33" cy="-33" r="2" fill="currentColor" stroke="none" />
      </g></defs>
      <g className="backdrop-traces">
        {backgroundTraces.map((d, index) => <g key={d} style={{ '--phase': `${index * -4}s` } as CSSProperties}>
          <path className="identity-rail" d={d} />
          <path className="identity-signal" d={d} pathLength="100" />
        </g>)}
      </g>
      {chips.map((chip, index) => <g key={index} transform={`translate(${chip.x} ${chip.y}) rotate(${chip.angle}) scale(${chip.scale})`}>
        <g className="backdrop-chip" style={{ '--phase': `${chip.phase}s`, '--period': `${chip.duration}s` } as CSSProperties}>
          <use href={`#${chipId}`} />
        </g>
      </g>)}
    </svg>
  </div>;
}
