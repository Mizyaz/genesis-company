import type { ReactNode } from 'react';
import { ease, out } from './motion';
import { alpha, B, C, GRADIENT } from './palette';
import { LitEmblemView, SunriseView, Wordmark } from './landing';
import { CIRCUIT, PANEL } from './scenes';
import { mix, Schematic, type Drawing } from './Schematic';
import { hasSketch, TopologySketch, TradeBars } from './topology';

// The film's conversation as a function of the scene's frame (the film plays it on Remotion's clock with its caption
// band, the site on the page's clock): the prompt is typed and sent, GENESIS answers with its question and choice
// cards, the choice is taken and GENESIS proposes the schematic.
export type Conversation = { prompt: string; conversation: { message: string; choices: string[]; answer: { card?: string; text?: string } | null }[] };
export const ASK_FRAMES = 414;
const SENT = 118;
const linear = (frame: number, from: number, to: number, a: number, b: number) => a + (b - a) * Math.min(1, Math.max(0, (frame - from) / (to - from)));

/** Words of a text fading in one after another from `from`, `rate` words per frame, each already in its place, so the
 * bubble keeps its size while the reply comes in. */
export function Words({ text, frame, from, rate = .9 }: { text: string; frame: number; from: number; rate?: number }) {
  return <>{text.split(' ').map((w, i) => <span key={i} style={{ opacity: Math.min(1, Math.max(0, (frame - from) * rate - i) / 3) }}>{w} </span>)}</>;
}

/** The film tokens of the conversation: a picked card and the user's own bubble take a share of the brand colours. */
export const PICKED = mix(C.card, B.brand1, .18);
const USER = mix(C.card, B.brand2, .3), USER_BORDER = mix(C.border, B.brand2, .5);

export function Bubble({ who, children, k }: { who: 'user' | 'genesis'; children: ReactNode; k: number }) {
  const user = who === 'user';
  return <div style={{ alignSelf: user ? 'flex-end' : 'flex-start', maxWidth: user ? 1000 : 1400, opacity: k, transform: `translateY(${(1 - k) * 18}px)`,
    padding: '18px 26px', borderRadius: 22, fontFamily: 'Inter', fontSize: 34, lineHeight: 1.4, color: C.text,
    background: user ? USER : C.surface, border: `1px solid ${user ? USER_BORDER : C.border}`, boxShadow: '0 12px 40px #0006' }}>
    {!user && <div style={{ marginBottom: 6, fontWeight: 700, fontSize: 20, letterSpacing: '.12em' }}><span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span></div>}
    {children}
  </div>;
}

/** When each part of the conversation starts (frames): the proposal turn and the frame the last answer ends. */
function timing(story: Conversation) {
  let at = SENT + 26;
  for (const turn of story.conversation) {
    at += turn.message.split(' ').length / .9 + 8;
    if (turn.choices.length) at += 76 + 22;
    if (turn.answer?.text) at += 26;
  }
  return at;
}
/** The caption band's chapter and captions, from the frame each starts. */
export const askCaptions = (story: Conversation): { chapter: string; captions: [number, string][] } => ({ chapter: 'Ask',
  captions: [[0, ''], [58, 'Tell GENESIS what you want to design.'], [SENT + 26, 'GENESIS asks what your circuit needs.'], [timing(story) - 20, 'GENESIS proposes your schematic.']] });

/** The landing page and the conversation: the prompt is typed and sent, GENESIS answers with its question and choice
 * cards, the recorder's choice is taken and GENESIS proposes the schematic: its proposal stays on the left and the
 * chosen topology draws itself on the right. */
