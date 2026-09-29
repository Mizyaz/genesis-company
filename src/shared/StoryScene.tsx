import { useEffect, useId, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useVisibleMotion } from './MotionSettings';
import { coil, ground, usePress } from './DesignStory';
import '../styles/story-scene.css';

export type SceneContent = {
  caption: string; outcome: string;
  expertise: { title: string; detail: string };
  agents: { title: string; detail: string };
};

// 0 blank screen, 1 the designer draws the circuit, 2 a signal runs through it, 3-5 the agents
// check three candidates, 6 expertise and agents join in GENESIS, which turns them into a chip.
const durations = [500, 2000, 1300, 1100, 1300, 1100, 4600];
const final = durations.length - 1;
const best = 1;
const candidates = [
  { turns: 2, cap: 7, curve: (y: number) => `M106 ${y + 12}C120 ${y - 9} 132 ${y - 8} 146 ${y + 4}S178 ${y - 8} 210 ${y + 11}` },
  { turns: 3, cap: 9, curve: (y: number) => `M106 ${y + 12}C114 ${y - 10} 128 ${y - 9} 156 ${y - 9}S198 ${y - 10} 210 ${y + 10}` },
  { turns: 4, cap: 11, curve: (y: number) => `M106 ${y + 12}C118 ${y - 9} 140 ${y - 8} 162 ${y - 7}S188 ${y + 4} 210 ${y + 12}` },
];
/** Each part of the scene is a button that plays its own moment again, from the phase where it starts. */
type Part = 'expertise' | 'agents' | 'outcome';
const moment: Record<Part, number> = { expertise: 1, agents: 3, outcome: final };
// Sparks around the check GENESIS stamps on the die, when a click asked for it.
const sparks = Array.from({ length: 8 }, (_, i) => {
  const angle = (i + .5) * Math.PI / 4, at = (r: number) => `${(104 + r * Math.cos(angle)).toFixed(1)} ${(8 + r * Math.sin(angle)).toFixed(1)}`;
  return `M${at(11)}L${at(22)}`;
});

/** A designer at the workstation draws an amplifier stage; a signal runs through it once it is complete. */
function ExpertiseArt({ drawn, drawing, signal }: { drawn: boolean; drawing: boolean; signal: boolean }) {
  const strokes = ['M87 56H94', coil(94, 56, 4, 24), 'M118 56H150', `M132 56v6M126 62h12M126 66h12M132 66v7${ground(132, 73)}`,
    'M150 46V66M155 43V69', `M155 48H168V30H186M155 64H164V73${ground(164, 73)}M160 61l3 3-3 3`];
  return <svg className="scene-art" viewBox="0 0 220 150" aria-hidden="true">
    <rect className="art-screen" x="70" y="8" width="142" height="92" rx="6" />
    <path className="art-wire" d="M141 100v40M126 140h30M4 144h212" />
    {strokes.map((d, i) => <path key={i} className="scene-draw" style={{ '--i': i } as CSSProperties} data-on={drawn} d={d} pathLength="1" />)}
    <circle className="art-port scene-fade" data-on={drawn} cx="84" cy="56" r="3" /><circle className="art-port scene-fade" data-on={drawn} cx="189" cy="30" r="3" />
    <path className="scene-signal" data-on={signal} d="M87 56H150M155 48H168V30H186" pathLength="1" />
    <circle className="scene-ring" data-on={signal} cx="189" cy="30" r="3" />
    <path className="scene-pen" data-on={drawing} d="M0 0l3-9 13-13 6 6-13 13Z" />
    <g className="art-person">
      <rect x="42" y="100" width="12" height="14" rx="3" />
      <path d="M18 144c0-20 13-32 30-32s30 12 30 32Z" />
      <circle cx="48" cy="88" r="14" />
      <path className="art-hair" d="M34 87a14 14 0 0 1 28 0c-4-5-8-7-14-7s-10 2-14 7Z" />
    </g>
  </svg>;
}

/** Three candidate stages, each simulated against the same target line; the one that stays above it is kept. */
function AgentsArt({ phase }: { phase: number }) {
  return <svg className="scene-art" viewBox="0 0 220 150" aria-hidden="true">
    {candidates.map((candidate, row) => {
      const top = 6 + row * 47, y = top + 20;
      const state = phase < 3 + row ? 'waiting' : phase === 3 + row ? 'checking' : row === best ? 'kept' : phase === final ? 'dropped' : 'checked';
      const c = candidate.cap / 2;
      return <g key={row} className="agent-row" data-state={state}>
        <rect className="agent-row-box" x="2" y={top} width="216" height="40" rx="7" />
        <path className="art-wire" d={`M16 ${y}H22${coil(22, y, candidate.turns, 16)}M38 ${y}H60M48 ${y}v4M${48 - c} ${y + 4}h${candidate.cap}M${48 - c} ${y + 7}h${candidate.cap}M48 ${y + 7}v3${ground(48, y + 10)}`} />
        <path className="art-wire" d={`M60 ${y - 7}V${y + 7}M64 ${y - 9}V${y + 9}M64 ${y - 5}H72V${y - 12}H84M64 ${y + 5}H70V${y + 10}${ground(70, y + 10)}`} />
        <circle className="art-port" cx="14" cy={y} r="2.5" /><circle className="art-port" cx="86.5" cy={y - 12} r="2.5" />
        <path className="agent-axis" d={`M104 ${top + 4}V${top + 36}H212`} />
        <path className="agent-target" d={`M114 ${y - 2}H200`} />
        <path className="agent-curve scene-draw" data-on={phase >= 3 + row} d={candidate.curve(y)} pathLength="1" />
        {row === best && <g className="agent-check" data-on={phase >= 3 + row}><circle cx="206" cy={top + 8} r="6" /><path d={`M203 ${top + 8}l2 2 4-4`} /></g>}
      </g>;
    })}
    {/* The agent: it moves to the candidate it is checking and stays with the one it keeps. */}
    <path className="scene-agent" data-on={phase >= 3} style={{ transform: `translate(97px, ${26 + 47 * (phase >= 3 && phase <= 5 ? phase - 3 : best)}px)` }}
      d="M0-7L1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z" />
  </svg>;
}

