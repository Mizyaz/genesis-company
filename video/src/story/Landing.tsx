import { useCurrentFrame } from 'remotion';
import { LitEmblemView, SunriseView } from '../../../src/shared/story/landing';

// The landing page's opening on Remotion's clock: the shared drawing (src/shared/story/landing.tsx) at the current frame.
export const Sunrise = ({ from = 0, k = 1 }: { from?: number; k?: number }) => <SunriseView frame={useCurrentFrame()} from={from} k={k} />;
export const LitEmblem = ({ width, from = 0 }: { width: number; from?: number }) => <LitEmblemView frame={useCurrentFrame()} width={width} from={from} />;
