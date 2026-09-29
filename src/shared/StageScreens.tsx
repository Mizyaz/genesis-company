import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type RefObject } from 'react';
import { Icon } from './ui';
import { useLanguage } from './Language';
import { coil, ground } from './symbols';
import { pixelPassives } from './pixelLayout';
import '../styles/tube-screen.css';

// What each platform stage looks like inside GENESIS, drawn for the stage's tube screen. Illustrations, not data.
const vars = (values: Record<string, number | string>) => values as CSSProperties;

/** Specification: the targets become goals; the assistant walks the sheet and sets each one. */
function Targets() {
  const goals = [128, 104, 146, 116];
  return <>
    {goals.map((goal, row) => {
      const y = 18 + row * 26;
      return <g key={row}>
        <rect className="scr-frame" x="8" y={y - 9} width="184" height="18" rx="5" />
        <path className="scr-dim" d={`M16 ${y}h28`} />
        <path className="scr-track" d={`M60 ${y}H162`} />
        <path className="scr-goal" d={`M${goal} ${y - 6}v12`} />
        <circle className="scr-knob" style={vars({ '--from': `${60 - goal}px`, '--r': row })} cx={goal} cy={y} r="3.4" />
        <g className="scr-tick" style={vars({ '--r': row })}><circle cx="178" cy={y} r="5" /><path d={`M175.6 ${y}l1.7 1.7 3.3-3.3`} /></g>
      </g>;
    })}
    <path className="scr-spark" d="M0-5 1.2-1.2 5 0 1.2 1.2 0 5-1.2 1.2-5 0-1.2-1.2Z" />
  </>;
}

/** Circuit synthesis: the stage assembles from schematic symbols, then the testbench closes around it. */
function Schematic() {
  const strokes = ['M12 66H26', coil(26, 66, 4, 28), `M54 66H96M72 66v8M65 74h14M65 78h14M72 78v8${ground(72, 86)}`,
    `M96 52V80M102 48V84M102 56H116V40M102 74H112V86${ground(112, 86)}M107 71l3 3-3 3`, 'M116 40H136M136 33V47M141 33V47M141 40H176'];
  return <>
    <rect className="scr-bench" x="4" y="22" width="192" height="80" rx="8" />
    {strokes.map((d, i) => <path key={i} className="scr-draw" style={vars({ '--d': i })} d={d} pathLength="1" />)}
    <circle className="scr-port" cx="9" cy="66" r="3" /><circle className="scr-port" cx="179" cy="40" r="3" />
  </>;
}

// A pixel of the divider below, in picture units; the window leaves room for the response on its right.
const cell = 5.2;
const port = (at: number) => 14 + (at + 1) * cell;

/** EM simulation: a pixelated three-port divider (one input, an equal split) in its window of the ground plane. The
 * field sweeps across the pixels, then the response is drawn: both outputs together, the input match low across the band. */
function Field() {
  const { columns, rows, metal } = pixelPassives.divider, right = 14 + columns * cell;
  return <>
    <rect className="scr-window" x="12" y="12" width={columns * cell + 4} height={rows * cell + 4} rx="2" />
    {metal.flatMap((row, r) => row.map((on, c) => on && <rect key={`${r}.${c}`} className="scr-pixel" style={vars({ '--c': c })}
      x={14 + c * cell} y={14 + r * cell} width={cell - .7} height={cell - .7} />))}
    <path className="scr-port-line" d={`M3 ${port(6)}H12M${right + 2} ${port(2)}H${right + 11}M${right + 2} ${port(10)}H${right + 11}`} />
    {([[4, port(6) - 4, '1'], [right + 4, port(2) - 4, '2'], [right + 4, port(10) - 4, '3']] as const).map(([x, y, name]) =>
      <text key={name} className="scr-label" x={x} y={y}>{name}</text>)}
    <rect className="scr-band" x="152" y="14" width="36" height="72" />
    <path className="scr-axis" d="M146 12V87H197" />
    <path className="scr-response" d="M146 31C156 28 166 27 176 28S192 31 197 34" pathLength="1" />
    <path className="scr-response scr-response-twin" d="M146 33C156 29 166 28 176 29S192 33 197 36" pathLength="1" />
    <path className="scr-response scr-match" d="M146 44C150 47 152 70 160 76S172 70 178 80 186 66 197 46" pathLength="1" />
    <text className="scr-label scr-label-out" x="146" y="100">S21 S31</text>
    <text className="scr-label scr-label-match" x="180" y="100">S11</text>
  </>;
}

