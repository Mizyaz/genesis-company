import type { EmpireId, Glyph } from './layout';
import { pixelPassives, type PixelLayout } from '../shared/pixelLayout';
import { emblemMark } from '../shared/emblem';

/** Cel palettes: each empire steps from ink to light, with one complementary accent and one hot contrast. */
export type Palette = { ink: string; deep: string; mid: string; bright: string; light: string; accent: string; hot: string };
export const palettes: Record<EmpireId | 'genesis', Palette> = {
  circuit: { ink: '#070a2b', deep: '#0d2f7a', mid: '#1f6fe5', bright: '#41dce8', light: '#c9fcff', accent: '#ffe45c', hot: '#ff5fa2' },
  signal: { ink: '#1a0624', deep: '#5c1066', mid: '#c22a95', bright: '#ff6fcf', light: '#ffd8f1', accent: '#ffb23f', hot: '#41dce8' },
  drone: { ink: '#0e0628', deep: '#33177a', mid: '#7a4cf0', bright: '#b08af4', light: '#ece2ff', accent: '#a6ff5c', hot: '#ffe45c' },
  genesis: { ink: '#041325', deep: '#0a3a66', mid: '#2a8fd8', bright: '#41dce8', light: '#e8feff', accent: '#b08af4', hot: '#ff6fcf' },
};

const font = (weight: number, size: number, mono = false) => `${weight} ${size}px ${mono ? '"SFMono-Regular", Consolas, "DejaVu Sans Mono", monospace' : 'Inter, "Segoe UI", system-ui, sans-serif'}`;
type Ctx = CanvasRenderingContext2D;
type Point = [number, number];

export function random(seed: number) {
  let state = seed || 1;
  return () => { state = Math.imul(state ^ (state >>> 15), 2246822507) ^ Math.imul(state ^ (state >>> 13), 3266489909); return ((state ^= state >>> 16) >>> 0) / 4294967296; };
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  const ctx = element.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { element, ctx };
}

/** Every stroke is drawn twice, ink under colour: the outlined look of cel art. */
function stroke(ctx: Ctx, ink: string, color: string, width: number, path: () => void) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [style, size] of [[ink, width + 9], [color, width]] as const) {
    ctx.beginPath(); path(); ctx.strokeStyle = style; ctx.lineWidth = size; ctx.stroke();
  }
}
function fill(ctx: Ctx, ink: string, color: string, path: () => void, outline = 6) {
  ctx.lineJoin = 'round';
  ctx.beginPath(); path(); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = outline; ctx.stroke();
}
const poly = (ctx: Ctx, points: Point[], close = false) => { points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (close) ctx.closePath(); };
const circle = (ctx: Ctx, x: number, y: number, r: number) => ctx.arc(x, y, r, 0, Math.PI * 2);
const curve = (f: (x: number) => number, from: number, to: number, step = 2): Point[] => {
  const points: Point[] = [];
  for (let x = from; x <= to; x += step) points.push([x, f(x)]);
  return points;
};
function chamfer(ctx: Ctx, x: number, y: number, w: number, h: number, c: number) {
  poly(ctx, [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]], true);
}
function lines(ctx: Ctx, text: string, width: number, max: number) {
  const words = text.split(/\s+/), result: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { result.push(line); line = word; }
  }
  if (line) result.push(line);
  if (result.length > max) {
    let last = result[max - 1];
    while (ctx.measureText(`${last}…`).width > width && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    result.splice(max - 1, result.length, `${last}…`);
  }
  return result;
}
function drone(ctx: Ctx, p: Palette, x: number, y: number, s: number, color = p.light) {
  stroke(ctx, p.ink, color, 6 * s, () => poly(ctx, [[x - 22 * s, y - 22 * s], [x + 22 * s, y + 22 * s]]));
  stroke(ctx, p.ink, color, 6 * s, () => poly(ctx, [[x + 22 * s, y - 22 * s], [x - 22 * s, y + 22 * s]]));
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) fill(ctx, p.ink, p.accent, () => circle(ctx, x + dx * 24 * s, y + dy * 24 * s, 10 * s), 4 * s);
  fill(ctx, p.ink, p.hot, () => ctx.rect(x - 9 * s, y - 9 * s, 18 * s, 18 * s), 4 * s);
}
function arrow(ctx: Ctx, p: Palette, from: Point, to: Point, color: string, width = 7) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const head = (a: number): Point => [to[0] - 16 * Math.cos(angle + a), to[1] - 16 * Math.sin(angle + a)];
  stroke(ctx, p.ink, color, width, () => { poly(ctx, [from, to]); poly(ctx, [head(0.55), to, head(-0.55)]); });
}