/** What GENESIS hands back: a finished stage on a die, checked. When a click asked for it, the check lands with sparks. */
function OutputArt({ on, burst }: { on: boolean; burst: boolean }) {
  return <svg className="scene-output" data-on={on} viewBox="0 0 120 60" aria-hidden="true">
    <path className="scene-output-arrow" d="M4 30H40m-7-6 7 6-7 6" pathLength="1" />
    <g className="scene-die">
      <rect x="48" y="4" width="56" height="52" rx="4" />
      <path className="scene-die-metal" d="M53 30V23H67V37H56V26H64V34H59V30M99 30V23H85V37H96V26H88V34H93V30" />
      <path className="scene-die-under" d="M59 30H72M80 30H93" />
      <rect className="scene-die-device" x="72" y="24" width="8" height="12" />
    </g>
    <g className="scene-die-check"><circle cx="104" cy="8" r="7" /><path d="M100.5 8l2.4 2.4 4.6-4.6" /></g>
    {burst && on && <g className="scene-sparks"><circle cx="104" cy="8" r="8" />{sparks.map(d => <path key={d} d={d} pathLength="1" />)}</g>}
  </svg>;
}

/** Our story as one short scene: RFIC expertise and AI agents, joined in GENESIS. Motion pauses offscreen and when stopped.
 * Every part is a button that plays its own moment again and the scene carries on from there: the designer draws the
 * circuit, the agents check the candidates, GENESIS joins both and stamps the chip. With motion stopped, a click marks
 * the part in the finished scene. */
export function StoryScene({ content, brand }: { content: SceneContent; brand: ReactNode }) {
  const { ref, enabled, running } = useVisibleMotion<HTMLElement>();
  const [index, setIndex] = useState(0);
  // A new key mounts a part's drawing again, so its moment plays from the first frame.
  const [runs, setRuns] = useState<Record<Part, number>>({ expertise: 0, agents: 0, outcome: 0 });
  const [burst, setBurst] = useState(false);
  const [marked, setMarked] = useState<Part | null>(null);
  const { press, wave } = usePress<Part>(enabled);
  const id = useId();
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (index === final) setBurst(false);
      setIndex(index === final ? 0 : index + 1);
    }, durations[index]);
    return () => window.clearTimeout(timer);
  }, [index, running, runs]);
  const play = (part: Part) => (event: MouseEvent<HTMLButtonElement>) => {
    press(part, event);
    if (!enabled) { setMarked(part); return; }
    setRuns(value => ({ ...value, [part]: value[part] + 1 }));
    setBurst(part === 'outcome');
    setIndex(moment[part]);
  };
  const phase = enabled ? index : final;
  const still = (part: Part) => !enabled && marked === part;
  return <figure ref={ref} className="story-scene-figure" aria-label={content.caption} data-motion={enabled ? 'on' : 'off'} data-phase={phase}>
    <div className="scene-stage">
      <div className="scene-row">
        <button type="button" className="scene-card scene-part" data-active={phase === 1 || phase === 2 || still('expertise')} aria-describedby={`${id}-expertise`} onClick={play('expertise')}>
          {wave('expertise')}
          <ExpertiseArt key={runs.expertise} drawn={phase >= 1} drawing={phase === 1} signal={phase === 2} />
          <span className="scene-title">{content.expertise.title}</span>
          <span className="sr-only" id={`${id}-expertise`} aria-hidden="true">{content.expertise.detail}</span>
        </button>
        <button type="button" className="scene-card scene-card-agents scene-part" data-active={(phase >= 3 && phase <= 5) || still('agents')} aria-describedby={`${id}-agents`} onClick={play('agents')}>
          {wave('agents')}
          <AgentsArt key={runs.agents} phase={phase} />
          <span className="scene-title">{content.agents.title}</span>
          <span className="sr-only" id={`${id}-agents`} aria-hidden="true">{content.agents.detail}</span>
        </button>
      </div>
      <span className="scene-join" key={runs.outcome} data-on={phase === final} aria-hidden="true"><span className="scene-pulse" /><span className="scene-pulse scene-pulse-right" /></span>
      <button type="button" className="scene-outcome scene-part" data-on={phase === final} data-active={still('outcome')} onClick={play('outcome')}>
        {wave('outcome')}
        <span className="scene-outcome-name">{brand}<span>{content.outcome}</span></span>
        <OutputArt key={runs.outcome} on={phase === final} burst={burst} />
      </button>
    </div>
  </figure>;
}
