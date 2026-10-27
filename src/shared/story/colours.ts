import { kindOf } from './BlockView';
import { B, C, P } from './palette';
import type { Drawing } from './Schematic';

type Layout = { blocks: { name: string }[]; members: { block: string; member: string; cell: string }[] };
/** Block colours in the order of the layout's blocks, kept from the schematic's components to the layout. */
export const BLOCK_COLOURS = [B.brand1, B.brand3, C.dc, P.green, P.pink, B.brand2, P.yellow, P.lime, P.orange, P.lilac];
/** Each layout block's colour. */
export const chipColours = (layout: Pick<Layout, 'blocks'>) => new Map(layout.blocks.map((b, i) => [b.name, BLOCK_COLOURS[i % BLOCK_COLOURS.length]]));
/** The layout block that holds a schematic part: its member of the same name, a port's RF pad, a DC source's pads. */
export function blockOfPart(layout: Layout, label: string, kind: string) {
  const same = layout.members.find(m => m.member.toLowerCase() === label.toLowerCase());
  if (same) return same.block;
  const port = /^p(?:ort)?(\d+)$/i.exec(label);
  if (port) return layout.members.find(m => m.member === `PAD_RF${port[1]}`)?.block;
  if (kind === 'vdc') return layout.members.find(m => kindOf(m.cell) === 'pad')?.block;
}
/** Each part's colour: its layout block's, or a quiet grey for a part no block holds. Grounds stay uncoloured. */
export function partColours(layout: Layout, drawing: Drawing) {
  const chip = chipColours(layout);
  return new Map(drawing.parts.filter(p => p.kind !== 'ground').map(p => [p.label, chip.get(blockOfPart(layout, p.label, p.kind) ?? '') ?? C.muted]));
}
