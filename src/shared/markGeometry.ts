/** The GENESIS mark as data, shared by the site (GenesisMark.tsx), the favicon (markSvg.ts) and the film
 * (video/src/story/Landing.tsx): three nodes whose traces flow into a chip. Traces run from their node to the chip and
 * pins run outwards from the chip, so the pixels that build them arrive in that order. Colours are not drawn here:
 * the mark takes the four brand colours of src/content/brand.json. */

export type Trace = { d: string; width: number; order: number };
export type Node = { x: number; y: number; r: number };
export type Mark = { viewBox: string; x: number; y: number; width: number; height: number; nodes: Node[]; traces: Trace[]; chip: { frame: string; pins: string[]; stroke: number; die: { x: number; y: number; w: number; h: number; rx: number } } };

export const mark: Mark = {
  viewBox: '165 345 935 495', x: 165, y: 345, width: 935, height: 495,
  nodes: [{ x: 382, y: 412, r: 57 }, { x: 240, y: 592, r: 63 }, { x: 375, y: 780, r: 57 }],
  // `order` is the turn of each branch: the top one first, the two from the middle node together, the bottom one last.
  traces: [
    { d: 'M430 410 C 520 410, 600 562, 700 565 H 765', width: 24, order: 0 },
    { d: 'M290 585 C 360 540, 420 500, 500 515 C 570 528, 600 608, 765 610', width: 24, order: 1 },
    { d: 'M290 600 C 360 650, 420 712, 500 700 C 570 690, 600 612, 765 610', width: 24, order: 1 },
    { d: 'M425 778 C 520 778, 600 658, 700 655 H 765', width: 24, order: 2 },
  ],
  chip: {
    stroke: 24,
    frame: 'M765 517 Q 765 505 777 505 H 993 Q 1005 505 1005 517 V 728 Q 1005 740 993 740 H 777 Q 765 740 765 728 Z',
    pins: [805, 857, 909, 960].flatMap(x => [`M${x} 495 V 425`, `M${x} 750 V 820`]).concat([547, 598, 650, 700].map(y => `M1015 ${y} H 1085`)),
    die: { x: 805, y: 545, w: 155, h: 155, rx: 14 },
  },
};

export type BrandColors = { brand1: string; brand2: string; brand3: string; brand4: string };
/** The site's colours as CSS variables (set from brand.json by vite.config.ts). */
export const cssBrand: BrandColors = { brand1: 'var(--brand-1)', brand2: 'var(--brand-2)', brand3: 'var(--brand-3)', brand4: 'var(--brand-4)' };

type Pt = [number, number];
/** Points along an SVG path made of M, L, H, V, C, Q and Z, about `step` units apart. */
export function samplePath(d: string, step = 3): Pt[] {
  const tok = d.match(/[MLHVCQZ]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const num = () => Number(tok[i++]);
  const curve = (f: (u: number) => Pt, length: number) => { const n = Math.max(2, Math.ceil(length / step)); for (let k = 1; k <= n; k++) pts.push(f(k / n)); [x, y] = pts[pts.length - 1]; };
  const line = (x2: number, y2: number) => { const x1 = x, y1 = y; curve(u => [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u], Math.hypot(x2 - x1, y2 - y1)); };
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { x = sx = num(); y = sy = num(); pts.push([x, y]); cmd = 'L'; }
    else if (cmd === 'L') line(num(), num());
    else if (cmd === 'H') line(num(), y);
    else if (cmd === 'V') line(x, num());
    else if (cmd === 'C') { const x0 = x, y0 = y, [a, b, c, e, f, g] = [num(), num(), num(), num(), num(), num()];
      curve(u => { const v = 1 - u; return [v * v * v * x0 + 3 * v * v * u * a + 3 * v * u * u * c + u * u * u * f, v * v * v * y0 + 3 * v * v * u * b + 3 * v * u * u * e + u * u * u * g]; }, Math.hypot(f - x0, g - y0) * 1.4); }
    else if (cmd === 'Q') { const x0 = x, y0 = y, [a, b, c, e] = [num(), num(), num(), num()];
      curve(u => { const v = 1 - u; return [v * v * x0 + 2 * v * u * a + u * u * c, v * v * y0 + 2 * v * u * b + u * u * e]; }, Math.hypot(c - x0, e - y0) * 1.3); }
    else if (cmd === 'Z') { line(sx, sy); cmd = ''; }
    else i++;
  }
  return pts;
}
