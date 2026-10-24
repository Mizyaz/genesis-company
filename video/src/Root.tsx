import { Composition } from 'remotion';
import { Promo, promoMetadata } from './Promo';
import { FPS, totalFrames } from './storyboard';

export function Root() {
  return <Composition id="GenesisPromo" component={Promo} width={1920} height={1080} fps={FPS}
    durationInFrames={totalFrames()} defaultProps={{ clips: [] }} calculateMetadata={promoMetadata} />;
}
