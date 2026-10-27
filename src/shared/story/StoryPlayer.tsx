import { useEffect, useRef, useState } from 'react';
import ask from '../../content/story/ask.json';
import analysis from '../../content/story/analysis.json';
import flow from '../../content/story/flow.json';
import optimization from '../../content/story/optimization.json';
import type { BlockLinks, Box } from './BlockView';
import { ease, FPS, out, TRANSITION } from './motion';
import { coilGlyphs, type CoilSample } from './coil';
import { C } from './palette';
import type { Drawing } from './Schematic';
import { BlocksView, LayoutView, SCENE_FRAMES, SchematicView } from './scenes';
import validation from '../../content/story/validation.json';
import { AnyView, Chip3DView, VALIDATION_FRAMES, ValidationView } from './scenes-validation';
import { AskView, ASK_FRAMES, type Conversation } from './scenes-ask';
import { DEMO_FRAMES, DemoView, EndView, END_FRAMES } from './scenes-end';
import type { Objective } from './objective';
import type { SParams } from './analysis';
import { ANALYSIS_FRAMES, SpecView, TestbenchView } from './scenes-analysis';
import { OPT, OptimizeView, type CoilCandidate, type CoilFrame } from './scenes-optimize';
import { assetUrl } from '../ui';

const FRAMES = { ...SCENE_FRAMES, ...ANALYSIS_FRAMES, optimize: OPT.length, ...VALIDATION_FRAMES, ask: ASK_FRAMES, demo: DEMO_FRAMES, end: END_FRAMES } as const;
export type SceneId = keyof typeof FRAMES;
const conversation = ask as Conversation;
type Layout = { die: Box; stages: string[]; blocks: { name: string; box: Box }[]; members: { block: string; member: string; cell: string; box: Box }[]; files: Record<string, string>;
  shapes: Record<string, Pick<CoilSample, 'layers' | 'bbox'>>; layers: { name: string; color: string }[]; tiles: { box: Box; master: string }[] };
const drawing = flow.schematic as Drawing, layout = flow.layout as unknown as Layout, links = flow.links as unknown as BlockLinks;
const src = (key: string) => layout.files[key] ? assetUrl(`/${layout.files[key]}`) : null;
/** The first scene draws its schematic in over these frames before the film's scene starts. */
const DRAW = 40;
/** The run rests on its last frame this long before it fades out and loops. */
const HOLD = 2 * FPS;
const picture = (key: string) => (validation.files as Record<string, string>)[key] ? assetUrl(`/${(validation.files as Record<string, string>)[key]}`) : null;
const both = (key: string) => src(key) ?? picture(key);
const sparams = analysis.sparams as SParams, objective = analysis.objective as unknown as Objective;
const coils = coilGlyphs(layout.shapes, 1);
const coilFrames = optimization.frames as CoilFrame[], candidates = optimization.candidates as unknown as CoilCandidate[], optObjective = optimization.objective as unknown as Objective;
const asset = (file: string) => assetUrl(`/${file}`);

/** The film's scenes in turn on its 1920 x 1080 stage, scaled to the box it is given, as figures of the page (the
 * section's own heading says what they show, so the film's caption band is left out): on the page's clock while
 * `playing`, or at rest on the last scene's last frame. The run fades in at its start, rests on its last frame for HOLD,
 * fades out and loops. `until` ends the run that many frames into its last scene. `scrub` (scene index plus the part of
 * it done, from 0 to the number of scenes) holds the run where the reader has scrolled it to instead, each scene over its
 * `windows` part (from, to, as parts of the scene; the whole scene when unset). */
export default function StoryPlayer({ scenes, focus, until, playing, scrub, windows }: { scenes: SceneId[]; focus?: string; until?: number; playing: boolean; scrub?: number; windows?: ([number, number] | undefined)[] }) {
  const box = useRef<HTMLDivElement>(null), [scale, setScale] = useState(0);
  const lengths = scenes.map((id, i) => (i === scenes.length - 1 && until ? Math.min(until, FRAMES[id]) : FRAMES[id]) + (i === 0 && id === 'schematic' ? DRAW : 0)), total = lengths.reduce((a, b) => a + b, HOLD);
  const [frame, setFrame] = useState(playing ? 0 : total - 1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1920));
    resize.observe(el);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now(), at = frame;
    const step = (now: number) => { at = (at + (now - last) / 1000 * FPS) % total; last = now; setFrame(at); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]); // eslint-disable-line react-hooks/exhaustive-deps
  let i = 0, local = frame;
  while (i < scenes.length - 1 && local >= lengths[i]) local -= lengths[i++];
  local = Math.min(local, lengths[i] - 1);
  if (scrub !== undefined) { i = Math.min(scenes.length - 1, Math.max(0, Math.floor(scrub))); const [w0, w1] = windows?.[i] ?? [0, 1]; local = Math.min(lengths[i] - 1, (w0 + (scrub - i) * (w1 - w0)) * lengths[i]); }
  const id = scenes[i], k = scrub !== undefined ? 1 : Math.min(out(frame, 0, TRANSITION), 1 - ease(frame, total - TRANSITION, total));
  const shifted = i === 0 && id === 'schematic' ? local - DRAW : local;
  return <div ref={box} className="story-stage-box">
    {scale > 0 && <div className="story-stage" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, background: C.page }}>
      <div style={{ position: 'absolute', inset: 0, opacity: k }}>
        {id === 'ask' && <AskView frame={local} story={conversation} drawing={drawing} />}
        {id === 'demo' && <DemoView frame={local} />}
        {id === 'end' && <EndView frame={local} />}
        {id === 'schematic' && <SchematicView frame={shifted} drawing={drawing} layout={layout} draw={i === 0 ? out(local, 0, DRAW) : 1} />}
        {id === 'blocks' && <BlocksView frame={local} drawing={drawing} layout={layout} links={links} />}
        {id === 'layout' && <LayoutView frame={local} layout={layout} links={links} src={src} zoomBlock={focus} glyph={coils} />}
        {id === 'optimize' && <OptimizeView frame={local} layout={layout} links={links} run={optimization.run} frames={coilFrames} objective={optObjective} candidates={candidates} src={asset} />}
        {id === 'validation' && <ValidationView frame={local} layout={layout} record={validation.record} src={both} />}
        {id === 'chip3d' && <Chip3DView frame={local} die={layout.die} layers={validation.layers} src={both} />}
        {id === 'any' && <AnyView frame={local} drawings={validation.drawings as unknown as Drawing[]} />}
        {id === 'testbench' && <TestbenchView frame={local} testbenches={analysis.testbenches} layout={layout} links={links} sparams={sparams} />}
        {id === 'spec' && <SpecView frame={local} layout={layout} links={links} sparams={sparams} objective={objective} />}
      </div>
    </div>}
  </div>;
}
