import { useId, useState } from 'react';
import { Icon } from './ui';
import { useVisibleMotion } from './MotionSettings';
import '../styles/membership-value.css';

export type MembershipContent = {
  label: string;
  benefits: { id: string; icon: string; title: string; detail: string; labels: string[] }[];
};

function CircuitTile({ x, y, index = 0 }: { x: number; y: number; index?: number }) {
  return <g transform={`translate(${x} ${y})`} className="membership-circuit">
    <rect width="100" height="66" rx="8" />
    <path className="membership-device" d="M10 27h13c0-16 10-16 10 0c0-16 10-16 10 0h13m0-12v24m6-24v24m0-22h13v-7h14M62 37h13v17m-7 0h14m-11 5h8" />
    <path className="membership-capacitor" d="M30 27v15m-7 0h14m-14 5h14m-7 0v10" />
    <path className="membership-variant" d={`M43 48h${10 + index * 7}m-${10 + index * 7} 6h${24 - index * 7}`} />
    <circle cx="11" cy="27" r="2" /><circle cx="89" cy="10" r="2" />
  </g>;
}

function ResponsePlot({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`} className="membership-plot">
    <rect width="106" height="94" rx="8" />
    <path className="membership-axis" d="M16 12v67h79M16 29h78M16 49h78M36 12v67m20-67v67m20-67v67" />
    <path className="membership-response" d="M18 24C35 24 37 30 48 61S65 34 77 27S91 34 96 30" />
    <path className="membership-response secondary" d="M18 68C36 68 40 52 51 37S64 25 77 53S90 67 96 64" />
    <path className="membership-scan" d="M19 14v62" />
  </g>;
}

/** Illustrates the customer outcome. It neither simulates a circuit nor creates a subscription. */
export function MembershipValue({ content }: { content: MembershipContent }) {
  const [selected, setSelected] = useState(0);
  const { ref, running } = useVisibleMotion<HTMLElement>();
  const diagramId = `membership-${useId().replace(/:/g, '')}`;
  const benefit = content.benefits[selected] ?? content.benefits[0];
  const paths = benefit.id === 'explore'
    ? 'M84 151H112V57H155M112 151H155M112 151V245H155M255 57H296V151H345M255 151H345M255 245H296V151'
    : benefit.id === 'iterate'
      ? 'M145 109C155 41 311 41 340 101M351 202C329 271 164 271 143 202'
      : 'M205 155H243Q270 155 288 155H330';
  return <figure ref={ref} className="membership-value" data-active={running} data-benefit={benefit.id} aria-label={content.label}>
    <div className="membership-choices" role="group" aria-label={content.label}>
      {content.benefits.map((option, i) => <button type="button" aria-pressed={selected === i} aria-controls={diagramId} onClick={() => setSelected(i)} key={option.id}><Icon name={option.icon} /><span>{option.title}</span></button>)}
    </div>
    <div id={diagramId} className="membership-diagram">
      <svg viewBox="0 0 480 300" fill="none" aria-hidden="true">
        <path className="membership-connection" d={paths} />
        <path className="membership-flow" d={paths} pathLength="100" />
        {benefit.id === 'explore' && <>
          <g className="membership-brief"><path d="M27 110h42l16 16v67H27Z" /><path d="M67 110v19h18M39 144h27m-27 11h18m-18 23 7-8 9 9 13-18" /></g>
          {[24, 118, 212].map((y, i) => <CircuitTile x={155} y={y} index={i} key={y} />)}
          <ResponsePlot x={345} y={104} />
          <g className="membership-labels"><text x="55" y="223">{benefit.labels[0]}</text><text x="205" y="13">{benefit.labels[1]}</text><text x="398" y="223">{benefit.labels[2]}</text></g>
        </>}
        {benefit.id === 'iterate' && <>
          <CircuitTile x={82} y={118} /><ResponsePlot x={300} y={104} />
          <path className="membership-arrow" d="m328 94 13 8 4-15m-191 122-12-8-4 15" />
          <g className="membership-controls"><path d="M213 139h47m-47 15h47m-47 15h47M226 134v10m22 5v10m-19 5v10" /></g>
          <g className="membership-labels"><text x="240" y="32">{benefit.labels[0]}</text><text x="135" y="210">{benefit.labels[1]}</text><text x="356" y="220">{benefit.labels[2]}</text></g>
        </>}
        {benefit.id === 'reuse' && <>
          <g className="membership-records"><rect x="43" y="72" width="141" height="98" rx="8" /><rect x="54" y="85" width="141" height="98" rx="8" /><rect x="65" y="98" width="141" height="98" rx="8" /><path d="M78 112h22m-22 9h42m-41 57h110M79 139c30 0 26 44 46 34s21-29 35-21 13 11 28 3" /></g>
          <circle className="membership-saved" cx="196" cy="191" r="14" /><path className="membership-check" d="m189 191 5 5 9-11" />
          <path className="membership-arrow" d="m313 148 12 7-12 7" /><CircuitTile x={331} y={123} />
          <g className="membership-labels"><text x="129" y="233">{benefit.labels[0]}</text><text x="270" y="128">{benefit.labels[1]}</text><text x="381" y="233">{benefit.labels[2]}</text></g>
        </>}
      </svg>
    </div>
    <figcaption aria-live="polite"><strong>{benefit.title}</strong><p>{benefit.detail}</p></figcaption>
  </figure>;
}
