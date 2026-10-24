import { Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { Backdrop, C, GRADIENT } from './Brand';
import { TRANSITION_FRAMES, type Scene } from './storyboard';

/** One clip from the footage manifest. `content_box` is the app's area inside the frame ([x, y, w, h], px). */
export type Clip = { scene_id: string; file: string; fps: number; width: number; height: number; duration_s: number; in_s?: number; content_box?: number[] };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const WINDOW = { right: 70, top: 100, height: 880 };

/** The real recording, cropped to the app and slowed (never sped up) just enough to fill the scene. */
function Footage({ clip, frames }: { clip: Clip; frames: number }) {
  const { fps } = useVideoConfig();
  const available = (clip.duration_s - (clip.in_s ?? 0)) * fps;
  return <Video src={staticFile(clip.file)} muted trimBefore={Math.round((clip.in_s ?? 0) * fps)}
    playbackRate={Math.min(1, available / frames)} style={{ width: '100%', height: '100%' }} />;
}

export function AppScene({ scene, clip, index, count }: { scene: Scene; clip: Clip; index: number; count: number }) {
  const frame = useCurrentFrame(), { fps, durationInFrames, width: W, height: H } = useVideoConfig();
  const visible = durationInFrames - TRANSITION_FRAMES;
  const f = scene.focus ?? { x: 50, y: 50, scale: 1.04 };
  const zoom = interpolate(frame, [visible * (f.from ?? 0), visible], [1, f.scale], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const camera = { transform: `scale(${zoom})`, transformOrigin: `${f.x}% ${f.y}%` };

  if (!scene.title) return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, ...camera }}><Footage clip={clip} frames={durationInFrames} /></div>
  </div>;

  const [bx, by, bw, bh] = clip.content_box ?? [0, 0, clip.width, clip.height];
  const k = WINDOW.height / bh, winW = bw * k, winX = W - WINDOW.right - winW;
  const enter = interpolate(frame, [.3 * fps, .3 * fps + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const leave = interpolate(frame, [visible - .3 * fps, visible], [1, 0], clamp);
  const text = enter * leave;
  return <div style={{ position: 'absolute', inset: 0 }}>
    <Backdrop />
    <div style={{ position: 'absolute', left: 80, width: winX - 150, top: 0, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, opacity: text, transform: `translateY(${(1 - enter) * 16}px)` }}>
      <div style={{ fontFamily: 'Inter', fontSize: 22, letterSpacing: '.16em', color: C.cyan, fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</div>
      <div style={{ width: 72, height: 4, borderRadius: 2, background: GRADIENT }} />
      <div style={{ fontFamily: 'Inter', fontWeight: 650, fontSize: 60, lineHeight: 1.12, color: C.text, letterSpacing: '-.01em' }}>{scene.title}</div>
    </div>
    <div style={{ position: 'absolute', left: winX, top: WINDOW.top, width: winW, height: WINDOW.height, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: `0 30px 90px #0008, 0 0 60px ${C.cyan}22` }}>
      <div style={{ position: 'absolute', inset: 0, ...camera }}>
        <div style={{ position: 'absolute', left: -bx * k, top: -by * k, width: clip.width * k, height: clip.height * k }}><Footage clip={clip} frames={durationInFrames} /></div>
      </div>
    </div>
  </div>;
}
