import paint from '../../content/layout_paint.json';
import { B, C } from './palette';

/** The paint of a layout rendered from its GDS (src/content/layout_paint.json, the one source for the site and the
 * app): the kinds of shape in draw order, each with its film color and opacity. */
const COLOURS = { muted: C.muted, 'brand-1': B.brand1, 'brand-3': B.brand3, dc: C.dc } as const;
export type LayoutKind = (typeof paint.kinds)[number]['kind'];
export const LAYOUT_KINDS = paint.kinds.map(k => k.kind) as LayoutKind[];
export function paintOf(kind: string): { colour: string; opacity: number } {
  const k = paint.kinds.find(p => p.kind === kind);
  if (!k) throw new Error(`no paint for the layout kind ${kind}`);
  return { colour: COLOURS[k.colour as keyof typeof COLOURS], opacity: k.opacity };
}
