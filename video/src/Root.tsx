import { Composition } from 'remotion';
import { FramedPromo } from './FramedPromo';
import { FundIntro, fundFrames, fundMetadata } from './FundIntro';
import { FundStory } from './fund/FundStory';
import { Promo, promoMetadata } from './Promo';
import { Story, storyFrames, storyMetadata } from './Story';
import { FPS, totalFrames } from './storyboard';

export function Root() {
  return <>
    <Composition id="GenesisPromo" component={Promo} width={1920} height={1080} fps={FPS}
      durationInFrames={totalFrames()} defaultProps={{ clips: [] }} calculateMetadata={promoMetadata} />
    <Composition id="GenesisPromoFramed" component={FramedPromo} width={1920} height={1080} fps={FPS}
      durationInFrames={totalFrames()} defaultProps={{ clips: [] }} calculateMetadata={promoMetadata} />
    <Composition id="GenesisStory" component={Story} width={1920} height={1080} fps={FPS}
      durationInFrames={storyFrames()} defaultProps={{ story: null, layout: null, links: null, sparams: null, optimize: null, circuits: null, coilFrames: null, objective: null, candidates: null }} calculateMetadata={storyMetadata} />
    <Composition id="GenesisStoryAlt" component={Story} width={1920} height={1080} fps={FPS}
      durationInFrames={storyFrames(true)} defaultProps={{ alt: true, story: null, layout: null, links: null, sparams: null, optimize: null, circuits: null, coilFrames: null, objective: null, candidates: null }} calculateMetadata={storyMetadata} />
    <Composition id="GenesisFundHead" component={FundIntro} width={1920} height={1080} fps={FPS} durationInFrames={fundFrames('head')} defaultProps={{ part: 'head' as const, layout: null, timing: null }} calculateMetadata={fundMetadata} />
    <Composition id="GenesisFundTail" component={FundIntro} width={1920} height={1080} fps={FPS} durationInFrames={fundFrames('tail')} defaultProps={{ part: 'tail' as const, layout: null, timing: null }} calculateMetadata={fundMetadata} />
    <Composition id="GenesisFundStory" component={FundStory} width={1920} height={1080} fps={FPS}
      durationInFrames={storyFrames()} defaultProps={{ story: null, layout: null, links: null, sparams: null, optimize: null, circuits: null, coilFrames: null, objective: null, candidates: null }} calculateMetadata={storyMetadata} />
  </>;
}
