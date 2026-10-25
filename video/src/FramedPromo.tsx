import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Video } from '@remotion/media';
import { shotStart, type Clip } from './AppScene';
import { C, GRADIENT } from './Brand';
import { chapters, chapterSeconds, FPS, sequenceFrames, TRANSITION_FRAMES, type Chapter, type Focus } from './storyboard';
import type { PromoProps } from './Promo';

// The framed cut of the product film: the same chapters, shots and footage as GenesisPromo, with the app in a window on
// the right and each caption numbered on the left ("01 / 11"). Uncaptioned shots (the landing page, the finishing
// screen) fill the frame; the window shrinks in from them. Push-ins are quick and happen inside the window.
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const WINDOW = { left: 660, top: 202, width: 1200, height: 675 };
const MOVE = .3 * FPS, SHOT_FADE = 8, FRAME_IN = 16;

/** Numbers of the captioned shots across the film, in order; a grid chapter counts once. */
const numbered = chapters.flatMap(c => c.grid ? [c.grid] : c.shots.filter(s => s.caption).map(s => s.caption));

const shotStarts = (chapter: Chapter) => chapter.shots.reduce<number[]>((acc, _s, i) => [...acc, i ? acc[i - 1] + Math.round(chapter.shots[i - 1].seconds * FPS) : 0], []);

/** The camera inside the window: a quick push-in that scales the focus point up and brings it to the window's centre,
 * a hold and a quick pull back out; the footage always covers the window. */
function camera(focus: Focus | undefined, frame: number) {
  if (!focus) return 'none';
  const at = focus.at * FPS, back = at + MOVE + focus.hold * FPS, ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const k = interpolate(frame, [at, at + MOVE], [0, 1], ease) * interpolate(frame, [back, back + MOVE], [1, 0], ease);
  const scale = 1 + (focus.scale - 1) * k, fx = focus.x / 100, fy = focus.y / 100;
  const inside = (t: number) => Math.min(0, Math.max(1 - scale, t));
  return `translate(${inside(fx + (.5 - fx) * k - fx * scale) * 100}%, ${inside(fy + (.5 - fy) * k - fy * scale) * 100}%) scale(${scale})`;
}

