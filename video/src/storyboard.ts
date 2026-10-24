/** The promo's editorial plan: scene order, on-screen titles, timing and camera focus. Footage comes from the clip
 * manifest (real app recordings); this file only says how long each scene holds and where the camera leans. */
export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export type Transition = 'fade' | 'slide' | 'wipe';
/** Where the camera ends up inside the app window: transform origin in % of the window and the final scale. */
export type Focus = { x: number; y: number; scale: number; from?: number };
export type Scene = { id: string; seconds: number; title?: string; focus?: Focus; enter: Transition };

export const scenes: Scene[] = [
  { id: 'S1_prompt', seconds: 6, title: 'Start with an idea', enter: 'fade', focus: { x: 50, y: 52, scale: 1.25 } },
  { id: 'S2_reply', seconds: 8, title: 'Talk to it like an engineer', enter: 'slide', focus: { x: 92, y: 38, scale: 1.7, from: .2 } },
  { id: 'S3_schematic', seconds: 6, title: 'A real circuit, not a sketch', enter: 'fade', focus: { x: 50, y: 45, scale: 1.12 } },
  { id: 'S4_blocks', seconds: 6, title: 'Inspect the blocks inside', enter: 'fade', focus: { x: 40, y: 30, scale: 1.35, from: .45 } },
  { id: 'S5_agent_tools', seconds: 8, title: 'Ask the agent. See its tools.', enter: 'fade', focus: { x: 18, y: 45, scale: 1.3, from: .35 } },
  { id: 'S6_results', seconds: 7, title: 'Measured against your targets', enter: 'wipe', focus: { x: 22, y: 30, scale: 1.45, from: .3 } },
  { id: 'S7_layout', seconds: 7, title: 'Down to the layout', enter: 'fade', focus: { x: 52, y: 50, scale: 1.6, from: .25 } },
  { id: 'S8_finishing', seconds: 4.5, enter: 'fade', focus: { x: 50, y: 45, scale: 1.06 } },
];
export const OPENING_SECONDS = 4;
export const END_CARD_SECONDS = 3.5;

/** A sequence runs one transition longer than its scene, so each scene's `seconds` is what the viewer sees and the
 * film is exactly the sum of them. The last sequence has nothing to hand over to. */
export const sequenceFrames = (seconds: number, last = false) => Math.round(seconds * FPS) + (last ? 0 : TRANSITION_FRAMES);
export const totalFrames = () => Math.round((OPENING_SECONDS + scenes.reduce((sum, s) => sum + s.seconds, 0) + END_CARD_SECONDS) * FPS);
