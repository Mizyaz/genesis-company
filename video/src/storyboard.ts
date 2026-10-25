/** The promo's editorial plan: chapters, their shots, captions and timing. Footage comes from the clip manifest
 * (real app recordings); this file only says which part of which clip each shot plays and what its caption says. */
export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export type Transition = 'fade' | 'slide' | 'wipe';
/** One short push-in during a shot: from `at` seconds the camera scales up around the point (x, y), in % of the frame,
 * and carries it above the caption; it holds for `hold` seconds and pulls back out. */
export type Focus = { x: number; y: number; scale: number; at: number; hold: number };
/** One shot plays `seconds` of `clip`, from its mark `from` (the clip start without one). `caption` says what GENESIS
 * does in it; GENESIS is drawn in the brand gradient. `speed` plays a slow recording faster (a time-lapse of the real
 * footage), for views that render slowly without a GPU. */
/** `after` starts the shot that many seconds past its mark, e.g. past a page's first blank frames. */
export type Shot = { clip: string; from?: string; after?: number; seconds: number; caption: string; focus?: Focus; speed?: number };
/** A chapter groups its shots under one tag; a chapter without a title plays its shot with no caption. A `grid` chapter
 * plays its shots at the same time, side by side in a 2x2 grid, each under its own caption as a label, with `grid` as
 * the chapter's caption. */
export type Chapter = { id: string; title?: string; enter: Transition; shots: Shot[]; grid?: string };

export const chapters: Chapter[] = [
  {
    // One take on the real site: the landing light and chat box, the prompt, GENESIS's questions, its proposal.
    id: 'start', title: 'Start', enter: 'fade', shots: [
      { clip: 'S1_conversation', from: 'landing', after: .4, seconds: 5.1, caption: '' },
      { clip: 'S1_conversation', from: 'typed', seconds: 4, caption: 'Tell GENESIS what you want to design.', focus: { x: 50, y: 40, scale: 1.4, at: .2, hold: 1.2 } },
      { clip: 'S1_conversation', from: 'answer2', seconds: 5.8, caption: 'GENESIS asks what your circuit needs.' },
      { clip: 'S1_conversation', from: 'proposal', seconds: 6.2, caption: 'GENESIS proposes the schematic.' },
    ],
  },
  {
    id: 'design', title: 'Design', enter: 'slide', shots: [
      { clip: 'S1_conversation', from: 'schematic', seconds: 4.5, caption: 'GENESIS draws it on your PDK.' },
      { clip: 'S1_conversation', from: 'blocks', seconds: 7.6, caption: 'GENESIS turns it into blocks and a testbench.' },
    ],
  },
  {
    id: 'analysis', title: 'Analysis', enter: 'slide', shots: [
      { clip: 'C3_analysis', from: 'analyses', seconds: 4, caption: 'GENESIS sets up every analysis and bias state.', focus: { x: 50, y: 74, scale: 1.4, at: 1.1, hold: 1.6 } },
      { clip: 'C3_analysis', from: 'optimize', seconds: 5.5, caption: 'GENESIS optimizes toward your targets.', focus: { x: 38, y: 66, scale: 1.7, at: 2.2, hold: 1.8 } },
    ],
  },
  {
    id: 'floorplan', title: 'Floorplan', enter: 'slide', shots: [
      { clip: 'C4_floorplan', from: 'placement', seconds: 5.4, caption: 'GENESIS places, routes and tiles the layout.' },
      { clip: 'C4_floorplan', from: 'verify', seconds: 5.6, caption: 'GENESIS checks it with Calibre DRC and LVS.', focus: { x: 78, y: 68, scale: 1.8, at: .15, hold: 1 } },
      // Stepped take (one screenshot per path step): 0.8 s still, 4 s along the path, the lit path held.
      { clip: 'C6_signal', from: 'signal', seconds: 5.8, caption: 'GENESIS traces the signal path through your layout.', focus: { x: 66, y: 52, scale: 1.45, at: .7, hold: 4.3 } },
      { clip: 'C5_3d', from: 'orbit', seconds: 6.5, speed: 4.5, caption: 'GENESIS builds your chip in 3D.', focus: { x: 50, y: 48, scale: 1.45, at: 2.6, hold: 2.4 } },
    ],
  },
  {
    // Four real conversations, each from its approved schematic; the labels name the circuit asked for.
    id: 'any', title: 'Any circuit', enter: 'fade', grid: 'GENESIS designs any circuit you want.', shots: [
      { clip: 'A_spdt', from: 'schematic', seconds: 7, caption: 'RF switch' },
      { clip: 'A_lna', from: 'schematic', seconds: 7, caption: 'Low-noise amplifier' },
      { clip: 'A_mixer', from: 'schematic', seconds: 7, caption: 'Mixer' },
      { clip: 'A_pa', from: 'schematic', seconds: 7, caption: 'Power amplifier' },
    ],
  },
  // The app's own finishing screen: the light from above, the emblem and GENESIS.
  { id: 'finishing', enter: 'fade', shots: [{ clip: 'S8_finishing', seconds: 6, caption: '' }] },
];
/** Seconds the camera takes to push in or pull out. */
export const FOCUS_MOVE_SECONDS = .4;

export const chapterSeconds = (chapter: Chapter) => chapter.grid ? Math.max(...chapter.shots.map(s => s.seconds)) : chapter.shots.reduce((sum, s) => sum + s.seconds, 0);
/** A sequence runs one transition longer than its chapter, so each chapter's seconds are what the viewer sees and the
 * film is exactly the sum of them. The last sequence has nothing to hand over to. */
export const sequenceFrames = (seconds: number, last = false) => Math.round(seconds * FPS) + (last ? 0 : TRANSITION_FRAMES);
export const totalFrames = () => Math.round(chapters.reduce((sum, c) => sum + chapterSeconds(c), 0) * FPS);