function Footage({ clip, start, frames, focus, speed = 1 }: { clip: Clip; start: number; frames: number; focus?: Focus; speed?: number }) {
  const frame = useCurrentFrame(), available = (clip.duration_s - start) * FPS;
  return <div style={{ position: 'absolute', inset: 0, transform: camera(focus, frame), transformOrigin: '0 0' }}>
    <Video src={staticFile(clip.file)} muted trimBefore={Math.round(start * FPS)} playbackRate={Math.min(speed, available / frames)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>;
}

/** The numbered caption on the left: "07 / 11", a gradient rule and the sentence, GENESIS in the brand gradient. */
function Numbered({ text }: { text: string }) {
  const frame = useCurrentFrame(), n = numbered.indexOf(text);
  const k = interpolate(frame, [4, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <div style={{ position: 'absolute', left: 84, width: WINDOW.left - 84 - 64, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24,
    opacity: k, transform: `translateY(${(1 - k) * 18}px)`, fontFamily: 'Inter' }}>
    <div style={{ fontSize: 26, letterSpacing: '.16em', color: C.cyan, fontVariantNumeric: 'tabular-nums' }}>{String(n + 1).padStart(2, '0')} / {String(numbered.length).padStart(2, '0')}</div>
    <div style={{ width: 80, height: 4, borderRadius: 2, background: GRADIENT }} />
    <div style={{ fontWeight: 700, fontSize: 54, lineHeight: 1.14, letterSpacing: '-.01em', color: C.text }}>
      {text.split(' ').map((word, i) => <span key={i} style={{ display: 'inline-block', marginRight: '.25em' }}>{word.startsWith('GENESIS')
        ? <><span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span>{word.slice(7)}</> : word}</span>)}
    </div>
  </div>;
}

/** The window's box at k: 0 fills the frame, 1 is the framed window. */
function windowBox(k: number, width: number, height: number) {
  const mix = (a: number, b: number) => a + (b - a) * k;
  return { left: mix(0, WINDOW.left), top: mix(0, WINDOW.top), width: mix(width, WINDOW.width), height: mix(height, WINDOW.height), borderRadius: 16 * k };
}

function FramedChapter({ chapter, clips }: { chapter: Chapter; clips: Map<string, Clip> }) {
  const frame = useCurrentFrame(), { durationInFrames, width, height } = useVideoConfig();
  const starts = chapter.grid ? [0] : shotStarts(chapter);
  // The window frames in with the chapter's first captioned shot.
  const first = chapter.grid ? 0 : chapter.shots.findIndex(s => s.caption);
  const k = first < 0 ? 0 : first === 0 ? 1 : interpolate(frame, [starts[first], starts[first] + FRAME_IN], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const box = windowBox(k, width, height);
  return <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 30% 40%, #0b2a46 0%, ${C.page} 70%)` }}>
    <div style={{ position: 'absolute', ...box, overflow: 'hidden', border: k ? `1px solid ${C.border}` : 'none', boxShadow: k ? `0 30px 90px #000a, 0 0 70px ${C.cyan}22` : 'none', background: C.page }}>
      {chapter.grid ? chapter.shots.map((shot, i) => {
        const clip = clips.get(shot.clip)!, gap = 14, w = (WINDOW.width - 3 * gap) / 2, h = (WINDOW.height - 3 * gap) / 2, t = interpolate(frame - i * 5, [0, 14], [0, 1], clamp);
        return <div key={i} style={{ position: 'absolute', left: gap + (i % 2) * (w + gap), top: gap + Math.floor(i / 2) * (h + gap), width: w, height: h, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, opacity: t }}>
          <Video src={staticFile(clip.file)} muted trimBefore={Math.round(shotStart(shot, clip) * FPS)} playbackRate={Math.min(1, (clip.duration_s - shotStart(shot, clip)) * FPS / durationInFrames)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', left: 12, top: 10, padding: '6px 14px', borderRadius: 999, background: '#041325d9', border: `1px solid ${C.border}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 26, color: C.text }}>{shot.caption}</div>
        </div>;
      }) : chapter.shots.map((shot, i) => {
        const clip = clips.get(shot.clip)!, start = starts[i], last = i === chapter.shots.length - 1;
        const frames = last ? durationInFrames - start : starts[i + 1] - start;
        const fades = i > 0 && chapter.shots[i - 1].clip !== shot.clip, hold = !last && chapter.shots[i + 1].clip !== shot.clip ? SHOT_FADE : 0;
        return <Sequence key={i} from={start} durationInFrames={frames + hold} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: fades ? interpolate(frame - start, [0, SHOT_FADE], [0, 1], clamp) : 1 }}>
            <Footage clip={clip} start={shotStart(shot, clip)} frames={frames + hold} focus={shot.focus} speed={shot.speed} />
          </div>
        </Sequence>;
      })}
    </div>
    {chapter.grid ? <Numbered text={chapter.grid} /> : chapter.shots.map((shot, i) => shot.caption && <Sequence key={i} from={starts[i]} durationInFrames={i < chapter.shots.length - 1 ? starts[i + 1] - starts[i] : undefined} layout="none">
      <Numbered text={shot.caption} />
    </Sequence>)}
  </AbsoluteFill>;
}

export function FramedPromo({ clips }: PromoProps) {
  const byId = new Map(clips.map(c => [c.scene_id, c]));
  return <TransitionSeries>
    {chapters.flatMap((chapter, i) => [
      ...(i ? [<TransitionSeries.Transition key={`${chapter.id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />] : []),
      <TransitionSeries.Sequence key={chapter.id} name={chapter.id} durationInFrames={sequenceFrames(chapterSeconds(chapter), i === chapters.length - 1)}>
        <FramedChapter chapter={chapter} clips={byId} />
      </TransitionSeries.Sequence>,
    ])}
  </TransitionSeries>;
}
