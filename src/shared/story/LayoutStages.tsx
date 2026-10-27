import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { ease, out } from './motion';

type Box = [number, number, number, number];
/** What the stage reveal needs of a layout: its drawn stage pictures (by key, `stage_<name>`) and, for the ground
 * tiles drawn one by one, its die, layers and tiles. */
export type StagedLayout = { die?: Box; layers?: { name: string; color: string }[]; tiles?: { box: Box; master: string }[] };
/** The floorplanner's stages by name, as the film and the site show them. */
export const STAGES: Record<string, string> = { essentials: 'Essentials', interconnect: 'RF lines', drops: 'Drops', dc_lines: 'DC lines', gnd_tiling: 'Ground and fill tiling' };
/** Stages drawn as part of another: density fill is laid with the ground tiles, as one tiling step. */
export const PART_OF: Record<string, string> = { density: 'gnd_tiling' };
const wipe = (k: number) => `inset(0 ${100 - k * 100}% 0 0)`;

/** Stage times in the layout scene (frames): the floorplanner's stages run in their order. A chip without a stage's
 * layer (the delivered C1 has no drops) skips it. */
export const STAGE_AT: Record<string, [number, number]> = { essentials: [24, 120], interconnect: [130, 200], drops: [186, 236], dc_lines: [212, 262], gnd_tiling: [300, 350], density: [330, 380] };

/** Tiles in the order they are laid in the film: outwards from the die's middle. */
const tileOrder = new WeakMap<object, number[]>();
/** The ground tiles one by one, each a cell of its library master in its top metal's colour, with a seam between tiles,
 * laid outwards from the die's middle over the GND tiling stage. */
function GroundTiles({ tiles, die, layers, frame, staged }: { tiles: NonNullable<StagedLayout["tiles"]>; die: Box; layers: NonNullable<StagedLayout["layers"]>; frame: number; staged: boolean }) {
  const [x0, y0, x1, y1] = die, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  if (!tileOrder.has(tiles)) {
    const d = tiles.map(t => Math.hypot((t.box[0] + t.box[2]) / 2 - mx, (t.box[1] + t.box[3]) / 2 - my)), sorted = [...d].sort((a, b) => a - b);
    tileOrder.set(tiles, d.map(v => sorted.indexOf(v) / tiles.length));
  }
  const rank = tileOrder.get(tiles)!, [from, to] = STAGE_AT.gnd_tiling;
  // A master is named for its top metal, the one seen from above (tile_metal_13; a library master may add its size, _5x10).
  const colour = (master: string) => { const name = master.replace(/_\d+x\d+$/, '');
    return layers.find(l => name.endsWith(l.name))?.color ?? '#7f8fa6'; };
  return <svg viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    {tiles.map((t, i) => { const k = staged ? out(frame, from + rank[i] * (to - from - 10), from + rank[i] * (to - from - 10) + 10) : 1;
      if (k <= 0) return null;
      const [a, b, c, d] = t.box, inset = .9 + (1 - k) * 3;
      return <rect key={i} x={a + inset} y={-d + inset} width={Math.max(0, c - a - 2 * inset)} height={Math.max(0, d - b - 2 * inset)} rx={.8} fill={colour(t.master)} fillOpacity={.42 * k} />; })}
  </svg>;
}

/** All stage layers of a layout, bottom to top, each wiped in from the left over its stage's frames (`staged`), or
 * all at once: ground tiles and fill (dimmed, so the blocks stay readable), then the blocks (`blocks`, or the
 * essentials layer), then the routes. `src` gives a stage picture's address and `Image` draws it (the film waits for
 * each picture with Remotion's Img; the site uses a plain img). */
export function LayoutStages({ layout, src, Image = 'img', frame, staged, blocks }: { layout: StagedLayout; src: (key: string) => string | null; Image?: ComponentType<{ src: string; style: CSSProperties }> | 'img'; frame: number; staged: boolean; blocks?: ReactNode }) {
  const at = (stage: string) => staged ? ease(frame, ...STAGE_AT[stage]) : 1;
  const img = (key: string, k: number, opacity = 1) => { const url = src(key); return url && <Image key={key} src={url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, clipPath: wipe(k) }} />; };
  return <>
    {layout.tiles && layout.die && layout.layers ? <GroundTiles tiles={layout.tiles} die={layout.die} layers={layout.layers} frame={frame} staged={staged} /> : img('stage_gnd_tiling', at('gnd_tiling'), .35)}
    {img('stage_density', at('density'), .3)}
    {blocks ?? img('stage_essentials', 1)}
    {img('stage_interconnect', at('interconnect'))}
    {img('stage_drops', at('drops'))}
    {img('stage_dc_lines', at('dc_lines'))}
  </>;
}

/** A layout's box on screen (left, top, height; the width follows the die) and the map from microns to it. */
export function layoutFrame(layout: { die: Box }, left: number, top: number, height: number) {
  const [x0, y0, x1, y1] = layout.die, width = height * (x1 - x0) / (y1 - y0);
  return { left, top, width, height, px: (x: number) => (x - x0) / (x1 - x0) * width, py: (y: number) => (y1 - y) / (y1 - y0) * height };
}
type Frame = ReturnType<typeof layoutFrame>;
export type Flight = { block: string; cx: number; cy: number; from: number[]; size: number; k: number };

/** Each block's flight from its card of the block view to its place on the layout, one block after another: it
 * starts at the card's centre at the card's size (`cards` on screen, as cardBoxes gives them) and lands at its box. */
export function blockFlights(layout: { blocks: { name: string; box: Box }[] }, f: Frame, cards: { blocks: string[]; x: number; y: number; w: number; h: number }[], frame: number): Flight[] {
  return layout.blocks.map((b, i) => {
    const cx = f.px((b.box[0] + b.box[2]) / 2), cy = f.py((b.box[1] + b.box[3]) / 2), card = cards.find(c => c.blocks.includes(b.name));
    const from = card ? [card.x + card.w / 2 - f.left, card.y + card.h / 2 - f.top] : [cx, cy];
    const size = card ? Math.min(8, Math.max(.35, Math.min(card.w / Math.max(8, f.px(b.box[2]) - f.px(b.box[0])), card.h / Math.max(8, f.py(b.box[1]) - f.py(b.box[3]))))) : 1;
    return { block: b.name, cx, cy, from, size, k: ease(frame, 30 + i * 4, 80 + i * 4) };
  });
}

/** The blocks' drawn layouts (`block_<name>`) on their flights. */
export function FlyingBlocks({ flights, src, Image = 'img', opacity }: { flights: Flight[]; src: (key: string) => string | null; Image?: ComponentType<{ src: string; style: CSSProperties }> | 'img'; opacity: number }) {
  return <>{flights.map(fl => { const url = src(`block_${fl.block}`);
    return url && <Image key={fl.block} src={url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, transformOrigin: `${fl.cx}px ${fl.cy}px`,
      transform: `translate(${(fl.from[0] - fl.cx) * (1 - fl.k)}px, ${(fl.from[1] - fl.cy) * (1 - fl.k)}px) scale(${fl.size + (1 - fl.size) * fl.k})` }} />; })}</>;
}
