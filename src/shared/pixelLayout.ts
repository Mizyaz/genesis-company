/** Pixelated passives the way GENESIS lays them out: binary metal on a grid in a window of the ground plane, fed by
 * ports on the window's edge. Random metal is smoothed by a majority vote into connected shapes with holes (the look
 * of a searched layout), every port's line runs into the metal, the ports are joined, metal no port reaches is dropped
 * and the pattern is mirrored where the circuit is symmetric. Illustrations with fixed seeds, not simulated designs. */
export type Side = 'left' | 'right' | 'top' | 'bottom';
/** A port on one side of the window: its first cell along that side and how many cells wide it is. */
export type PixelPort = { side: Side; at: number; width?: number };
/** `across` mirrors top and bottom, `along` left and right. */
export type Mirror = 'none' | 'across' | 'along' | 'both';
export type PixelLayout = { columns: number; rows: number; metal: boolean[][]; ports: PixelPort[] };

export function pixelLayout({ columns, rows, ports, seed, fill = .5, passes = 1, mirror = 'none' }:
  { columns: number; rows: number; ports: PixelPort[]; seed: number; fill?: number; passes?: number; mirror?: Mirror }): PixelLayout {
  let state = seed;
  const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  let metal = Array.from({ length: rows }, () => Array.from({ length: columns }, () => random() < fill));
  const symmetric = () => {
    const across = mirror === 'across' || mirror === 'both', along = mirror === 'along' || mirror === 'both';
    metal = metal.map((row, r) => row.map((on, c) => on || (across && metal[rows - 1 - r][c]) || (along && metal[r][columns - 1 - c])
      || (across && along && metal[rows - 1 - r][columns - 1 - c])));
  };
  const at = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < columns && metal[r][c];
  // Copy the first half (or quarter) onto the mirrored cells before smoothing; the vote then keeps the mirror.
  if (mirror !== 'none') {
    const across = mirror !== 'along', along = mirror !== 'across', source = metal;
    metal = source.map((row, r) => row.map((_, c) => source[across && r >= rows / 2 ? rows - 1 - r : r][along && c >= columns / 2 ? columns - 1 - c : c]));
  }
  for (let pass = 0; pass < passes; pass++) {
    metal = metal.map((row, r) => row.map((on, c) => {
      let votes = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (at(r + dr, c + dc)) votes++;
      return votes >= 5 ? true : votes <= 3 ? false : on;
    }));
  }
  // Each port feeds straight in until it meets metal (at most half the window), then all ports are joined to the first.
  const cells = (port: PixelPort) => Array.from({ length: port.width ?? 2 }, (_, i) => port.at + i);
  const step = (port: PixelPort, depth: number, i: number): [number, number] => port.side === 'left' ? [i, depth] : port.side === 'right' ? [i, columns - 1 - depth]
    : port.side === 'top' ? [depth, i] : [rows - 1 - depth, i];
  const inner = ports.map(port => {
    const reach = Math.floor((port.side === 'left' || port.side === 'right' ? columns : rows) / 2);
    let depth = 0;
    for (; depth < reach; depth++) {
      const hit = depth > 1 && cells(port).some(i => { const [r, c] = step(port, depth, i); return metal[r][c]; });
      if (hit) break;
      for (const i of cells(port)) { const [r, c] = step(port, depth, i); metal[r][c] = true; }
    }
    return step(port, Math.min(depth, reach - 1), cells(port)[0]);
  });
  const reached = () => {
    const seen = metal.map(row => row.map(() => false)), queue = ports.flatMap(port => cells(port).map(i => step(port, 0, i)));
    for (const [r, c] of queue) seen[r][c] = true;
    while (queue.length) {
      const [r, c] = queue.pop()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(r + dr, c + dc) && !seen[r + dr][c + dc]) { seen[r + dr][c + dc] = true; queue.push([r + dr, c + dc]); }
    }
    return seen;
  };
  const joined = (from: [number, number], to: [number, number]) => {
    const seen = metal.map(row => row.map(() => false)), queue = [from];
    seen[from[0]][from[1]] = true;
    while (queue.length) {
      const [r, c] = queue.pop()!;
      if (r === to[0] && c === to[1]) return true;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(r + dr, c + dc) && !seen[r + dr][c + dc]) { seen[r + dr][c + dc] = true; queue.push([r + dr, c + dc]); }
    }
    return false;
  };
  for (const end of inner.slice(1)) if (!joined(inner[0], end)) {
    // A two-cell track: along the rows first, then along the columns.
    const [r0, c0] = inner[0], [r1, c1] = end;
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) for (const r of [r0, r0 + 1]) if (r < rows) metal[r][c] = true;
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) for (const c of [c1, c1 + 1]) if (c < columns) metal[r][c] = true;
  }
  if (mirror !== 'none') symmetric();
  const live = reached();
  metal = metal.map((row, r) => row.map((on, c) => on && live[r][c]));
  return { columns, rows, metal, ports };
}

/** Runs of metal along each row, as [row, first column, length]: few shapes to draw for many pixels. */
export function metalRuns({ metal }: PixelLayout) {
  return metal.flatMap((row, r) => {
    const runs: [number, number, number][] = [];
    let start = -1;
    for (let c = 0; c <= row.length; c++) {
      const on = c < row.length && row[c];
      if (on && start < 0) start = c;
      if (!on && start >= 0) { runs.push([r, start, c - start]); start = -1; }
    }
    return runs;
  });
}

/** The pixelated passives the site shows: a three-port divider (one input, an equal split), the passive of a front end
 * (drawn twice, mirrored, around the transistor core), a four-port coupler and the two layers of a stacked (multi-layer)
 * passive, after the structures in our pixelated-synthesis papers. */
export const pixelPassives = {
  divider: pixelLayout({ columns: 22, rows: 14, seed: 17, mirror: 'across', ports: [{ side: 'left', at: 6 }, { side: 'right', at: 2 }, { side: 'right', at: 10 }] }),
  threePort: pixelLayout({ columns: 18, rows: 18, seed: 29, mirror: 'across', ports: [{ side: 'left', at: 8 }, { side: 'right', at: 3 }, { side: 'right', at: 13 }] }),
  coupler: pixelLayout({ columns: 18, rows: 18, seed: 41, mirror: 'both', ports: [{ side: 'left', at: 3 }, { side: 'left', at: 13 }, { side: 'right', at: 3 }, { side: 'right', at: 13 }] }),
  frontEnd: pixelLayout({ columns: 12, rows: 14, seed: 7, mirror: 'across', ports: [{ side: 'left', at: 6 }, { side: 'right', at: 6 }] }),
  lower: pixelLayout({ columns: 16, rows: 16, seed: 29, mirror: 'both', ports: [{ side: 'left', at: 7 }, { side: 'right', at: 7 }] }),
  upper: pixelLayout({ columns: 16, rows: 16, seed: 23, mirror: 'both', fill: .46, ports: [{ side: 'top', at: 7 }, { side: 'bottom', at: 7 }] }),
};