export function AskView({ frame, story, drawing }: { frame: number; story: Conversation; drawing: Drawing }) {
  const sent = SENT;
  const typed = story.prompt.slice(0, Math.floor(linear(frame, 62, 108, 0, story.prompt.length)));
  const box = out(frame, 34, 58), title = 1 - ease(frame, sent, sent + 18);
  // Each reply and answer gets a start frame; replies are revealed word by word.
  const items: { at: number; node: (k: number) => ReactNode }[] = [{ at: sent + 4, node: k => <Bubble who="user" k={k}>{story.prompt}</Bubble> }];
  let at = sent + 26, cardsShown = Infinity, replyAt = Infinity;
  for (const turn of story.conversation) {
    const start = at, words = turn.message.split(' ').length;
    replyAt = start;
    items.push({ at: start, node: k => <Bubble who="genesis" k={k}><Words text={turn.message} frame={frame} from={start} /></Bubble> });
    at = start + words / .9 + 8;
    if (turn.choices.length) {
      // Each card shows its topology as one switch arm and its trade-offs; the bars grow in, then the choice is taken.
      const cardsAt = at, chosen = turn.answer?.card, pickAt = cardsAt + 76;
      cardsShown = cardsAt;
      items.push({ at: cardsAt, node: k => <div style={{ display: 'flex', gap: 16, opacity: k }}>{turn.choices.map((c, i) => {
        const on = c === chosen ? out(frame, pickAt, pickAt + 10) : 0, off = c !== chosen ? out(frame, pickAt, pickAt + 10) : 0, ki = out(frame, cardsAt + i * 4, cardsAt + i * 4 + 12);
        const ink = mix(B.brand2, B.brand1, on);
        return <div key={c} style={{ width: 440, boxSizing: 'border-box', padding: '18px 22px 20px', borderRadius: 18, fontFamily: 'Inter', color: C.text, opacity: ki * (1 - .45 * off),
          transform: `translateY(${(1 - ki) * 14}px) scale(${1 + on * .04})`, background: mix(C.surface, PICKED, on), border: `2px solid ${mix(C.border, B.brand1, on)}`,
          boxShadow: on ? `0 0 ${40 * on}px ${alpha(B.brand1, 0x55 / 255)}` : undefined }}>
          <div style={{ fontWeight: 700, fontSize: 30 }}>{c}</div>
          {hasSketch(c) && <><div style={{ margin: '10px 0 6px' }}><TopologySketch name={c} w={396} h={124} colour={ink} /></div>
            <TradeBars name={c} colour={ink} k={out(frame, cardsAt + 14 + i * 6, cardsAt + 44 + i * 6)} /></>}
        </div>;
      })}</div> });
      at = pickAt + 22;
    }
    if (turn.answer?.text) { const t = turn.answer.text; items.push({ at, node: k => <Bubble who="user" k={k}>{t}</Bubble> }); at += 26; }
  }
  const proposal = story.conversation[story.conversation.length - 1].message, chosen = story.conversation.find(t => t.answer?.card)?.answer?.card;
  const turnAt = at + 10, turn = ease(frame, turnAt, turnAt + 18);
  // The cards are tall: the chat moves up as they come in, so they stand whole above the caption band.
  const scroll = 100 * ease(frame, cardsShown - 8, cardsShown + 16) + 240 * ease(frame, replyAt - 6, replyAt + 18);
  return <>
    <SunriseView frame={frame} k={1 - .55 * ease(frame, sent, sent + 30)} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 66 - (1 - title) * 60, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: title }}>
      <LitEmblemView frame={frame} width={400} />
      <div style={{ marginTop: 18, opacity: out(frame, 14, 40), filter: `blur(${(1 - out(frame, 14, 40)) * 7}px)`, transform: `translateY(${(1 - out(frame, 14, 40)) * 3}px)` }}><Wordmark size={120} /></div>
      <div style={{ marginTop: 12, fontFamily: 'Inter', fontSize: 34, color: C.muted, opacity: out(frame, 14, 40) }}>Whatever you want to design.</div>
    </div>
    {/* The chat fades out at the top as it scrolls, and at the proposal it slides into the panel on the left. */}
    <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'linear-gradient(180deg, transparent 0px, #000 90px)', maskImage: 'linear-gradient(180deg, transparent 0px, #000 90px)' }}>
      <div style={{ position: 'absolute', left: 260, width: 1400, top: 56 - scroll, display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 - turn,
        transformOrigin: '0 100%', transform: `translateX(${-(260 - PANEL.left) * turn}px) scale(${1 - .35 * turn})` }}>
        {items.map((item, i) => frame >= item.at && <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>{item.node(out(frame, item.at, item.at + 12))}</div>)}
      </div>
    </div>
    <div style={{ position: 'absolute', left: 360, width: 1200, top: linear(box, 0, 1, 640, 560) + ease(frame, sent, sent + 24) * 320, opacity: box * (1 - ease(frame, sent, sent + 20)),
      padding: '26px 30px', borderRadius: 24, background: alpha(C.card, .93), border: `1.5px solid ${mix(C.border, B.brand1, out(frame, 60, 70))}`, boxShadow: '0 20px 60px #0008',
      fontFamily: 'Inter', fontSize: 32, color: typed ? C.text : C.muted }}>
      {typed || 'Describe your circuit…'}<span style={{ opacity: Math.floor(frame / 15) % 2 && frame < sent ? 1 : 0, color: C.cyan }}>|</span>
    </div>
    {frame >= turnAt && <>
      <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 40, width: PANEL.width, display: 'flex', opacity: out(frame, turnAt + 6, turnAt + 22), transform: `translateY(${(1 - out(frame, turnAt, turnAt + 22)) * 160}px)` }}>
        <Bubble who="genesis" k={1}><span style={{ fontSize: 30 }}>{proposal}</span></Bubble>
      </div>
      <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}`, opacity: out(frame, turnAt + 4, turnAt + 20) }}>
        <div style={{ position: 'absolute', left: 30, top: 70, right: 30, bottom: 30 }}>
          <Schematic drawing={drawing} width={CIRCUIT.width - 60} height={CIRCUIT.height - 100} t={linear(frame, turnAt + 10, turnAt + 80, 0, 1)} />
        </div>
        {chosen && <div style={{ position: 'absolute', left: 22, top: 18, padding: '8px 18px', borderRadius: 999, background: PICKED, border: `2px solid ${B.brand1}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{chosen}</div>}
      </div>
    </>}
  </>;
}