// The Pareto front GENESIS converges on, and where each candidate settles (on the front, or behind it).
const front = (t: number) => {
  const u = 1 - t;
  return [u ** 3 * 30 + 3 * u * u * t * 42 + 3 * u * t * t * 96 + t ** 3 * 186, u ** 3 * 18 + 3 * u * u * t * 72 + 3 * u * t * t * 96 + t ** 3 * 98];
};
const candidates = [.06, .2, .34, .5, .66, .84].flatMap((t, i) => {
  const [x, y] = front(t);
  return [{ x, y, on: true, dx: (i % 2 ? 1 : -1) * (30 + i * 7), dy: -38 + i * 9 }, { x: x + 14 + i * 3, y: y - 16 - (i % 3) * 7, on: false, dx: -24 + i * 11, dy: 26 - i * 8 }];
});

/** Optimization: scattered candidates settle; the best ones line up on the Pareto front and one balance is chosen. */
function Pareto() {
  const [cx, cy] = front(.5);
  return <>
    <path className="scr-axis" d="M20 8V108H194" />
    <path className="scr-front" d="M30 18C42 72 96 96 186 98" pathLength="1" />
    {candidates.map((point, i) => <circle key={i} className={point.on ? 'scr-best' : 'scr-dominated'} cx={point.x} cy={point.y} r="3.2"
      style={vars({ '--dx': `${point.dx}px`, '--dy': `${point.dy}px`, '--i': i })} />)}
    <circle className="scr-choice" cx={cx} cy={cy} r="7" />
  </>;
}

/** Layout and verification: a front end takes shape (two pixelated passives, mirrored, around the transistor core,
 * with the RF, LO and IF pads), the checks pass and the GDS leaves. */
function Layout() {
  const { columns, rows, metal } = pixelPassives.frontEnd, size = 4, top = 22, middle = top + 7 * size;
  const pixels = (x0: number, flip: boolean) => metal.flatMap((row, r) => row.map((on, c) => on &&
    <rect key={`${r}.${c}`} x={x0 + (flip ? columns - 1 - c : c) * size} y={top + r * size} width={size - .6} height={size - .6} />));
  return <>
    <rect className="scr-plane" x="4" y="16" width="134" height="68" rx="3" />
    <g className="scr-layer scr-passive" style={vars({ '--l': 0 })}>{pixels(10, false)}{pixels(10 + columns * size + 24, true)}</g>
    <g className="scr-layer" style={vars({ '--l': 1 })}>
      <rect className="scr-core" x="61" y="36" width="20" height="28" rx="1.5" />
      {[64, 67, 70, 73, 76].map(x => <path key={x} className="scr-finger" d={`M${x + .5} 40V60`} />)}
    </g>
    <g className="scr-layer" style={vars({ '--l': 2 })}>
      <path className="scr-metal" d={`M4 ${middle}H10M58 ${middle}H61M81 ${middle}H84M132 ${middle}H138M71 36V26M71 64V74`} />
      {[[0, middle - 4], [134, middle - 4], [67, 18], [67, 74]].map(([x, y]) => <rect key={`${x}.${y}`} className="scr-pad" x={x} y={y} width="8" height="8" rx="1.5" />)}
    </g>
    {['DRC', 'LVS', 'GDS'].map((name, i) => <g key={name} className="scr-badge" style={vars({ '--b': i })}>
      <rect x="144" y={16 + i * 32} width="50" height="20" rx="6" />
      <text x="152" y={30 + i * 32}>{name}</text>
      <path d={i < 2 ? `M178 ${26 + i * 32}l2.2 2.2 4.4-4.4` : `M181 ${21 + i * 32}v9M177.5 ${27 + i * 32}l3.5 3.5 3.5-3.5`} />
    </g>)}
  </>;
}

const screens: Record<string, () => JSX.Element> = { specification: Targets, synthesis: Schematic, em: Field, optimization: Pareto, layout: Layout };

/** The animated picture for one stage; nothing for a stage without one. */
export function StageScreen({ id }: { id: string }) {
  const Screen = screens[id];
  return Screen ? <svg className={`stage-picture stage-picture-${id}`} viewBox="0 0 200 120" aria-hidden="true"><Screen /></svg> : null;
}

