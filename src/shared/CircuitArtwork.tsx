import { useId } from 'react';
import '../styles/circuit-artwork.css';

type Kind = 'schematic' | 'engine' | 'layout';
const input = 'M28 104H57c0-24 16-24 16 0c0-24 16-24 16 0c0-24 16-24 16 0c0-24 16-24 16 0H181';
const spiral = 'M16 110H42V68L65 45H124L147 68V143L124 166H65L42 143V88L73 57H115L135 77V134L115 154H73L54 135V98L83 69H106L123 86V125L106 142H84L66 124V110H169';
function Signal({ d, delay = 0 }: { d: string; delay?: number }) {
  return <><path className="circuit-trace" d={d} /><path className="circuit-current" d={d} pathLength="300" style={{ animationDelay: `${delay}s` }} /></>;
}
function Ground({ x, y }: { x: number; y: number }) {
  return <path className="circuit-ground" d={`M${x} ${y}v12m-12 0h24m-19 6h14m-10 6h6`} />;
}

/** Conceptual RF artwork, not a simulation or a PDK layout. Shared by company diagrams. */
export function CircuitArtwork({ kind, running = false }: { kind: Kind; running?: boolean }) {
  const grid = `rf-grid-${useId().replace(/:/g, '')}`;
  return <svg className={`circuit-artwork circuit-artwork-${kind}`} data-active={running} viewBox="0 0 320 224" fill="none" aria-hidden="true">
    <defs><pattern id={grid} width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" className="circuit-grid" /></pattern></defs>
    <rect x="8" y="8" width="304" height="208" rx="12" fill={`url(#${grid})`} />
    {kind === 'schematic' && <>
      <g className="circuit-radio"><path d="M17 80q-18 24 0 48" /><path d="M9 70q-24 34 0 68" /></g>
      <circle className="circuit-port" cx="23" cy="104" r="5" />
      <Signal d={input} />
      <path className="circuit-violet" d="M144 104v30m-13 0h26m-26 9h26m-13 0v27" />
      <Ground x={144} y={170} />
      <g className="circuit-mos"><path d="M181 83v48M192 83v48m0-43h17V47h73m-90 80h17v43M198 121l-6 6 6 6" /><path className="circuit-device-body" d="M169 72h51v69h-51z" /></g>
      <Ground x={209} y={170} />
      <circle className="circuit-port" cx="287" cy="47" r="5" />
      <Signal d="M210 47H282" delay={-.8} />
      <g className="circuit-nodes"><circle cx="144" cy="104" r="3" /><circle cx="209" cy="47" r="3" /></g>
      <g className="circuit-label"><text x="78" y="64">L₁</text><text x="158" y="144">C₁</text><text x="230" y="111">M₁</text><text x="17" y="156">RF</text><text x="257" y="30">OUT</text></g>
      <path className="circuit-wave-guide" d="M24 211h270" />
      <path className="circuit-wave" d="M26 211q9-14 18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0" />
    </>}
    {kind === 'engine' && <>
      <circle className="circuit-orbit" cx="160" cy="111" r="96" />
      <circle className="circuit-orbit circuit-orbit-inner" cx="160" cy="111" r="82" />
      {[0,1,2,3,4,5].map(i => <g key={i} className="circuit-pins"><path d={`M${128+i*13} 28V58M${128+i*13} 164v30M77 ${78+i*13}h30M213 ${78+i*13}h30`} /></g>)}
      <rect className="circuit-package" x="104" y="56" width="112" height="112" rx="13" />
      <rect className="circuit-core" x="119" y="71" width="82" height="82" rx="8" />
      <path className="circuit-logo-shadow" d="M132 118q8-47 17-12t17 1t21 12" />
      <path className="circuit-logo" d="M132 118q8-47 17-12t17 1t21 12" />
      <Signal d="M8 111h69M243 111h69" />
      <g className="circuit-radio circuit-radio-output"><path d="M272 87q16 24 0 48" /><path d="M285 74q24 37 0 74" /></g>
      <circle className="circuit-nodes" cx="160" cy="16" r="3" />
    </>}
    {kind === 'layout' && <>
      <rect className="circuit-die" x="24" y="24" width="274" height="170" rx="4" />
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => <g className="circuit-vias" key={i}><rect x={32+i*20} y="28" width="3" height="3" /><rect x={32+i*20} y="187" width="3" height="3" /></g>)}
      <path className="circuit-metal" d={spiral} /><path className="circuit-current" d={spiral} pathLength="300" />
      <path className="circuit-violet" d="M169 110h12V70h102M176 143h107V110h20" />
      <g className="circuit-fingers">{[0,1,2,3,4,5,6,7,8].map(i => <path key={i} d={`M${185+i*10} 73v67`} />)}</g>
      <path className="circuit-metal circuit-mim" d="M186 158h87m-87 7h87m-87 7h87m-87 7h87" />
      <g className="circuit-pads"><rect x="10" y="104" width="12" height="12" /><rect x="296" y="104" width="12" height="12" /></g>
      <path className="circuit-wave-guide" d="M28 215h265" />
      <path className="circuit-wave" d="M28 214C67 213 64 202 85 202S103 220 123 217S154 183 178 194S216 215 294 214" />
    </>}
  </svg>;
}
