/** The promo's editorial plan: chapters, their shots, captions and timing. Footage comes from the clip manifest
 * (real app recordings); this file only says which part of which clip each shot plays and what its caption says. */
export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export type Transition = 'fade' | 'slide' | 'wipe';
/** One short push-in during a shot: from `at` seconds the camera scales up around the point (x, y), in % of the frame,
 * and carries it above the caption; it holds for `hold` seconds and pulls back out. */
export type Focus = { x: number; y: number; scale: number; at: number; hold: number };
/** One shot plays `seconds` of `clip`, from its mark `from` (the clip start without one). `caption` says what GENESIS
 * does in it; GENESIS is drawn in the brand gradient. */
export type Shot = { clip: string; from?: string; seconds: number; caption: string; focus?: Focus };
/** A chapter groups its shots under one tag; a chapter without a title plays its shot with no caption. */
export type Chapter = { id: string; title?: string; enter: Transition; shots: Shot[] };

export const chapters: Chapter[] = [
  {
    id: 'start', title: 'Start', enter: 'fade', shots: [
      { clip: 'S1_prompt', seconds: 4, caption: 'Tell GENESIS what you want to design.', focus: { x: 50, y: 72, scale: 1.5, at: 1.9, hold: 1.3 } },
      { clip: 'S2_assistant', seconds: 6.5, caption: 'GENESIS understands your flow.', focus: { x: 84, y: 56, scale: 1.55, at: 2.4, hold: 2.4 } },
    ],
  },
  {
    id: 'design', title: 'Design', enter: 'slide', shots: [
      { clip: 'C2_design', from: 'schematic', seconds: 4, caption: 'GENESIS draws the schematic on your PDK.', focus: { x: 52, y: 62, scale: 1.6, at: .9, hold: 2 } },
      { clip: 'C2_design', from: 'blocks', seconds: 6, caption: 'GENESIS turns it into blocks and a testbench.' },
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
      { clip: 'C4_floorplan', from: 'placement', seconds: 7.2, caption: 'GENESIS places, routes and tiles the layout.' },
      { clip: 'C4_floorplan', from: 'verify', seconds: 7.6, caption: 'GENESIS checks it with Calibre DRC and LVS.', focus: { x: 78, y: 68, scale: 1.8, at: .15, hold: 1 } },
    ],
  },
  { id: 'finishing', enter: 'fade', shots: [{ clip: 'S8_finishing', seconds: 4, caption: '' }] },
];
export const OPENING_SECONDS = 3.5;
export const END_CARD_SECONDS = 3.5;
/** Seconds the camera takes to push in or pull out. */
export const FOCUS_MOVE_SECONDS = .4;

export const chapterSeconds = (chapter: Chapter) => chapter.shots.reduce((sum, s) => sum + s.seconds, 0);
/** A sequence runs one transition longer than its chapter, so each chapter's seconds are what the viewer sees and the
 * film is exactly the sum of them. The last sequence has nothing to hand over to. */
export const sequenceFrames = (seconds: number, last = false) => Math.round(seconds * FPS) + (last ? 0 : TRANSITION_FRAMES);
export const totalFrames = () => Math.round((OPENING_SECONDS + chapters.reduce((sum, c) => sum + chapterSeconds(c), 0) + END_CARD_SECONDS) * FPS);