export type Offer = { icon: string; title: string; detail: string };
/** What a tube screen shows: its title, which picture, and what GENESIS offers there. */
export type TubeContent = { title: string; image: string; software: Offer[] };

/** The inside of a tube screen: whose screen it is, the animated picture and three offers that warm up in turn. */
export function TubePanel({ label, content, onClose, closer }: { label: string; content: TubeContent; onClose: () => void; closer?: RefObject<HTMLButtonElement> }) {
  const { t } = useLanguage();
  return <>
    <span className="stage-screen-scan" aria-hidden="true" />
    <header className="stage-screen-head"><span>{label}</span><strong>{content.title}</strong>
      <button ref={closer} type="button" className="stage-screen-close" aria-label={t("Close")} onClick={onClose}><Icon name="close" /></button></header>
    <div className="stage-screen-body">
      <StageScreen id={content.image} />
      <ul className="stage-offers">{content.software.map((offer, i) => <li key={offer.title} style={{ '--o': i } as CSSProperties}>
        <Icon name={offer.icon} /><span><strong>{offer.title}</strong>{offer.detail}</span>
      </li>)}</ul>
    </div>
  </>;
}

type Rect = { top: number; left: number; width: number; height: number };
type CardState<Part> = { part: Part; off: boolean; run: number; rect: Rect; from: HTMLElement };

/** A tube screen that grows out of the card that was pressed, over its whole illustration (the `.tube-stack`, which
 * grows too when the screen needs more room). The same card, the close button or Escape folds it back into the card.
 * With motion stopped it opens and closes at once. Focus moves into the screen and back to the card. */
export function useCardScreen<Part extends string>(enabled: boolean) {
  const stack = useRef<HTMLDivElement>(null);
  const runs = useRef(0);
  const [state, setState] = useState<CardState<Part> | null>(null);
  const still = !enabled || matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The card is inert while its screen is on, so it takes focus back only once the screen is gone.
  const giveBack = (from: HTMLElement) => window.setTimeout(() => from.focus({ preventScroll: true }), 0);
  const close = () => {
    if (!state || state.off) return;
    if (still) { setState(null); giveBack(state.from); }
    else setState({ ...state, off: true });
  };
  const toggle = (part: Part, card: HTMLElement, from: HTMLElement) => {
    if (state && state.part === part && !state.off) { close(); return; }
    const box = stack.current?.getBoundingClientRect(), rect = card.getBoundingClientRect();
    if (!box) return;
    runs.current += 1;
    setState({ part, off: false, run: runs.current, from, rect: { top: rect.top - box.top, left: rect.left - box.left, width: rect.width, height: rect.height } });
  };
  const ended = (event: AnimationEvent<HTMLElement>) => {
    if (state?.off && event.target === event.currentTarget && event.animationName === 'tube-collapse') { setState(null); giveBack(state.from); }
  };
  useEffect(() => {
    if (!state || state.off) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });
  return { stack, state, still, open: Boolean(state && !state.off), toggle, close, ended };
}

/** The screen itself: it flashes where the card was, folds into a bright line across the illustration and opens into the
 * picture (see `tube-expand`); closing runs it back into the card and out (`tube-collapse`). */
export function CardScreen({ id, state, still, label, content, onClose, onEnded }: { id: string; state: { off: boolean; run: number; rect: Rect }; still: boolean;
  label: string; content: TubeContent; onClose: () => void; onEnded: (event: AnimationEvent<HTMLElement>) => void }) {
  const closer = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLElement>(null);
  useEffect(() => {
    closer.current?.focus({ preventScroll: true });
    // On a phone the open screen can reach below the fold: bring it into view once it is open.
    const timer = window.setTimeout(() => screen.current?.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' }), still ? 0 : 760);
    return () => window.clearTimeout(timer);
  }, [state.run, still]);
  const { rect } = state;
  return <section ref={screen} id={id} className="stage-screen tube-card" data-off={state.off} aria-label={`${label}: ${content.title}`} onAnimationEnd={onEnded}
    style={{ '--t': `${rect.top}px`, '--l': `${rect.left}px`, '--w': `${rect.width}px`, '--h': `${rect.height}px` } as CSSProperties}>
    <span className="tube-flash" aria-hidden="true" />
    <TubePanel label={label} content={content} onClose={onClose} closer={closer} />
  </section>;
}
