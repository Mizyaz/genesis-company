/** The GENESIS symbol: a front end drawn in binary metal pixels, the way GENESIS lays out pixelated passives. Feed
 * lines fan out of the active core like a crest, a pixel passive spreads on either side with ports at its points, and
 * the core holds the transistor fingers between two gate bars. It is mirror-symmetric and always the same: fixed shapes
 * and a fixed seed, laid out once when the module loads. An illustration of the idea, not a simulated layout. */

type Point = readonly [number, number];
/** 0 no metal, 1 metal, 2 transistor finger, 3 port pad. */
export type Cell = 0 | 1 | 2 | 3;

const inside = (shape: readonly Point[], x: number, y: number) => {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, yi] = shape[i], [xj, yj] = shape[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// Design units: 64 across. Only the left half is drawn (x from 0 to the centre line at 32), then mirrored.
type Blade = { base: Point; tip: Point; width: number; bend: number; slot: boolean };
const blades: Blade[] = [
  { base: [32, 24], tip: [32, -2], width: 2.6, bend: 0, slot: false },
  { base: [28.5, 26], tip: [24.5, 3.5], width: 2.8, bend: -.5, slot: true },
  { base: [26, 27.5], tip: [13, 8], width: 3.1, bend: -1.1, slot: true },
  { base: [23.5, 30], tip: [2.5, 12.5], width: 2.6, bend: -1.6, slot: true },
];
/** A point along a feed line (t from base to tip), `across` units to its side. */
const along = ({ base: [bx, by], tip: [tx, ty], bend }: Blade, t: number, across: number): Point => {
  const dx = tx - bx, dy = ty - by, length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
  const side = across + bend * Math.sin(Math.PI * t);
  return [bx + dx * t + nx * side, by + dy * t + ny * side];
};
// A feed line is a lens: narrow at the core, widest a third of the way up, pointed at the end.
const profile = [[0, .35], [.18, .8], [.4, 1], [.62, .8], [.82, .45], [1, 0]] as const;
const outline = (blade: Blade): Point[] => [
  ...profile.map(([t, k]) => along(blade, t, blade.width * k)),
  ...profile.slice(0, -1).reverse().map(([t, k]) => along(blade, t, -blade.width * k)),
];
const bladeShapes = blades.map(outline);
/** The active core: a mask with a notch at the bottom. */
const core: Point[] = [[32, 22.5], [26, 22.8], [22, 24.5], [20, 28], [19.6, 34], [20.6, 41], [23, 46.5], [26.5, 50], [28.6, 50.5], [28.6, 44], [32, 43.5]];
/** The pixel passive: three points (up and out, out, down), each ending in a port. */
const wing: Point[] = [[20.5, 30], [10, 28.5], [2, 22.5], [6.5, 33], [11.5, 37.5], [1.5, 44.5], [11, 44], [14, 47.5], [10.5, 54.5], [18.5, 50], [22, 45]];
const ports: Point[] = [[2.5, 23], [2, 44.5], [11, 54], [3, 13]];

/** The symbol as a grid of cells, `size` cells across. The small grid (the logo) keeps the shapes and drops the finest
 * texture: no holes in the passives and no slots in the feed lines. */
export function drawEmblem(size: 64 | 32, seed = 5): Cell[][] {
  const unit = 64 / size, half = size / 2, fine = size === 64;
  let state = seed;
  const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const grid: Cell[][] = Array.from({ length: size }, () => new Array<Cell>(size).fill(0));
  const zone: string[][] = Array.from({ length: size }, () => new Array<string>(size).fill(''));
  const centre = (c: number, r: number): Point => [(c + .5) * unit, (r + .5) * unit];
  for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) {
    const [x, y] = centre(c, r);
    zone[r][c] = inside(core, x, y) ? 'core' : inside(wing, x, y) ? 'wing' : bladeShapes.some(shape => inside(shape, x, y)) ? 'blade' : '';
  }
  const edge = (r: number, c: number, reach = 1) => [[reach, 0], [-reach, 0], [0, reach], [0, -reach]]
    .some(([dr, dc]) => c + dc < half && (zone[r + dr]?.[c + dc] ?? '') !== zone[r][c]);
  // The passives: random metal smoothed once by majority vote, the look of a searched binary layout; the rim stays metal.
  for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) if (zone[r][c] === 'wing') grid[r][c] = !fine || random() < .52 ? 1 : 0;
  if (fine) {
    const votes = grid.map(row => row.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) if (zone[r][c] === 'wing') {
      let metal = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (grid[r + dr]?.[c + dc] === 1) metal++;
      votes[r][c] = metal >= 5 ? 1 : metal <= 2 ? 0 : grid[r][c];
    }
    for (let r = 0; r < size; r++) grid[r] = votes[r];
    for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) if (zone[r][c] === 'wing' && edge(r, c)) grid[r][c] = 1;
  }
  // The feed lines, the wide ones split by a slot down the middle (coupled lines).
  for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) if (zone[r][c] === 'blade') grid[r][c] = 1;
  if (fine) for (const blade of blades.filter(blade => blade.slot)) for (let t = .25; t <= .7; t += .02) {
    const [x, y] = along(blade, t, 0), c = Math.floor(x / unit), r = Math.floor(y / unit);
    if (zone[r]?.[c] === 'blade') grid[r][c] = 0;
  }
  // The core: a guard ring, a row of vias, then the transistor fingers between two gate bars.
  for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) if (zone[r][c] === 'core') {
    const [, y] = centre(c, r), finger = (half - c) % 2 === 1, bar = (at: number) => Math.abs(y - at) < unit / 2;
    if (edge(r, c)) grid[r][c] = 1;
    else if (edge(r, c, 2)) grid[r][c] = 0;
    else if (bar(30.5) || bar(44.5)) grid[r][c] = 1;
    else if (y >= 26 && y < 29) grid[r][c] = fine && c % 2 === 0 ? 1 : 0;
    else if (y > 31 && y < 44) grid[r][c] = finger ? 2 : 0;
  }
  for (const [x, y] of ports) {
    const c = Math.min(half - 1, Math.round(x / unit)), r = Math.round(y / unit);
    for (const [dr, dc] of fine ? [[-1, -1], [-1, 0], [0, -1], [0, 0]] : [[0, 0]]) if (grid[r + dr]?.[c + dc] !== undefined && c + dc >= 0) grid[r + dr][c + dc] = 3;
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < half; c++) grid[r][size - 1 - c] = grid[r][c];
  return grid;
}

/** One SVG path for the chosen cells: each run of them along a row is one rectangle. */
export function cellPath(grid: Cell[][], cells: readonly Cell[]) {
  return grid.flatMap((row, r) => {
    const runs: string[] = [];
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const on = c < row.length && cells.includes(row[c]);
      if (on && start < 0) start = c;
      if (!on && start >= 0) { runs.push(`M${start} ${r}h${c - start}v1h${start - c}z`); start = -1; }
    }
    return runs;
  }).join('');
}

/** The tight box around the symbol, one cell of margin on every side, as an SVG viewBox. */
export function emblemBox(grid: Cell[][]) {
  const rows = grid.map((row, r) => row.some(Boolean) ? r : -1).filter(r => r >= 0);
  const columns = grid[0].map((_, c) => grid.some(row => row[c]) ? c : -1).filter(c => c >= 0);
  const top = rows[0] - 1, left = columns[0] - 1, width = columns[columns.length - 1] - columns[0] + 3, height = rows[rows.length - 1] - rows[0] + 3;
  return { viewBox: `${left} ${top} ${width} ${height}`, width, height };
}

export const emblem = drawEmblem(64);
export const emblemMark = drawEmblem(32);
