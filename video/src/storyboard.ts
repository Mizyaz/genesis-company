/** The promo's editorial plan: scene order, on-screen titles, timing and camera focus. Footage comes from the clip
 * manifest (real app recordings); this file only says how long each scene holds and where the camera leans. */
export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export type Transition = 'fade' | 'slide' | 'wipe';
/** Where the camera ends up inside the app window: transform origin in % of the window and the final scale. */
export type Focus = { x: number; y: number; scale: number; from?: number };
/** `title` names the app stage on screen; `detail` names the design, block or number the frame shows. A scene holds
 * still unless `focus` is set, which is kept for a detail too small to read at full window size. */
export type Scene = { id: string; seconds: number; title?: string; detail?: string; focus?: Focus; enter: Transition };

export const scenes: Scene[] = [
  { id: 'S1_prompt', seconds: 6, title: 'Your prompt', detail: '“I want a broadband RF switch with low loss and high isolation.”', enter: 'fade' },
  { id: 'S2_reply', seconds: 8, title: 'Circuit Assistant', detail: 'Reads the Maestro plan: one testbench “full” with two S-parameter tests, port2_on and port3_on.', enter: 'slide' },
  { id: 'S3_schematic', seconds: 6, title: 'Schematic', detail: 'spdt_series_shunt_noC1 on GF22FDX: FETs M1–M4, coils L1–L3 · 24 parts, 27 wires.', enter: 'fade' },
  { id: 'S4_blocks', seconds: 6, title: 'Blocks', detail: 'The DUT opens into Input and Upper branch, 5 blocks each: coils, RF pads, interconnects.', enter: 'fade' },
  { id: 'S5_agent_tools', seconds: 8, title: 'Analyses & Variables', detail: '2 S-parameter tests on testbench “full”, one per bias state: port2_on and port3_on.', enter: 'fade' },
  { id: 'S6_results', seconds: 7, title: 'Optimize', detail: 'S21 target ≥ −2 dB · CMA-ES, 337 evaluations · 8 of 18 targets met.', enter: 'wipe' },
  // The one zoom: the density layout is small inside its viewer.
  { id: 'S7_layout', seconds: 7, title: 'Floorplan', detail: 'The chip layout Cadence captured after the density stage.', enter: 'fade', focus: { x: 50, y: 54, scale: 1.45, from: .3 } },
  { id: 'S8_finishing', seconds: 4.5, enter: 'fade' },
];
export const OPENING_SECONDS = 4;
export const END_CARD_SECONDS = 3.5;

/** A sequence runs one transition longer than its scene, so each scene's `seconds` is what the viewer sees and the
 * film is exactly the sum of them. The last sequence has nothing to hand over to. */
export const sequenceFrames = (seconds: number, last = false) => Math.round(seconds * FPS) + (last ? 0 : TRANSITION_FRAMES);
export const totalFrames = () => Math.round((OPENING_SECONDS + scenes.reduce((sum, s) => sum + s.seconds, 0) + END_CARD_SECONDS) * FPS);
