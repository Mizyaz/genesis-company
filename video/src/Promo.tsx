import { staticFile, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { loadFont } from '@remotion/fonts';
import { ChapterScene, shotStart, type Clip } from './AppScene';
import { chapters, chapterSeconds, sequenceFrames, totalFrames, TRANSITION_FRAMES, type Transition } from './storyboard';

export type PromoProps = { clips: Clip[] };

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

/** Reads the footage manifest from the public folder; a shot without its clip or mark fails the render. */
export const promoMetadata: CalculateMetadataFunction<PromoProps> = async () => {
  const manifest = await (await fetch(staticFile('clips/manifest.json'))).json() as { clips: Clip[] };
  const shots = chapters.flatMap(c => c.shots);
  const missing = shots.filter(s => !manifest.clips.some(c => c.scene_id === s.clip)).map(s => s.clip);
  if (missing.length) throw new Error(`Footage manifest has no clip for ${[...new Set(missing)].join(', ')}`);
  shots.forEach(s => shotStart(s, manifest.clips.find(c => c.scene_id === s.clip)!));
  return { durationInFrames: totalFrames(), props: { clips: manifest.clips } };
};

// The three presentations have different prop types; the series only needs one of them per cut.
const presentation = (kind: Transition) => (kind === 'slide' ? slide({ direction: 'from-right' }) : kind === 'wipe' ? wipe({ direction: 'from-left' }) : fade()) as TransitionPresentation<Record<string, unknown>>;
const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export function Promo({ clips }: PromoProps) {
  const byId = new Map(clips.map(c => [c.scene_id, c]));
  // The film opens on the recorded landing page and closes on the recorded finishing screen: no drawn title cards.
  return <TransitionSeries>
    {chapters.flatMap((chapter, i) => [
      ...(i ? [<TransitionSeries.Transition key={`${chapter.id}-in`} presentation={presentation(chapter.enter)} timing={timing} />] : []),
      <TransitionSeries.Sequence key={chapter.id} name={chapter.id} durationInFrames={sequenceFrames(chapterSeconds(chapter), i === chapters.length - 1)}>
        <ChapterScene chapter={chapter} clips={byId} index={i} count={chapters.filter(c => c.title).length} />
      </TransitionSeries.Sequence>,
    ])}
  </TransitionSeries>;
}
