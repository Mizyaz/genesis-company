import { Composition } from 'remotion';
import { Promo, promoMetadata } from './Promo';
import { Story, storyFrames, storyMetadata } from './Story';
import { FPS, totalFrames } from './storyboard';

export function Root() {
  return <>
    <Composition id="GenesisPromo" component={Promo} width={1920} height={1080} fps={FPS}
      durationInFrames={totalFrames()} defaultProps={{ clips: [] }} calculateMetadata={promoMetadata} />
    <Composition id="GenesisStory" component={Story} width={1920} height={1080} fps={FPS}
      durationInFrames={storyFrames()} defaultProps={{ story: null, layout: null, links: null, sparams: null, optimize: null }} calculateMetadata={storyMetadata} />
  </>;
}