/** A pixelated passive in its window of the ground plane, `size` across and centred on (x, y): metal pixels with seams
 * between them, and each port's line out to a pad (from `pixelLayout`, the structures of our pixelated papers). */
function pixelated(ctx: Ctx, p: Palette, layout: PixelLayout, size: number, metal: string, x = 0, y = 0) {
  const cell = size / Math.max(layout.columns, layout.rows), w = cell * layout.columns, h = cell * layout.rows, left = x - w / 2, top = y - h / 2;
  for (const port of layout.ports) {
    const along = (port.at + (port.width ?? 2) / 2) * cell;
    const [from, to]: [Point, Point] = port.side === 'left' ? [[left, top + along], [left - 26, top + along]] : port.side === 'right' ? [[left + w, top + along], [left + w + 26, top + along]]
      : port.side === 'top' ? [[left + along, top], [left + along, top - 26]] : [[left + along, top + h], [left + along, top + h + 26]];
    stroke(ctx, p.ink, p.light, 7, () => poly(ctx, [from, to]));
    fill(ctx, p.ink, p.accent, () => ctx.rect(to[0] - 8, to[1] - 8, 16, 16), 5);
  }
  fill(ctx, p.ink, mix(p.ink, p.deep, 0.45), () => ctx.rect(left - 5, top - 5, w + 10, h + 10), 6);
  ctx.fillStyle = metal;
  layout.metal.forEach((row, r) => row.forEach((on, c) => { if (on) ctx.fillRect(left + c * cell + 0.7, top + r * cell + 0.7, cell - 1.4, cell - 1.4); }));
}

