import { staticFile, type CalculateMetadataFunction } from 'remotion';
import { linearTiming, TransitionSeries, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { loadFont } from '@remotion/fonts';
import { AppScene, type Clip } from './AppScene';
import { EndCard, Opening } from './Brand';
import { END_CARD_SECONDS, OPENING_SECONDS, scenes, sequenceFrames, totalFrames, TRANSITION_FRAMES, type Transition } from './storyboard';

export type PromoProps = { clips: Clip[] };

void loadFont({ family: 'Inter', url: staticFile('brand/InterVariable.woff2'), weight: '100 900' });

/** Reads the footage manifest from the public folder; a scene without a clip fails the render, never renders blank. */
export const promoMetadata: CalculateMetadataFunction<PromoProps> = async () => {
  const manifest = await (await fetch(staticFile('clips/manifest.json'))).json() as { clips: Clip[] };
  const missing = scenes.filter(s => !manifest.clips.some(c => c.scene_id === s.id)).map(s => s.id);
  if (missing.length) throw new Error(`Footage manifest has no clip for ${missing.join(', ')}`);
  return { durationInFrames: totalFrames(), props: { clips: manifest.clips } };
};

// The three presentations have different prop types; the series only needs one of them per cut.
const presentation = (kind: Transition) => (kind === 'slide' ? slide({ direction: 'from-right' }) : kind === 'wipe' ? wipe({ direction: 'from-left' }) : fade()) as TransitionPresentation<Record<string, unknown>>;
const timing = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export function Promo({ clips }: PromoProps) {
  const byId = new Map(clips.map(c => [c.scene_id, c]));
  return <TransitionSeries>
    <TransitionSeries.Sequence name="Opening" durationInFrames={sequenceFrames(OPENING_SECONDS)}><Opening /></TransitionSeries.Sequence>
    {scenes.flatMap((scene, i) => [
      <TransitionSeries.Transition key={`${scene.id}-in`} presentation={presentation(scene.enter)} timing={timing} />,
      <TransitionSeries.Sequence key={scene.id} name={scene.id} durationInFrames={sequenceFrames(scene.seconds)}>
        <AppScene scene={scene} clip={byId.get(scene.id)!} index={i} count={scenes.filter(s => s.title).length} />
      </TransitionSeries.Sequence>,
    ])}
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence name="End card" durationInFrames={sequenceFrames(END_CARD_SECONDS, true)}><EndCard /></TransitionSeries.Sequence>
  </TransitionSeries>;
}
