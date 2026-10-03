/** One continuous, deterministic circuit plane. Geometry and camera share the score's clock.
 * These fields illustrate RF behavior; they are not electromagnetic simulation results.
 */
import { pixelLayout, pixelPassives, type PixelLayout } from '../pixelLayout';
import { ease } from './timeline';
type Point = [number, number];
const cyan = '#65e6ee', violet = '#b6a0ff', gold = '#e4c796';
const tau = Math.PI * 2;

function path(c: CanvasRenderingContext2D, points: Point[], color: string | CanvasGradient, width = 1, portion = 1) {
  if (points.length < 2 || portion <= 0) return;
  c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round';
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.min(1, portion);
  c.beginPath(); c.moveTo(...points[0]);
  for (let i = 0; i < lengths.length && remaining > 0; i++) {
    const f = Math.min(1, remaining / lengths[i]);
    c.lineTo(points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f);
    remaining -= lengths[i];
  }
  c.stroke();
}
function metal(c: CanvasRenderingContext2D, points: Point[], width: number, progress: number, color = cyan) {
  c.save(); c.translate(0, 5); path(c, points, '#000b', width + 5, progress); c.restore();
  path(c, points, '#163a4a', width + 2, progress);
  const shade = c.createLinearGradient(-250, -220, 350, 250);
  shade.addColorStop(0, '#779998'); shade.addColorStop(.32, '#d5e8da'); shade.addColorStop(.52, color); shade.addColorStop(1, '#36536e');
  path(c, points, shade, width, progress);
  path(c, points, '#edffff70', .7, progress);
}
function halo(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha = 1) {
  c.save(); c.globalAlpha *= alpha;
  const light = c.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, `${color}55`); light.addColorStop(.35, `${color}18`); light.addColorStop(1, `${color}00`);
  c.fillStyle = light; c.fillRect(x - radius, y - radius, radius * 2, radius * 2); c.restore();
}
function plate(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#122f40') {
  c.fillStyle = '#010b14'; c.fillRect(x + 2, y + 5, w, h);
  const fill = c.createLinearGradient(x, y, x + w, y + h); fill.addColorStop(0, color); fill.addColorStop(1, '#081a2b');
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  c.strokeStyle = '#799aa64a'; c.lineWidth = .7; c.strokeRect(x, y, w, h);
  path(c, [[x, y + h], [x, y], [x + w, y]], '#b7d6d447', .8);
}
function via(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#bcdac5'; c.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
  c.fillStyle = '#173744'; c.fillRect(x - .6, y - .6, 1.2, 1.2);
}
function coilPoints(radius: number): Point[] {
  return Array.from({ length: 27 }, (_, i) => {
    const angle = Math.PI + i * Math.PI / 4, r = radius - i * 2.05;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}
function coil(c: CanvasRenderingContext2D, x: number, y: number, time: number, start: number, tint: string) {
  const appear = ease(start, start + 3, time);
  const refinement = Math.sin(ease(14, 19, time) * Math.PI) * 4;
  const points = coilPoints(88 - refinement);
  c.save(); c.translate(x, y);
  c.globalAlpha *= .14 + appear * .86;
  plate(c, -101, -101, 202, 202);
  c.globalAlpha *= .25 + appear * .75;
  c.strokeStyle = '#46657966'; c.lineWidth = .7; c.strokeRect(-95, -95, 190, 190);
  for (let i = 0; i < 15; i++) { via(c, -94 + i * 13.4, -95); via(c, -94 + i * 13.4, 95); }
  path(c, points, '#435866', 1);
  metal(c, points, 7 + ease(7, 14, time) * 2, appear, tint);
  const last = points[points.length - 1];
  // The center terminal crosses below the winding, with an explicit via at either end.
  metal(c, [last, [last[0], 0], [103, 0]], 5, ease(start + 1.5, start + 3.5, time), '#a0b1bf');
  via(c, last[0], last[1]); via(c, 103, 0);
  if (time > start + 1) {
    const field = ease(start + 1, start + 4, time) * (1 - ease(22, 28, time));
    halo(c, 0, 0, 150, tint, field * .7);
    c.save(); c.globalAlpha *= field;
    for (let i = 0; i < 6; i++) {
      const phase = (time * .23 + i / 6) % 1;
      c.globalAlpha = field * Math.sin(phase * Math.PI) * .26;
      c.strokeStyle = tint; c.lineWidth = .7;
      c.beginPath(); c.ellipse(0, 0, 33 + phase * 110, 20 + phase * 75, -.35, 0, tau); c.stroke();
    }
    // A bright current packet follows the actual spiral instead of orbiting independently.
    c.globalAlpha = field * .8; c.setLineDash([15, 165]); c.lineDashOffset = -time * 55;
    path(c, points, '#ddfffa', 1.8); c.restore();
  }
  c.restore();
}
function capacitor(c: CanvasRenderingContext2D, x: number, y: number, time: number, start: number) {
  const p = ease(start, start + 2.5, time);
  c.save(); c.translate(x, y); c.globalAlpha *= .1 + p * .9;
  plate(c, -54, -34, 108, 68, '#173c4a');
  // Interdigitated plates with separate terminals, not an arbitrary glowing block.
  const gap = 3 + Math.sin(ease(14, 19, time) * Math.PI) * 1.8;
  for (let i = 0; i < 12; i++) {
    const left = i % 2 === 0;
    const yy = -27 + i * 4.8;
    metal(c, [[left ? -46 : 46, yy], [left ? 36 - gap : -36 + gap, yy]], 2.4, p, left ? cyan : gold);
  }
  metal(c, [[-46, -27], [-46, 27]], 5, p); metal(c, [[46, -27], [46, 27]], 5, p, gold);
  if (p > .5) halo(c, Math.sin(time * 2) * 18, 0, 65, cyan, .3 * (1 - ease(22, 28, time)));
  c.restore();
}
function transistor(c: CanvasRenderingContext2D, x: number, y: number, time: number, start: number) {
  const p = ease(start, start + 2.5, time);
  c.save(); c.translate(x, y); c.globalAlpha *= .12 + p * .88;
  plate(c, -40, -57, 80, 114, '#302943');
  const stretch = 1 + Math.sin(ease(14, 19, time) * Math.PI) * .12;
  c.scale(1, stretch);
  for (let i = 0; i < 9; i++) {
    const xx = -30 + i * 7.5;
    metal(c, [[xx, -42], [xx, 42]], i % 2 ? 2 : 3, p, i % 2 ? gold : violet);
    if (p > .9) for (let j = 0; j < 4; j++) { via(c, xx, -42 + j * 2.8); via(c, xx, 34 + j * 2.8); }
  }
  metal(c, [[-34, -44], [34, -44]], 5, p, violet); metal(c, [[-34, 44], [34, 44]], 5, p);
  if (p > .7) halo(c, 0, 0, 95, violet, .23 * (1 - ease(23, 28, time)));
  c.restore();
}

const traces: { points: Point[]; start: number; width: number }[] = [
  { points: [[-570, 0], [-333, 0]], start: .2, width: 10 },
  { points: [[-142, 0], [-101, 0], [-101, -44], [-76, -44]], start: 5, width: 7 },
  { points: [[-8, 44], [15, 44], [15, -44], [36, -44]], start: 8, width: 7 },
  { points: [[104, 44], [133, 44], [133, 0], [172, 0]], start: 10, width: 7 },
  { points: [[363, 0], [570, 0]], start: 12, width: 10 },
  { points: [[-180, 0], [-180, -160], [-156, -160]], start: 6.5, width: 5 },
  { points: [[-64, -160], [-42, -160], [-42, -57]], start: 7.5, width: 5 },
  { points: [[70, 57], [70, 160], [89, 160]], start: 10, width: 5 },
  { points: [[181, 160], [385, 160], [385, 0]], start: 11, width: 5 },
  { points: [[-42, -160], [-42, -244]], start: 13, width: 5 },
  { points: [[70, 160], [70, 244]], start: 13.5, width: 5 },
];

// Reuse the site's connected, seeded passive generator. Candidates are illustrative, not PDK results.
const matchingVariants = [pixelPassives.frontEnd, ...[19, 43].map(seed => pixelLayout({
  columns: 12, rows: 14, seed, mirror: 'across', ports: [{ side: 'left', at: 6 }, { side: 'right', at: 6 }],
}))];
function pixelated(c: CanvasRenderingContext2D, x: number, y: number, layout: PixelLayout, time: number, evolve = false) {
  c.save(); c.translate(x, y);
  const size = 176, cw = size / layout.columns, ch = size / layout.rows;
  plate(c, -101, -101, 202, 202, '#183440');
  c.fillStyle = '#030e19'; c.fillRect(-88, -88, size, size);
  const iteration = time < 29 ? 0 : time < 32 ? 1 : 2;
  const from = evolve ? matchingVariants[iteration] : layout;
  const to = evolve ? matchingVariants[Math.min(2, iteration + 1)] : layout;
  const morph = evolve && iteration < 2 ? ease(iteration ? 31 : 28, iteration ? 32 : 29, time) : 0;
  const reveal = evolve ? ease(23, 27, time) : 1;
  const color = c.createLinearGradient(-90, -90, 90, 90);
  color.addColorStop(0, '#cae8d1'); color.addColorStop(.45, cyan); color.addColorStop(1, '#748ab3');
  const baseAlpha = c.globalAlpha;
  for (let r = 0; r < layout.rows; r++) for (let col = 0; col < layout.columns; col++) {
    const xx = -88 + col * cw, yy = -88 + r * ch;
    c.globalAlpha = baseAlpha; c.strokeStyle = '#557b9535'; c.lineWidth = .6; c.strokeRect(xx, yy, cw, ch);
    const fill = Number(from.metal[r][col]) * (1 - morph) + Number(to.metal[r][col]) * morph;
    const on = Math.max(0, Math.min(1, reveal * (layout.columns + 4) - col)) * fill;
    if (!on) continue;
    c.globalAlpha = baseAlpha * on;
    c.fillStyle = '#071422'; c.fillRect(xx + .6, yy + 3, cw - 1, ch - 1);
    c.fillStyle = color; c.fillRect(xx + .4, yy + .4, cw - .8, ch - .8);
    c.fillStyle = '#e5ffff70'; c.fillRect(xx + .7, yy + .7, cw - 1.4, .7);
    if (from.metal[r][col] !== to.metal[r][col] && morph > 0 && morph < 1) {
      c.fillStyle = `rgba(234,248,255,${Math.sin(morph * Math.PI) * .75})`; c.fillRect(xx, yy, cw, ch);
    }
  }
  c.globalAlpha = baseAlpha;
  for (const port of layout.ports) {
    const along = -88 + (port.at + (port.width ?? 2) / 2) * (port.side === 'left' || port.side === 'right' ? ch : cw);
    const points: Point[] = port.side === 'left' ? [[-106, along], [-88, along]] : port.side === 'right' ? [[88, along], [106, along]]
      : port.side === 'top' ? [[along, -106], [along, -88]] : [[along, 88], [along, 106]];
    metal(c, points, 10, reveal);
  }
  for (let i = 0; i < 16; i++) { via(c, -95 + i * 12.6, -95); via(c, -95 + i * 12.6, 95); }
  if (time > 27 && time < 55 && evolve) {
    const phase = (time * .22) % 1;
    halo(c, -75 + phase * 150, 0, 100, cyan, .3);
    c.strokeStyle = '#8ee9e84a'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, 0, 98 + Math.sin(time) * 8, 102 + Math.cos(time) * 6, -.3, 0, tau); c.stroke();
  }
  c.restore();
}

function schematic(c: CanvasRenderingContext2D, time: number) {
  const progress = ease(10, 20, time);
  traces.forEach(({ points }, i) => path(c, points, '#91dbe3', 1.8, Math.max(0, progress * 2 - i * .055)));
  for (const x of [-245, 260]) {
    const winding: Point[] = [[x - 88, 0], [x - 64, 0]];
    for (let i = 0; i <= 100; i++) winding.push([x - 64 + i * 1.28, -Math.abs(Math.sin(i / 100 * Math.PI * 4)) * 27]);
    winding.push([x + 103, 0]); path(c, winding, gold, 2.5, progress);
  }
  for (const [x, y] of [[-110, -160], [135, 160]]) {
    for (const s of [-1, 1]) { path(c, [[x + s * 46, y], [x + s * 9, y]], cyan, 1.8, progress); path(c, [[x + s * 9, y - 27], [x + s * 9, y + 27]], cyan, 2.5, progress); }
  }
  for (const x of [-42, 70]) {
    path(c, [[x - 34, -44], [x - 34, 0], [x - 12, 0]], violet, 2, progress);
    path(c, [[x - 12, -28], [x - 12, 28]], violet, 2.5, progress);
    path(c, [[x, -28], [x, 28]], violet, 2.5, progress);
    path(c, [[x, -22], [x + 25, -22], [x + 25, -44]], violet, 2, progress);
    path(c, [[x, 22], [x + 34, 22], [x + 34, 44]], violet, 2, progress);
    path(c, [[x + 11, 16], [x + 19, 22], [x + 11, 28]], violet, 1.8, progress);
  }
}

function mixer(c: CanvasRenderingContext2D, time: number) {
  for (const [x, y] of [[-45, -45], [45, -45], [45, 45], [-45, 45]]) {
    c.save(); c.translate(x, y); c.scale(.48, .48); transistor(c, 0, 0, 18, 0); c.restore();
  }
  metal(c, [[-94, 0], [-45, 0], [-45, -45], [45, 45], [94, 45]], 4, 1, violet);
  metal(c, [[-94, 45], [-45, 45], [45, -45], [45, 0], [94, 0]], 4, 1);
  halo(c, 0, 0, 110, violet, .15 + Math.sin(time) * .05);
}
function rfSwitch(c: CanvasRenderingContext2D) {
  metal(c, [[-95, 0], [-50, 0], [-50, -44], [93, -44]], 5, 1);
  metal(c, [[-50, 0], [-50, 44], [93, 44]], 5, 1, violet);
  for (const y of [-44, 44]) { c.save(); c.translate(18, y); c.scale(.48, .48); transistor(c, 0, 0, 18, 0); c.restore(); }
}
const arrivals = [
  { kind: 'amplifier', from: [-860, -280], to: [-42, 0], start: 1, end: 17, scale: .7 },
  { kind: 'mixer', from: [880, -350], to: [260, -170], start: 5, end: 22, scale: .63 },
  { kind: 'switch', from: [-860, 380], to: [-255, 170], start: 9, end: 26, scale: .63 },
  { kind: 'divider', from: [900, 330], to: [260, 0], start: 17, end: 29, scale: .95 },
  { kind: 'coupler', from: [-830, -350], to: [-245, 0], start: 20, end: 30, scale: .95 },
] as const;
function incomingCircuits(c: CanvasRenderingContext2D, time: number, portrait: boolean) {
  arrivals.forEach(item => {
    if (time < item.start) return;
    const travel = ease(item.start, item.end, time);
    const persistent = item.kind === 'mixer' || item.kind === 'switch';
    const fade = persistent ? 1 : 1 - ease(item.end - 1, item.end + 3, time);
    if (!fade) return;
    // The arrivals stay below the text on phones instead of starting outside their tall viewport.
    const originX = item.from[0] * (portrait ? .42 : 1), originY = item.from[1] * (portrait ? .7 : 1);
    const x = originX + (item.to[0] - originX) * travel;
    const y = originY + (item.to[1] - originY) * travel;
    c.save(); c.globalAlpha *= ease(item.start, item.start + 2, time) * fade;
    c.translate(x, y); c.rotate((1 - travel) * (item.from[0] < 0 ? -.17 : .17)); c.scale(item.scale, item.scale);
    if (item.kind === 'divider' || item.kind === 'coupler') pixelated(c, 0, 0, item.kind === 'divider' ? pixelPassives.divider : pixelPassives.coupler, time);
    else if (item.kind === 'mixer') mixer(c, time);
    else if (item.kind === 'switch') rfSwitch(c);
    else {
      c.save(); c.translate(-65, 0); c.scale(.63, .63); coil(c, 0, 0, 18, 0, gold); c.restore();
      transistor(c, 48, 0, 18, 0); metal(c, [[0, 0], [14, 0], [14, -44]], 5, 1);
      capacitor(c, 130, 0, 18, 0);
    }
    c.restore();
  });
}

function signal(c: CanvasRenderingContext2D, time: number) {
  const coherent = ease(16, 22, time), fade = ease(.1, 2.5, time) * (1 - ease(24, 29, time));
  const front = -640 + ease(0, 15, time) * 1250;
  c.save(); c.globalAlpha *= fade;
  for (let ribbon = 0; ribbon < 3; ribbon++) {
    const points: Point[] = [];
    for (let x = -620; x <= Math.min(front, 620); x += 3) {
      const amplitude = (12 + ribbon * 6) * (.55 + .45 * Math.sin((x + 620) / 1240 * Math.PI));
      const perturb = (1 - coherent) * Math.sin(x * .048 + time * 1.3) * 7;
      points.push([x, -9 + Math.sin(x * .028 - time * 2.5 + ribbon * .35) * amplitude + perturb]);
    }
    c.globalAlpha = fade * (ribbon ? .16 : .8);
    if (!ribbon) { c.shadowColor = cyan; c.shadowBlur = 10; }
    path(c, points, ribbon === 2 ? violet : cyan, ribbon ? .8 : 1.6);
    c.shadowBlur = 0;
  }
  if (time < 15) halo(c, front, 0, 70, cyan, .8);
  c.restore();
}

/** Draw in CSS pixels. The caller caps backing resolution and renders only while visible. */
export function renderCircuitFilm(c: CanvasRenderingContext2D, width: number, height: number, time: number) {
  c.clearRect(0, 0, width, height);
  const background = c.createRadialGradient(width * .48, height * .48, 0, width * .5, height * .5, Math.max(width, height) * .8);
  background.addColorStop(0, '#122b3d'); background.addColorStop(.5, '#071725'); background.addColorStop(1, '#020911');
  c.fillStyle = background; c.fillRect(0, 0, width, height);
  const portrait = width / height < .85;
  const opening = 1 - ease(4, 22, time), ending = ease(52, 58, time);
  const fit = portrait ? Math.min(width / 780, height / 1830) : Math.min(width / 1570, height / 1130);
  const scale = fit * ((portrait ? .98 : 1.05) - opening * .1 - ending * .12);
  const build = ease(31, 47, time) * 21, physical = ease(30, 39, time);
  c.save();
  c.beginPath(); c.rect(0, height * .30, width, height * .60); c.clip();
  c.translate(width * .5, height * .61);
  c.scale(scale, scale);
  c.rotate(portrait ? -Math.PI / 2 + .09 : -.17 + ease(0, 60, time) * .055);
  c.transform(1, 0, -.18 * physical, 1 - physical * .2, 0, 0);
  c.globalAlpha = 1 - ending * .25;
  // A fine etched substrate continues beyond the die. No unrelated floating particle field.
  c.strokeStyle = '#678fa012'; c.lineWidth = .6;
  for (let x = -1100; x <= 1100; x += 32) path(c, [[x, -800], [x, 800]], '#678fa012', .6);
  for (let y = -800; y <= 800; y += 32) path(c, [[-1100, y], [1100, y]], '#678fa012', .6);
  const body = ease(34, 47, time);
  c.save(); c.globalAlpha *= body;
  for (let layer = 8; layer >= 0; layer--) { c.fillStyle = layer ? '#06101b' : '#0a1e2d'; c.fillRect(-470, -275 + layer * 2, 940, 550); }
  const reflection = c.createLinearGradient(-450, -275, 450, 275);
  reflection.addColorStop(0, '#759da322'); reflection.addColorStop(.5, '#5c95b505'); reflection.addColorStop(1, '#7875b01b');
  c.fillStyle = reflection; c.fillRect(-469, -274, 938, 548);
  for (let i = 0; i < 3; i++) {
    const inset = i * 8;
    path(c, [[-463 + inset, 268 - inset], [-463 + inset, -268 + inset], [463 - inset, -268 + inset], [463 - inset, 268 - inset], [-463 + inset, 268 - inset]], i === 0 ? '#81bbc064' : '#6d83a032', i === 0 ? 1.5 : .7);
  }
  // Edge contact arrays and fine routing supply visual scale.
  for (let i = 0; i < 19; i++) {
    const x = -410 + i * 45;
    for (const y of [-244, 244]) {
      plate(c, x - 11, y - 10, 22, 20, '#3d4d53');
      for (let j = 0; j < 3; j++) via(c, x - 5 + j * 5, y);
      if (i % 3 === 0) path(c, [[x, y - Math.sign(y) * 12], [x, y - Math.sign(y) * 25], [x + 12, y - Math.sign(y) * 37]], '#53748655', 1.5);
    }
  }
  for (const x of [-439, 409]) for (let i = 0; i < 7; i++) plate(c, x, -182 + i * 58, 30, 24, '#335063');
  c.restore();
  c.save(); c.globalAlpha *= ease(10, 13, time) * (1 - ease(31, 40, time)); schematic(c, time); c.restore();
  c.save(); c.globalAlpha *= physical;
  traces.forEach(({ points, start, width: stroke }) => {
    path(c, points, '#57778338', .7);
    metal(c, points, stroke, ease(start, start + 3, build));
    if (build > start + 2 && time < 57) {
      c.save(); c.globalAlpha *= .55 * ease(start + 2, start + 4, build) * (1 - ending);
      c.setLineDash([12, 160]); c.lineDashOffset = -time * 42;
      path(c, points, '#edfff3', 1.5); c.restore();
    }
  });
  capacitor(c, -110, -160, build, 6.5);
  capacitor(c, 135, 160, build, 10);
  transistor(c, -42, 0, build, 7.5);
  transistor(c, 70, 0, build, 9);
  // The arriving mixer and switch become part of the same layout, not floating cards.
  metal(c, [[206, -170], [135, -170], [135, 0]], 4, ease(40, 46, time), violet);
  metal(c, [[-196, 142], [-170, 142], [-170, 0]], 4, ease(41, 47, time));
  c.restore();
  incomingCircuits(c, time, portrait);
  c.save(); c.globalAlpha *= ease(23, 27, time);
  pixelated(c, -245, 0, pixelPassives.frontEnd, time, true);
  pixelated(c, 260, 0, pixelPassives.frontEnd, time, true);
  c.restore();
  signal(c, Math.max(0, (time - 8) * .55));
  // A single, soft grazing reflection reveals the completed physical structure.
  const sweep = ease(47.5, 53.5, time);
  if (sweep > 0 && sweep < 1) {
    c.save(); c.beginPath(); c.rect(-469, -274, 938, 548); c.clip();
    const x = -700 + sweep * 1500;
    const sheen = c.createLinearGradient(x - 120, 0, x + 120, 0);
    sheen.addColorStop(0, '#b8e9ee00'); sheen.addColorStop(.5, '#b8e9ee15'); sheen.addColorStop(1, '#b8e9ee00');
    c.fillStyle = sheen; c.fillRect(x - 120, -275, 240, 550); c.restore();
  }
  c.restore();
  // Film-style edge falloff remains fixed as the plane moves beneath it.
  const vignette = c.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .25, width / 2, height / 2, Math.max(width, height) * .7);
  vignette.addColorStop(0, '#020a1200'); vignette.addColorStop(1, '#020a12cf');
  c.fillStyle = vignette; c.fillRect(0, 0, width, height);
}