/** The picture on top of a building: one symbol per topic, drawn around (0, 0) within ±95. */
function drawGlyph(ctx: Ctx, glyph: Glyph, p: Palette, rnd: () => number, keywords: string) {
  const s = (color: string, width: number, points: Point[], close = false) => stroke(ctx, p.ink, color, width, () => poly(ctx, points, close));
  const f = (color: string, points: Point[]) => fill(ctx, p.ink, color, () => poly(ctx, points, true));
  const dot = (x: number, y: number, r: number, color: string) => fill(ctx, p.ink, color, () => circle(ctx, x, y, r), 5);
  const bumps = (y: number, from: number, to: number, n: number, color: string, up = true) => stroke(ctx, p.ink, color, 7, () => {
    const w = (to - from) / n;
    ctx.moveTo(from, y);
    for (let i = 0; i < n; i++) ctx.arc(from + (i + 0.5) * w, y, w / 2, Math.PI, 0, !up);
  });
  switch (glyph) {
    case 'phase': {
      s(p.bright, 11, curve(x => -22 + 26 * Math.sin(x * 0.075), -88, 88));
      s(p.accent, 11, curve(x => 30 + 26 * Math.sin(x * 0.075 - 1.7), -88, 88));
      arrow(ctx, p, [-2, -66], [22, -66], p.hot, 6); arrow(ctx, p, [22, -66], [-2, -66], p.hot, 6);
      break;
    }
    case 'bidirectional': {
      f(p.bright, [[-58, -60], [-58, -6], [36, -33]]);
      f(p.accent, [[58, 6], [58, 60], [-36, 33]]);
      s(p.light, 7, [[-94, -33], [-58, -33]]); s(p.light, 7, [[36, -33], [94, -33]]);
      s(p.light, 7, [[-94, 33], [-36, 33]]); s(p.light, 7, [[58, 33], [94, 33]]);
      if (/radar/i.test(keywords)) for (const r of [16, 30]) stroke(ctx, p.ink, p.hot, 6, () => ctx.arc(-94, 0, r, -0.9, 0.9));
      break;
    }
    case 'mixer': {
      dot(0, 0, 46, p.mid);
      s(p.light, 8, [[-31, -31], [31, 31]]); s(p.light, 8, [[-31, 31], [31, -31]]);
      arrow(ctx, p, [-98, 0], [-50, 0], p.bright, 8); arrow(ctx, p, [50, 0], [98, 0], p.accent, 8); arrow(ctx, p, [0, 98], [0, 50], p.hot, 8);
      s(p.bright, 7, [[-70, -64], [-40, -64], [-40, -84], [40, -84], [40, -64], [70, -64]]);
      break;
    }
    case 'switch': {
      s(p.bright, 8, [[-98, 0], [-54, 0]]); dot(-54, 0, 10, p.light);
      s(p.accent, 11, [[-54, 0], [38, -42]]);
      dot(50, -48, 10, p.light); dot(50, 48, 10, p.light);
      s(p.bright, 8, [[60, -48], [98, -48]]); s(p.mid, 8, [[60, 48], [98, 48]]);
      break;
    }
    case 'distributed': {
      bumps(-54, -92, 92, 4, p.bright); bumps(56, -92, 92, 4, p.accent, false);
      for (const x of [-46, 0, 46]) { s(p.light, 6, [[x, -54], [x, -30]]); s(p.light, 6, [[x, 26], [x, 56]]); f(p.hot, [[x - 17, 26], [x + 17, 26], [x, -30]]); }
      break;
    }
    case 'gain': {
      f(p.bright, [[-94, -48], [-94, 48], [-20, 0]]);
      s(p.light, 6, [[-20, 0], [-4, 0]]);
      const steps: Point[] = [[4, 66]];
      for (let i = 0; i < 6; i++) steps.push([4 + i * 15, 66 - (i + 1) * 20], [19 + i * 15, 66 - (i + 1) * 20]);
      s(p.accent, 8, steps);
      break;
    }
    case 'amplifier': {
      f(p.bright, [[-50, -62], [-50, 62], [58, 0]]);
      s(p.light, 5, curve(x => 6 * Math.sin(x * 0.9) + 4 * Math.sin(x * 2.3), -98, -50, 1));
      s(p.accent, 8, curve(x => 22 * Math.sin((x - 58) * 0.17), 58, 100, 1));
      if (/sensing|5G/i.test(keywords)) { s(p.hot, 6, [[-74, -58], [-74, -86]]); f(p.hot, [[-90, -98], [-58, -98], [-74, -78]]); }
      else { ctx.font = font(900, 44); ctx.textAlign = 'center'; ctx.fillStyle = p.ink; ctx.fillText('Q', -14, 16); }
      break;
    }
    case 'spectrogram': {
      for (let c = 0; c < 7; c++) for (let r = 0; r < 5; r++) {
        const chirp = r === 4 - Math.round((c * 4) / 6);
        const level = chirp ? 3 : Math.floor(rnd() * 3);
        f([p.deep, p.mid, p.bright, p.accent][level], [[-94 + c * 27, -66 + r * 27], [-72 + c * 27, -66 + r * 27], [-72 + c * 27, -44 + r * 27], [-94 + c * 27, -44 + r * 27]]);
      }
      s(p.hot, 6, [[-86, 86], [-30, 86], [-30, 72], [26, 72], [26, 86], [94, 86]]);
      break;
    }
    case 'chirp': {
      const digital = /baseband/i.test(keywords), calibrated = /calibration/i.test(keywords);
      const wave = curve(x => 30 * Math.sin(0.0024 * (x + 98) ** 2 + 0.04 * (x + 98)), -98, -8, 1);
      s(p.bright, 8, digital ? wave.map(([x, y]) => [x, Math.round(y / 12) * 12] as Point) : wave);
      arrow(ctx, p, [2, 0], [30, 0], p.light, 6);
      s(p.accent, 9, [[38, 42], [54, 42], [60, 34], [65, -74], [70, 34], [76, 42], [96, 42]]);
      if (calibrated) for (let i = 0; i < 7; i++) { const a = Math.PI * (1.1 + i * 0.13); s(p.hot, 5, [[-50 + 58 * Math.cos(a), 82 + 58 * Math.sin(a)], [-50 + 70 * Math.cos(a), 82 + 70 * Math.sin(a)]]); }
      if (digital) for (const x of [-70, -40]) f(p.hot, [[x, 60], [x + 22, 60], [x + 22, 82], [x, 82]]);
      break;
    }
    case 'grid': {
      s(p.light, 7, [[-40, 92], [-12, -82], [12, -82], [40, 92]]);
      s(p.light, 6, [[-62, -50], [62, -50]]); s(p.light, 6, [[-48, -14], [48, -14]]);
      s(p.bright, 4, [[-30, 40], [22, -14], [-22, -14], [30, 40]]);
      f(p.accent, [[52, -74], [26, -6], [46, -6], [22, 70], [80, -18], [58, -18], [76, -74]]);
      break;
    }
    case 'field': {
      for (let i = 0; i < 6; i++) s(i % 2 ? p.accent : p.mid, 7, [[-100 + i * 36, 94], [-44 + i * 18, 18]]);
      drone(ctx, p, -52, -46, 0.8); drone(ctx, p, 10, -66, 0.7); drone(ctx, p, 64, -34, 0.8);
      break;
    }
    case 'chain': {
      const cube = (x: number, y: number, n: number) => {
        f(p.light, [[x, y - n], [x + n * 0.87, y - n / 2], [x, y], [x - n * 0.87, y - n / 2]]);
        f(p.bright, [[x - n * 0.87, y - n / 2], [x, y], [x, y + n], [x - n * 0.87, y + n / 2]]);
        f(p.mid, [[x + n * 0.87, y - n / 2], [x, y], [x, y + n], [x + n * 0.87, y + n / 2]]);
      };
      s(p.accent, 8, [[-58, 8], [0, -14]]); s(p.accent, 8, [[0, -14], [58, 8]]);
      cube(-60, 12, 34); cube(0, -22, 34); cube(60, 12, 34);
      s(p.hot, 6, [[-30, 78], [30, 78]]); dot(-34, 78, 7, p.hot); dot(34, 78, 7, p.hot);
      break;
    }
    case 'transformer': {
      for (const [x, up, color] of [[-32, true, p.bright], [32, false, p.accent]] as const) stroke(ctx, p.ink, color, 7, () => {
        ctx.moveTo(x, -76);
        for (let i = 0; i < 4; i++) ctx.arc(x, -57 + i * 38, 19, -Math.PI / 2, Math.PI / 2, !up);
      });
      s(p.light, 5, [[-7, -80], [-7, 80]]); s(p.light, 5, [[7, -80], [7, 80]]);
      dot(-60, -70, 7, p.hot); dot(60, -70, 7, p.hot);
      s(p.bright, 6, [[-32, -76], [-92, -76]]); s(p.bright, 6, [[-32, 76], [-92, 76]]);
      s(p.accent, 6, [[32, -76], [92, -76]]); s(p.accent, 6, [[32, 0], [92, 0]]); s(p.accent, 6, [[32, 76], [92, 76]]);
      break;
    }
    case 'dots': {
      const colors = [p.light, p.accent, p.hot, p.bright, p.mid];
      for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
        const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
        if (ring <= 3) dot(q * 26 + r * 13, r * 22.5, 10, colors[ring]);
      }
      break;
    }
    case 'survey': {
      const page = (dx: number, dy: number, turn: number, color: string, text: boolean) => {
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(turn);
        f(color, [[-46, -62], [30, -62], [46, -46], [46, 62], [-46, 62]]);
        if (text) for (let i = 0; i < 5; i++) s(p.mid, 5, [[-30, -30 + i * 18], [i === 4 ? 4 : 30, -30 + i * 18]]);
        ctx.restore();
      };
      page(-30, 10, -0.22, p.mid, false); page(24, 4, 0.18, p.bright, false); page(-2, 0, 0, p.light, true);
      f(p.accent, [[-14, -58], [10, -58], [10, -34], [-14, -34]]);
      break;
    }
    case 'medical': {
      drone(ctx, p, 0, -52, 1.1);
      s(p.light, 5, [[0, -30], [0, 12]]);
      f(p.light, [[-34, 12], [34, 12], [34, 80], [-34, 80]]);
      f(p.hot, [[-8, 26], [8, 26], [8, 40], [22, 40], [22, 56], [8, 56], [8, 70], [-8, 70], [-8, 56], [-22, 56], [-22, 40], [-8, 40]]);
      break;
    }
    case 'leaf': {
      fill(ctx, p.ink, p.accent, () => { ctx.moveTo(-70, 76); ctx.quadraticCurveTo(-80, -40, 70, -64); ctx.quadraticCurveTo(62, 70, -70, 76); });
      s(p.ink, 2, [[-62, 68], [58, -54]]);
      for (let i = 1; i < 5; i++) s(p.mid, 3, [[-62 + i * 24, 68 - i * 24], [-62 + i * 24 + (i % 2 ? 22 : -8), 68 - i * 24 + (i % 2 ? 8 : -22)]]);
      drone(ctx, p, 56, 50, 0.7);
      break;
    }
    case 'agents': {
      for (const [x, y] of [[-64, -52], [64, -52], [0, 76]] as Point[]) { ctx.setLineDash([8, 10]); s(p.light, 4, [[x, y], [0, 0]]); ctx.setLineDash([]); }
      dot(0, 0, 22, p.hot); s(p.ink, 4, [[-30, 0], [30, 0]]); s(p.ink, 4, [[0, -30], [0, 30]]);
      f(p.accent, [[-64, -76], [-40, -36], [-88, -36]]);
      f(p.bright, [[42, -74], [86, -74], [86, -30], [42, -30]]);
      f(p.mid, [...Array(6)].map((_, i) => [22 * Math.cos(i * Math.PI / 3), 76 + 22 * Math.sin(i * Math.PI / 3)] as Point));
      break;
    }
    case 'coverage': {
      ctx.setLineDash([10, 8]); s(p.mid, 4, [[-86, -86], [86, -86], [86, 86], [-86, 86]], true); ctx.setLineDash([]);
      const path: Point[] = [];
      for (let i = 0; i < 5; i++) { const x = -66 + i * 33; path.push(i % 2 ? [x, 66] : [x, -66], i % 2 ? [x, -66] : [x, 66]); }
      s(p.accent, 7, path);
      drone(ctx, p, 66, 66, 0.6); dot(-66, -66, 9, p.hot); dot(66, -66, 9, p.hot);
      break;
    }
    case 'relay': {
      const nodes: Point[] = [...Array(5)].map((_, i) => { const a = i * 1.257 + rnd() * 0.6; const r = 52 + rnd() * 30; return [r * Math.cos(a), r * Math.sin(a)]; });
      nodes.forEach((node, i) => s(p.bright, 5, [node, nodes[(i + 1) % nodes.length]]));
      s(p.accent, 5, [nodes[0], nodes[2]]);
      nodes.forEach(([x, y], i) => i ? dot(x, y, 10, i % 2 ? p.light : p.accent) : drone(ctx, p, x, y, 0.55));
      for (const r of [18, 32]) stroke(ctx, p.ink, p.hot, 5, () => ctx.arc(nodes[2][0], nodes[2][1], r, -2.4, -0.7));
      break;
    }
    case 'priority': {
      const targets: Point[] = [[-40, -54], [52, -18], [-6, 62]];
      ctx.setLineDash([10, 9]); s(p.light, 5, [[-84, 84], ...targets]); ctx.setLineDash([]);
      drone(ctx, p, -84, 84, 0.5);
      targets.forEach(([x, y], i) => {
        dot(x, y, 22, [p.hot, p.accent, p.bright][i]);
        ctx.font = font(900, 26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = p.ink; ctx.fillText(String(i + 1), x, y + 1);
      });
      ctx.textBaseline = 'alphabetic';
      break;
    }
    case 'sensing': {
      for (const [w, color] of [[92, p.deep], [66, p.mid], [40, p.bright]] as const) f(color, [[0, -42], [w, 88], [-w, 88]]);
      for (const [x, y] of [[-40, 70], [18, 54], [52, 76]] as Point[]) f(p.accent, [[x, y - 10], [x + 10, y], [x, y + 10], [x - 10, y]]);
      drone(ctx, p, 0, -62, 0.9);
      break;
    }
    case 'search': {
      ctx.setLineDash([9, 9]); stroke(ctx, p.ink, p.mid, 4, () => circle(ctx, 0, 0, 66)); ctx.setLineDash([]);
      dot(0, 0, 18, p.hot); s(p.light, 5, [[-34, 0], [-22, 0]]); s(p.light, 5, [[22, 0], [34, 0]]); s(p.light, 5, [[0, -34], [0, -22]]); s(p.light, 5, [[0, 22], [0, 34]]);
      const turn = rnd() * Math.PI;
      for (let i = 0; i < 3; i++) drone(ctx, p, 66 * Math.cos(turn + i * 2.094), 66 * Math.sin(turn + i * 2.094), 0.55);
      break;
    }
    case 'bayes': {
      for (const [w, color] of [[2.2, p.deep], [1.5, p.mid], [0.9, p.bright]] as const)
        f(color, [[-96, 70], ...curve(x => 70 - 118 * Math.exp(-(x * x) / (2 * (24 * w) ** 2)) * (0.62 + 0.38 / w), -96, 96, 3), [96, 70]]);
      s(p.light, 6, [[-98, 72], [98, 72]]);
      for (const x of [-58, -22, 14, 46]) { const y = 70 - 118 * Math.exp(-(x * x) / (2 * 21.6 ** 2)); f(p.accent, [[x, y - 10], [x + 9, y], [x, y + 10], [x - 9, y]]); }
      break;
    }
    case 'pixels': {
      // A wideband directional coupler: four ports and the pixels between them.
      pixelated(ctx, p, pixelPassives.coupler, 128, p.bright);
      break;
    }
    case 'ports': {
      // Three-port circuits: one input, an equal split to two outputs.
      pixelated(ctx, p, pixelPassives.threePort, 128, p.bright);
      break;
    }
    case 'stack': {
      // Stacked binary metal layers: the lower one behind, the upper one in front, joined by vias where both have metal.
      const { lower, upper } = pixelPassives, cell = 100 / upper.columns;
      pixelated(ctx, p, lower, 100, p.mid, -18, 16);
      pixelated(ctx, p, upper, 100, p.bright, 18, -16);
      ctx.fillStyle = p.hot;
      upper.metal.forEach((row, r) => row.forEach((on, c) => {
        if (on && lower.metal[r][c] && (r + 2 * c) % 5 === 0) ctx.fillRect(18 - 50 + c * cell + cell * 0.3, -16 - 50 + r * cell + cell * 0.3, cell * 0.4, cell * 0.4);
      }));
      break;
    }
    case 'book': {
      f(p.light, [[-90, -34], [-4, -18], [-4, 74], [-90, 58]]);
      f(p.light, [[90, -34], [4, -18], [4, 74], [90, 58]]);
      s(p.hot, 6, curve(x => 22 + 18 * Math.sin(x * 0.09), -80, 80));
      f(p.accent, [[0, -96], [9, -70], [34, -62], [9, -54], [0, -28], [-9, -54], [-34, -62], [-9, -70]]);
      break;
    }
    default: {
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { s(p.light, 6, [[side * 54, -48 + i * 24], [side * 82, -48 + i * 24]]); s(p.light, 6, [[-48 + i * 24, side * 54], [-48 + i * 24, side * 82]]); }
      f(p.bright, [[-54, -54], [54, -54], [54, 54], [-54, 54]]);
      f(p.accent, [[-20, -20], [20, -20], [20, 20], [-20, 20]]);
    }
  }
}

