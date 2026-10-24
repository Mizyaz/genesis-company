import { Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { C, GRADIENT } from './Brand';
import { FOCUS_MOVE_SECONDS, FPS, TRANSITION_FRAMES, type Chapter, type Focus, type Shot } from './storyboard';

/** One clip from the footage manifest. `marks` name clip times where shots start. */
export type Clip = { scene_id: string; file: string; fps: number; width: number; height: number; duration_s: number; in_s?: number; marks?: Record<string, number> };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const SHOT_FADE = 8;

/** Where a shot starts in its clip, in seconds; a missing mark fails the render. */
export function shotStart(shot: Shot, clip: Clip) {
  if (!shot.from) return clip.in_s ?? 0;
  const mark = clip.marks?.[shot.from];
  if (mark === undefined) throw new Error(`Clip ${clip.scene_id} has no mark "${shot.from}"`);
  return (clip.in_s ?? 0) + mark;
}

/** Frame where each shot starts inside its chapter. */
const shotStarts = (chapter: Chapter) => chapter.shots.reduce<number[]>((acc, _s, i) => [...acc, i ? acc[i - 1] + Math.round(chapter.shots[i - 1].seconds * FPS) : 0], []);

/** Where the camera brings a focus point while it is pushed in: above the caption band, so the caption never covers it. */
const ANCHOR = { x: 50, y: 40 };

/** Camera at `frame` frames into a shot: a short push-in that scales the focus point up and carries it to the anchor,
 * a hold and a pull back out. */
function camera(focus: Focus | undefined, frame: number, width: number, height: number) {
  if (!focus) return 'none';
  const move = FOCUS_MOVE_SECONDS * FPS, at = focus.at * FPS, out = at + move + focus.hold * FPS;
  const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const k = interpolate(frame, [at, at + move], [0, 1], ease) * interpolate(frame, [out, out + move], [1, 0], ease);
  const scale = 1 + (focus.scale - 1) * k;
  const fx = focus.x / 100 * width, fy = focus.y / 100 * height;
  const x = fx + (ANCHOR.x / 100 * width - fx) * k, y = fy + (ANCHOR.y / 100 * height - fy) * k;
  // The footage always covers the frame: a point near an edge moves toward the anchor only as far as the edge allows.
  const inside = (t: number, size: number) => Math.min(0, Math.max(size - size * scale, t));
  return `translate(${inside(x - fx * scale, width)}px, ${inside(y - fy * scale, height)}px) scale(${scale})`;
}

/** The real recording from the shot's start, filling the frame, at the shot's speed; slowed only if the clip ends early. */
function Footage({ clip, start, frames, focus, speed = 1 }: { clip: Clip; start: number; frames: number; focus?: Focus; speed?: number }) {
  const frame = useCurrentFrame(), { width, height } = useVideoConfig();
  const available = (clip.duration_s - start) * FPS;
  return <div style={{ position: 'absolute', inset: 0, transform: camera(focus, frame, width, height), transformOrigin: '0 0' }}>
    <Video src={staticFile(clip.file)} muted trimBefore={Math.round(start * FPS)} playbackRate={Math.min(speed, available / frames)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>;
}

/** A caption whose words rise in one after another; GENESIS is drawn in the brand gradient. */
export function Caption({ text }: { text: string }) {
  const frame = useCurrentFrame();
  return <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 62, lineHeight: 1.1, letterSpacing: '-.015em', color: C.text, textShadow: '0 4px 30px #000a' }}>
    {text.split(' ').map((word, i) => {
      const t = interpolate(frame - 4 - i * 2.5, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      const brand = word.startsWith('GENESIS');
      return <span key={i} style={{ display: 'inline-block', marginRight: '.25em', opacity: t, transform: `translateY(${(1 - t) * 26}px)` }}>
        {brand ? <><span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span>{word.slice(7)}</> : word}
      </span>;
    })}
  </div>;
}

/** The grid chapter: its shots play together, one per quarter of the frame, each labelled; the tiles come in one by one. */
function Grid({ chapter, clips, frames }: { chapter: Chapter; clips: Map<string, Clip>; frames: number }) {
  const frame = useCurrentFrame(), { width, height } = useVideoConfig(), gap = 24, top = 36, w = (width - 3 * gap) / 2, h = (height - 300 - top - gap) / 2;
  return <>{chapter.shots.map((shot, i) => {
    const clip = clips.get(shot.clip)!, t = interpolate(frame - i * 5, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return <div key={i} style={{ position: 'absolute', left: gap + (i % 2) * (w + gap), top: top + Math.floor(i / 2) * (h + gap), width: w, height: h,
      borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 18px 50px #0009', opacity: t, transform: `scale(${.94 + .06 * t})` }}>
      <Video src={staticFile(clip.file)} muted trimBefore={Math.round(shotStart(shot, clip) * FPS)} playbackRate={Math.min(1, (clip.duration_s - shotStart(shot, clip)) * FPS / frames)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', left: 16, top: 14, padding: '8px 16px', borderRadius: 999, background: '#041325d9', border: `1px solid ${C.border}`,
        fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{shot.caption}</div>
    </div>;
  })}</>;
}

export function ChapterScene({ chapter, clips, index, count }: { chapter: Chapter; clips: Map<string, Clip>; index: number; count: number }) {
  const frame = useCurrentFrame(), { durationInFrames } = useVideoConfig();
  const starts = chapter.grid ? [0] : shotStarts(chapter), visible = durationInFrames - TRANSITION_FRAMES;
  // The caption band comes in with the chapter's first captioned shot, so an uncaptioned opening plays clean.
  const first = chapter.grid ? 0 : starts[chapter.shots.findIndex(s => s.caption)] ?? 0;
  const band = interpolate(frame, [first + 4, first + 16], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) * interpolate(frame, [visible - 8, visible], [1, 0], clamp);

  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.page }}>
    {chapter.grid && <Grid chapter={chapter} clips={clips} frames={durationInFrames} />}
    {!chapter.grid && chapter.shots.map((shot, i) => {
      const clip = clips.get(shot.clip)!, start = starts[i], last = i === chapter.shots.length - 1;
      const frames = last ? durationInFrames - start : starts[i + 1] - start;
      const fades = i > 0 && chapter.shots[i - 1].clip !== shot.clip;
      // A shot that fades in needs the previous shot still playing underneath it.
      const hold = !last && chapter.shots[i + 1].clip !== shot.clip ? SHOT_FADE : 0;
      const opacity = fades ? interpolate(frame - start, [0, SHOT_FADE], [0, 1], clamp) : 1;
      return <Sequence key={i} from={start} durationInFrames={frames + hold} layout="none">
        <div style={{ position: 'absolute', inset: 0, opacity }}><Footage clip={clip} start={shotStart(shot, clip)} frames={frames + hold} focus={shot.focus} speed={shot.speed} /></div>
      </Sequence>;
    })}
    {chapter.title && <>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, opacity: band, background: 'linear-gradient(180deg, #04132500 0%, #041325cc 45%, #041325f2 100%)' }} />
      <div style={{ position: 'absolute', left: 96, right: 96, bottom: 74, opacity: band }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18, fontFamily: 'Inter', fontWeight: 600, fontSize: 24, letterSpacing: '.18em', textTransform: 'uppercase', color: C.cyan }}>
          <div style={{ display: 'flex', gap: 6 }}>{Array.from({ length: count }, (_, i) =>
            <div key={i} style={{ width: 34, height: 5, borderRadius: 3, background: i < index ? C.cyan : i === index ? GRADIENT : '#ffffff26' }} />)}</div>
          <span>{String(index + 1).padStart(2, '0')} · {chapter.title}</span>
        </div>
        {chapter.grid ? <Caption text={chapter.grid} /> : chapter.shots.map((shot, i) => <Sequence key={i} from={starts[i]} durationInFrames={i < chapter.shots.length - 1 ? starts[i + 1] - starts[i] : undefined} layout="none">
          <Caption text={shot.caption} />
        </Sequence>)}
      </div>
    </>}
  </div>;
}
