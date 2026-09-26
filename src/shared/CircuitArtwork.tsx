import { useId } from 'react';
import '../styles/circuit-artwork.css';

type Kind = 'schematic' | 'designer' | 'engine' | 'simulation';
const input = 'M28 104H57c0-24 16-24 16 0c0-24 16-24 16 0c0-24 16-24 16 0c0-24 16-24 16 0H181';
function Signal({ d, delay = 0 }: { d: string; delay?: number }) {
  return <><path className="circuit-trace" d={d} /><path className="circuit-current" d={d} pathLength="300" style={{ animationDelay: `${delay}s` }} /></>;
}
function Ground({ x, y }: { x: number; y: number }) {
  return <path className="circuit-ground" d={`M${x} ${y}v12m-12 0h24m-19 6h14m-10 6h6`} />;
}

function Schematic() {
  return <>
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
  </>;
}

/** Conceptual illustrations, not live simulation results or a PDK layout. */
export function CircuitArtwork({ kind, running = false }: { kind: Kind; running?: boolean }) {
  const grid = `rf-grid-${useId().replace(/:/g, '')}`;
  return <svg className={`circuit-artwork circuit-artwork-${kind}`} data-active={running} viewBox="0 0 320 224" fill="none" aria-hidden="true">
    <defs><pattern id={grid} width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" className="circuit-grid" /></pattern></defs>
    <rect x="8" y="8" width="304" height="208" rx="12" fill={`url(#${grid})`} />
    {kind === 'schematic' && <Schematic />}
    {kind === 'designer' && <>
      <rect className="designer-board" x="101" y="30" width="206" height="156" rx="7" />
      <path className="circuit-ground" d="M191 186v18m-39 0h79M99 208h212" />
      <g transform="translate(109 43) scale(.6)"><Schematic /></g>
      <g className="designer-person">
        <path className="designer-shirt" d="M28 105q8-10 24-10t24 14l-4 69H21l2-47q0-16 5-26Z" />
        <path className="designer-face" d="M38 84v13m19-11v13M30 63q0-24 21-24t20 24v8q-4 18-21 18T30 67Z" />
        <path className="designer-hair" d="M30 67q-10-31 14-36 28-5 28 27l-8-4-4-12q-8 13-30 13Z" />
        <path d="M52 66h4m7 0h4m-5 2v5h3M59 80h5M33 180v28m24-28 13 28M15 177h65M17 144v31" />
        <path className="designer-arm" d="M70 109l27 26 17-12q7-7 12 0t-3 13l-23 14q-6 3-11-1l-27-22M30 125l4 28 34 5" />
      </g>
      <path className="designer-pencil" d="m111 135 15-31m-1 0 4 2" />
      <circle className="circuit-nodes" cx="126" cy="104" r="2" />
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
    {kind === 'simulation' && <>
      <rect className="simulation-screen" x="12" y="25" width="296" height="161" rx="9" />
      <path className="circuit-ground" d="M12 47h296M145 186l-8 19h48l-8-19M119 209h83" />
      <g className="circuit-nodes"><circle cx="24" cy="36" r="2" /><circle cx="32" cy="36" r="2" /><circle cx="40" cy="36" r="2" /></g>
      <g className="simulation-panels"><rect x="27" y="57" width="177" height="115" rx="3" /><rect x="215" y="57" width="80" height="56" rx="3" /><rect x="215" y="121" width="80" height="51" rx="3" /></g>
      <path className="simulation-grid" d="M43 78h150M43 103h150M43 128h150M67 64v92m31-92v92m31-92v92m31-92v92M221 85h68m-68 63h68" />
      <path className="simulation-axes" d="M40 63v96h156" />
      <path className="simulation-response" d="M43 77C76 77 83 78 98 102S114 151 128 139S147 82 161 80S181 89 194 84" />
      <path className="simulation-response simulation-secondary" d="M43 146C68 146 83 132 98 115S123 73 140 80S166 137 194 139" />
      <path className="simulation-sweep" d="M44 63v94" />
      <g className="circuit-label"><text x="65" y="40">S₁₁</text><text x="101" y="40">S₂₁</text><text x="172" y="169">GHz</text></g>
      <path className="simulation-response" d="M222 86q5-27 11 0t11 0t11 0t11 0t11 0t11 0" />
      <path className="simulation-response simulation-secondary" d="M222 156v-20h10v20h11v-20h11v20h11v-20h11v20h11" />
      <path className="circuit-current" d="M222 86q5-27 11 0t11 0t11 0t11 0t11 0t11 0" pathLength="300" />
    </>}
  </svg>;
}
