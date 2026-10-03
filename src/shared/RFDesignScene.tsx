import { useLanguage } from './Language';

/** A deliberately illustrative circuit, shared by the introduction and the RF explanation. No simulated data. */
function Chip({ refined = false }: { refined?: boolean }) {
  return <g className="rf-chip">
    <rect className="rf-die" x="200" y="60" width="320" height="240" rx="12" />
    {[220, 275, 330, 385, 440, 495].map(x => <g key={x}><rect className="rf-pad" x={x} y="71" width="15" height="15" /><rect className="rf-pad" x={x} y="274" width="15" height="15" /></g>)}
    {[108, 150, 192, 234].map(y => <g key={y}><rect className="rf-pad" x="211" y={y} width="15" height="15" /><rect className="rf-pad" x="494" y={y} width="15" height="15" /></g>)}
    <path className="rf-ground" d="M235 94H485V266H235ZM250 250H470" />
    <path className="rf-metal" d={refined ? 'M226 157H257V128H293V180H340M380 180H409V218H449V199H494' : 'M226 157H247V118H303V180H340M380 180H399V228H459V199H494'} />
    <path className="rf-coil" d="M257 143V115H287V143H264V122H280V136M419 219V192H449V219H426V199H442V212" />
    <rect className="rf-active" x="337" y="146" width="46" height="66" rx="3" />
    {[346, 354, 362, 370].map(x => <path className="rf-gate" key={x} d={`M${x} 138V220`} />)}
    <path className="rf-metal rf-bias" d="M360 86V131M360 229V274" />
  </g>;
}

function Schematic() {
  return <g className="rf-schematic">
    <path d="M92 170H147m28 0h38m66 0h55m28 0h85m66 0h115M147 150v40m28-40v40M213 170c0-28 22-28 22 0c0-28 22-28 22 0c0-28 22-28 22 0M447 170c0-28 22-28 22 0c0-28 22-28 22 0c0-28 22-28 22 0" />
    <path className="rf-gate" d="M334 140v60m14-60v60m0-50h14v-30m-14 70h14v30M334 170h-26M362 120h53v50M362 220v28m-18 0h36m-29 8h22m-15 8h8" />
    <path d="M547 170v54m-14 0h28m-28 12h28m-14 0v28m-18 0h36m-29 8h22m-15 8h8" />
    <circle cx="90" cy="170" r="6" /><circle cx="630" cy="170" r="6" />
    <circle className="rf-junction" cx="547" cy="170" r="3" />
    <path className="rf-signal" pathLength="100" d="M97 170H145M177 170H211M281 170H329M385 170H445M515 170H623" />
  </g>;
}

export function RFDesignScene({ stage, verified = false }: { stage: number; verified?: boolean }) {
  const { t } = useLanguage();
  return <svg className="rf-design-scene" viewBox="0 0 720 360" aria-hidden="true" data-stage={stage} data-verified={verified}>
    <path className="rf-grid" d="M80 100H640M80 180H640M80 260H640M160 40V320M240 40V320M320 40V320M400 40V320M480 40V320M560 40V320" />
    {stage === 0 && <g className="rf-scene-enter">
      <rect className="rf-outline" x="160" y="95" width="90" height="165" rx="14" />
      <path className="rf-detail" d="M190 111h30m-22 133h14" />
      <path className="rf-signal" d="M187 177h9l7-18 10 35 8-17h10" />
      <path className="rf-wave" d="M278 155q25 25 0 50m20-68q44 43 0 86m22-104q62 61 0 122" />
      <g transform="translate(335 91) scale(.5)"><Chip refined /></g>
      <text x="205" y="304">{t('Your application')}</text><text x="515" y="304">{t('Your chip')}</text>
    </g>}
    {stage === 1 && <g className="rf-scene-enter"><Schematic /><text x="360" y="320">{t('Components designed to work together')}</text></g>}
    {stage === 2 && <g className="rf-scene-enter"><Chip /><path className="rf-dimension" d="M200 324H520m-320-5v10m320-10v10" /></g>}
    {stage === 3 && <g className="rf-scene-enter">
      <g transform="translate(-67 40) scale(.8)"><Chip refined={verified} /></g>
      <path className="rf-detail" d="M382 180h30m-7-6 7 6-7 6" />
      <rect className="rf-chart" x="438" y="100" width="222" height="166" rx="10" />
      <path className="rf-detail" d="M459 121V243H641" />
      <path className="rf-target" d="M463 177H638" />
      <path className="rf-response" d={verified ? 'M466 226C485 225 491 205 507 184S538 157 553 159S582 180 596 199S620 224 637 226' : 'M466 226C497 226 509 219 534 205S562 185 580 186S607 208 637 226'} />
      <text x="549" y="84">{t('Signal performance')}</text>
      <text x="549" y="296">{t(verified ? 'Meets the design targets' : 'Check, adjust, check again')}</text>
    </g>}
    {stage === 4 && <g className="rf-scene-enter">
      <g transform="translate(-20 6) scale(.95)"><Chip refined /></g>
      <rect className="rf-sheet" x="458" y="169" width="112" height="138" rx="8" />
      {[199, 234, 269].map(y => <g key={y}><path className="rf-check" d={`M474 ${y}l5 5 10-11`} /><path className="rf-detail" d={`M501 ${y}h48`} /></g>)}
    </g>}
  </svg>;
}