export type PosterSpec = { year: number; kind: string; title: string; venue: string; empireName: string; empire: EmpireId; glyph: Glyph; seed: number; keywords: string[] };

/** A 4:5 poster: year and type, a psychedelic sunburst with stepped rings, the topic symbol, the title. Corners are cut like a chip. */
export function posterCanvas(spec: PosterSpec, width: number) {
  const { element, ctx } = canvas(width, Math.round(width * 1.25));
  const p = palettes[spec.empire], rnd = random(spec.seed);
  ctx.scale(width / 512, width / 512);
  ctx.beginPath(); chamfer(ctx, 0, 0, 512, 640, 34); ctx.fillStyle = p.ink; ctx.fill();
  // Art window: alternating rays, then stepped rings towards the medallion.
  ctx.save(); ctx.beginPath(); chamfer(ctx, 24, 104, 464, 334, 22); ctx.clip();
  ctx.fillStyle = p.deep; ctx.fillRect(24, 104, 464, 334);
  const rays = 16 + (spec.seed % 3) * 4, turn = rnd() * Math.PI;
  for (let i = 0; i < rays; i += 2) {
    ctx.beginPath(); ctx.moveTo(256, 271);
    ctx.arc(256, 271, 420, turn + (i * Math.PI * 2) / rays, turn + ((i + 1) * Math.PI * 2) / rays); ctx.closePath();
    ctx.fillStyle = p.mid; ctx.fill();
  }
  const rings = [p.hot, p.ink, p.accent, p.ink, p.bright];
  rings.forEach((color, i) => { ctx.beginPath(); circle(ctx, 256, 271, 170 - i * 9); ctx.fillStyle = color; ctx.fill(); });
  ctx.beginPath(); circle(ctx, 256, 271, 128); ctx.fillStyle = p.ink; ctx.fill();
  ctx.beginPath(); circle(ctx, 256, 271, 118); ctx.fillStyle = mix(p.ink, p.deep, 0.55); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(256, 271); drawGlyph(ctx, spec.glyph, p, rnd, spec.keywords.join(' ')); ctx.restore();
  // Frame: a bright inner line inside the ink border.
  ctx.beginPath(); chamfer(ctx, 9, 9, 494, 622, 28); ctx.strokeStyle = p.bright; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); chamfer(ctx, 24, 104, 464, 334, 22); ctx.strokeStyle = p.ink; ctx.lineWidth = 6; ctx.stroke();
  // Year and type.
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = font(800, 64); ctx.fillStyle = p.light; ctx.fillText(String(spec.year), 34, 82);
  ctx.font = font(700, 19, true);
  const kind = spec.kind.toLocaleUpperCase(document.documentElement.lang || undefined), kindWidth = ctx.measureText(kind).width + 28;
  ctx.beginPath(); chamfer(ctx, 478 - kindWidth, 40, kindWidth, 40, 8); ctx.fillStyle = p.accent; ctx.fill();
  ctx.fillStyle = p.ink; ctx.fillText(kind, 492 - kindWidth, 67);
  // Title, venue and empire.
  ctx.font = font(700, 27); ctx.fillStyle = p.light;
  lines(ctx, spec.title, 452, 3).forEach((line, i) => ctx.fillText(line, 30, 482 + i * 32));
  ctx.font = font(600, 17, true); ctx.fillStyle = p.bright;
  ctx.fillText(lines(ctx, spec.venue, 452, 1)[0], 30, 590);
  ctx.font = font(700, 14, true); ctx.fillStyle = p.accent;
  ctx.fillText(spec.empireName.toLocaleUpperCase(document.documentElement.lang || undefined), 30, 616);
  return element;
}

