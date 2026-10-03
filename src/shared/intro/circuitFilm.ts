/** One continuous, deterministic circuit plane. Geometry and camera share the score's clock.
 * These fields illustrate RF behavior; they are not electromagnetic simulation results.
 */
type Point = [number, number];
const cyan = '#65e6ee', violet = '#b6a0ff', gold = '#e4c796';
const tau = Math.PI * 2;
export const ease = (a: number, b: number, time: number) => { const x = Math.max(0, Math.min(1, (time - a) / (b - a))); return x * x * (3 - 2 * x); };

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
  const opening = 1 - ease(1, 11, time), ending = ease(21, 27, time);
  const fit = portrait ? Math.min(width / 720, height / 1470) : Math.min(width / 1320, height / 850);
  const scale = fit * (1.05 + opening * .62 - ending * (portrait ? .28 : .24));
  c.save();
  c.translate(width * (.5 + opening * .12), height * (.5 + ending * (portrait ? .1 : .14)));
  c.scale(scale, scale);
  c.rotate(portrait ? -Math.PI / 2 + .09 : -.17 + ease(0, 30, time) * .055);
  c.transform(1, 0, -.18, .8, opening * 115, 0);
  c.globalAlpha = 1 - ending * .25;
  // A fine etched substrate continues beyond the die. No unrelated floating particle field.
  c.strokeStyle = '#678fa012'; c.lineWidth = .6;
  for (let x = -1100; x <= 1100; x += 32) path(c, [[x, -800], [x, 800]], '#678fa012', .6);
  for (let y = -800; y <= 800; y += 32) path(c, [[-1100, y], [1100, y]], '#678fa012', .6);
  const body = ease(2, 15, time);
  c.save(); c.globalAlpha *= .2 + body * .8;
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
  traces.forEach(({ points, start, width: stroke }) => {
    path(c, points, '#57778338', .7);
    metal(c, points, stroke, ease(start, start + 3, time));
    if (time > start + 2 && time < 26) {
      c.save(); c.globalAlpha *= .55 * ease(start + 2, start + 4, time) * (1 - ending);
      c.setLineDash([12, 160]); c.lineDashOffset = -time * 42;
      path(c, points, '#edfff3', 1.5); c.restore();
    }
  });
  coil(c, -245, 0, time, 2.5, gold);
  coil(c, 260, 0, time, 9.5, cyan);
  capacitor(c, -110, -160, time, 6.5);
  capacitor(c, 135, 160, time, 10);
  transistor(c, -42, 0, time, 7.5);
  transistor(c, 70, 0, time, 9);
  signal(c, time);
  // A single, soft grazing reflection reveals the completed physical structure.
  const sweep = ease(18, 24, time);
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