/** Linear mix of two #rrggbb colours. */
export function mix(a: string, b: string, t: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map(i => Math.round(channel(a, i) * (1 - t) + channel(b, i) * t)).join(',')})`;
}

/** Year numbers for the gates, one atlas cell each. */
export function yearAtlas(years: number[]) {
  const cols = 4, rows = Math.ceil(years.length / cols);
  const { element, ctx } = canvas(cols * 256, rows * 128);
  ctx.font = font(800, 84); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  years.forEach((year, i) => {
    const x = (i % cols) * 256 + 128, y = Math.floor(i / cols) * 128 + 66;
    ctx.strokeStyle = '#08061f'; ctx.lineWidth = 14; ctx.strokeText(String(year), x, y);
    ctx.fillStyle = '#f2fdff'; ctx.fillText(String(year), x, y);
  });
  return { element, cols, rows };
}

/** An empire's banner at the start of its lane: emblem and name on stepped bands. */
export function bannerCanvas(name: string, empire: EmpireId) {
  const { element, ctx } = canvas(1024, 256);
  const p = palettes[empire];
  ctx.beginPath(); chamfer(ctx, 0, 0, 1024, 256, 40); ctx.fillStyle = p.ink; ctx.fill();
  ctx.save(); ctx.beginPath(); chamfer(ctx, 14, 14, 996, 228, 32); ctx.clip();
  [p.deep, mix(p.deep, p.mid, 0.5), p.mid].forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(0, 14 + i * 76, 1024, 76); });
  ctx.restore();
  ctx.beginPath(); chamfer(ctx, 14, 14, 996, 228, 32); ctx.strokeStyle = p.bright; ctx.lineWidth = 6; ctx.stroke();
  ctx.save(); ctx.translate(128, 128); ctx.scale(0.8, 0.8);
  fill(ctx, p.ink, p.ink, () => circle(ctx, 0, 0, 118), 0);
  fill(ctx, p.ink, p.accent, () => circle(ctx, 0, 0, 112), 8);
  fill(ctx, p.ink, mix(p.ink, p.deep, 0.5), () => circle(ctx, 0, 0, 100), 6);
  drawGlyph(ctx, empire === 'circuit' ? 'chip' : empire === 'signal' ? 'chirp' : 'search', p, random(7), '');
  ctx.restore();
  const label = name.toLocaleUpperCase(document.documentElement.lang || undefined);
  let size = 84;
  do { ctx.font = font(800, size); size -= 2; } while (ctx.measureText(label).width > 730 && size > 30);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = p.ink; ctx.lineWidth = 12; ctx.strokeText(label, 250, 132);
  ctx.fillStyle = p.light; ctx.fillText(label, 250, 132);
  return element;
}

/** The present at the end of the timeline. */
export function genesisCanvas(line: string) {
  const { element, ctx } = canvas(1024, 320);
  const p = palettes.genesis;
  ctx.beginPath(); chamfer(ctx, 0, 0, 1024, 320, 48); ctx.fillStyle = p.ink; ctx.fill();
  ctx.beginPath(); chamfer(ctx, 14, 14, 996, 292, 38); ctx.strokeStyle = p.bright; ctx.lineWidth = 6; ctx.stroke();
  // The GENESIS symbol, then the name.
  const cell = 5.2, markTop = 58, markLeft = 64;
  const markGradient = ctx.createLinearGradient(0, markTop, 0, markTop + emblemMark.length * cell);
  markGradient.addColorStop(0, p.bright); markGradient.addColorStop(1, p.accent);
  ctx.save(); ctx.shadowColor = p.bright; ctx.shadowBlur = 18; ctx.fillStyle = markGradient;
  emblemMark.forEach((row, r) => row.forEach((on, c) => { if (on) ctx.fillRect(markLeft + c * cell, markTop + r * cell, cell - 0.6, cell - 0.6); }));
  ctx.restore();
  const gradient = ctx.createLinearGradient(260, 0, 960, 0);
  gradient.addColorStop(0, p.bright); gradient.addColorStop(0.5, '#6fb9ed'); gradient.addColorStop(1, p.accent);
  ctx.font = font(800, 132); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = gradient; ctx.fillText('GENESIS', 616, 140);
  ctx.font = font(600, 36); ctx.fillStyle = p.light; ctx.fillText(line, 616, 252);
  return element;
}

/** Soft light around the signal; everything else stays crisp. */
export function glowCanvas() {
  const { element, ctx } = canvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.25, 'rgba(190,250,255,.55)'); gradient.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  return element;
}

/** A cel sparkle: a four-point star with an ink outline, so the signal reads against a bright sky. */
export function sparkleCanvas() {
  const { element, ctx } = canvas(256, 256);
  const star = (r: number, pinch: number) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 - Math.PI / 2, b = a + Math.PI / 4;
      if (!i) ctx.moveTo(128 + r * Math.cos(a), 128 + r * Math.sin(a));
      ctx.quadraticCurveTo(128 + pinch * Math.cos(b), 128 + pinch * Math.sin(b), 128 + r * Math.cos(a + Math.PI / 2), 128 + r * Math.sin(a + Math.PI / 2));
    }
    ctx.closePath();
  };
  star(118, 16); ctx.fillStyle = '#e6fdff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b0624'; ctx.lineWidth = 9; ctx.stroke();
  star(70, 10); ctx.fillStyle = '#41dce8'; ctx.fill();
  star(34, 6); ctx.fillStyle = '#ffe45c'; ctx.fill();
  return element;
}
