/** One receiver, one clock. Illustrative geometry, never a measurement or live tool execution. */
import { ease } from './timeline';
import { blockPose, connectionPath, portPosition, receiverBlocks, receiverCandidates, receiverState,
  type Point, type ReceiverBlock } from './receiverScene';
type Context = CanvasRenderingContext2D;
type Translate = (text: string) => string;
const palette = { cyan: '#72dedc', violet: '#b8a3ed', gold: '#dec898', ink: '#e3ecf2', muted: '#93a9bb' };
const colorOf = (block: ReceiverBlock) => block.kind === 'active' || block.kind === 'mixer' ? palette.violet : palette.cyan;
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

function line(c: Context, points: readonly Point[], color: string, width = 1, progress = 1) {
  if (progress <= 0 || points.length < 2) return;
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = lengths.reduce((a, b) => a + b, 0) * Math.min(1, progress);
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(...points[0]);
  for (let i = 0; i < lengths.length && left > 0; i++) {
    if (!lengths[i]) continue;
    const p = Math.min(1, left / lengths[i]);
    c.lineTo(mix(points[i][0], points[i + 1][0], p), mix(points[i][1], points[i + 1][1], p)); left -= lengths[i];
  }
  c.stroke();
}
function box(c: Context, x: number, y: number, w: number, h: number, fill: string, stroke?: string, radius = 3) {
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
}
function text(c: Context, value: string, x: number, y: number, size = 14, color = palette.muted, align: CanvasTextAlign = 'center', weight = 400) {
  c.fillStyle = color; c.font = `${weight} ${size}px ${c.canvas.dataset.font || 'sans-serif'}`;
  c.textAlign = align; c.textBaseline = 'middle'; c.fillText(value, x, y);
}
function circle(c: Context, x: number, y: number, radius: number, color: string) {
  c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = 1.3; c.stroke();
}
function terminal(c: Context, p: Point, color: string) { box(c, p[0] - 2.3, p[1] - 2.3, 4.6, 4.6, color, undefined, 0); }
function fingers(c: Context, x: number, y: number, count: number, width: number, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  box(c, -32, -34, 64, 68, '#192332', '#66577c');
  const extent = 22 * width;
  for (let i = 0; i < count; i++) {
    const xx = -24 + i * 48 / (count - 1);
    line(c, [[xx, -extent], [xx, extent]], palette.gold, 2.5);
    line(c, [[xx + 2.5, -extent + 5], [xx + 2.5, extent - 5]], palette.violet, 1);
    for (const yy of [-extent, extent]) box(c, xx - 1.5, yy - 1.5, 3, 3, '#edf0dd', undefined, 0);
  }
  line(c, [[-27, -26], [27, -26]], palette.violet, 3); line(c, [[-27, 26], [27, 26]], palette.cyan, 3);
  c.restore();
}
function passive(c: Context, block: ReceiverBlock, time: number, portrait: boolean) {
  const state = receiverState(time), design = receiverCandidates[state.candidate].passives[block.id === 'input' ? 0 : 1];
  const detailed = ease(12.5, 13.3, time), base = c.globalAlpha;
  c.globalAlpha *= mix(.25, 1, detailed);
  const cw = 108 / design.layout.columns, ch = 80 / design.layout.rows;
  for (const [row, col, length] of design.runs) {
    box(c, -54 + col * cw, -40 + row * ch, cw * length, ch + .15, '#a6ccbc', undefined, 0);
    line(c, [[-54 + col * cw, -40 + row * ch], [-54 + (col + length) * cw, -40 + row * ch]], '#e1e6c652', .6);
  }
  c.globalAlpha = base;
  if (detailed < 1) {
    c.save(); c.globalAlpha *= 1 - detailed; box(c, -32, -23, 64, 46, '#0c1b29', '#72dedc90');
    for (let i = 0; i < 3; i++) line(c, [[-21, -12 + i * 12], [-7, -12 + i * 12], [-7, 12 - i * 12], [21, 12 - i * 12]], palette.cyan, 1.4);
    c.restore();
  }
  const feeds: Point[][] = portrait
    ? [[[0, -55], [0, -48], [-64, -48], [-64, 0], [-54, 0]], [[54, 0], [64, 0], [64, 48], [0, 48], [0, 55]]]
    : [[[-72, 0], [-54, 0]], [[54, 0], [72, 0]]];
  feeds.forEach(points => line(c, points, palette.cyan, 2));
}
function active(c: Context, block: ReceiverBlock, time: number, portrait: boolean) {
  const state = receiverState(time), spec = receiverCandidates[state.candidate];
  const detailed = block.kind === 'mixer' ? state.physical : ease(12.5, 13.3, time);
  c.save(); c.globalAlpha *= 1 - detailed;
  if (block.kind === 'mixer') {
    circle(c, 0, 0, 27, palette.violet);
    line(c, [[-18, -18], [18, 18]], palette.violet, 2); line(c, [[-18, 18], [18, -18]], palette.violet, 2);
  } else {
    line(c, [[-25, -30], [-25, 30]], palette.violet, 2.2); line(c, [[-15, -24], [-15, 24]], palette.violet, 2.2);
    line(c, [[-15, -20], [15, -20], [15, -39]], palette.violet, 2);
    line(c, [[-15, 20], [15, 20], [15, 39]], palette.violet, 2); line(c, [[-38, 0], [-25, 0]], palette.violet, 2);
    line(c, [[9, 16], [15, 20], [9, 24]], palette.violet, 1.8);
    // A local capacitor belongs to the amplifier, never to the pixelated matching blocks.
    line(c, [[42, -30], [42, -5]], palette.gold, 1.4); line(c, [[35, -5], [49, -5]], palette.gold, 1.4);
    line(c, [[35, 2], [49, 2]], palette.gold, 1.4); line(c, [[42, 2], [42, 28]], palette.gold, 1.4);
  }
  c.restore(); c.save(); c.globalAlpha *= detailed;
  if (block.kind === 'mixer') {
    for (const x of [-24, 24]) for (const y of [-24, 24]) fingers(c, x, y, 6, .86, .49);
    line(c, [[-40, 0], [40, 0]], palette.gold, 1.6); line(c, [[0, -44], [0, 44]], palette.violet, 1.6);
  } else fingers(c, 0, 0, spec.fingers, spec.width, 1.1);
  c.restore();
  const ports: Point[][] = portrait ? [[[0, -55], [0, -42]], [[0, 42], [0, 55]]]
    : [[[-72, 0], [-39, 0]], [[39, 0], [72, 0]]];
  ports.forEach(points => line(c, points, palette.violet, 2));
}
function drawBlock(c: Context, block: ReceiverBlock, time: number, portrait: boolean, t: Translate) {
  const pose = blockPose(block, portrait, time), state = receiverState(time), tint = colorOf(block);
  c.save(); c.globalAlpha *= pose.opacity; c.translate(pose.x, pose.y); c.scale(pose.scale, pose.scale);
  if (block.kind === 'contact') {
    circle(c, 0, 0, 23, '#415b6d');
    [-10, 0, 10].forEach(y => box(c, -10, y - 2.5, 20, 5, y ? '#345063' : palette.gold, undefined, 1));
  } else {
    const changing = state.change > 0 && ['input', 'lna', 'interstage'].includes(block.id);
    box(c, -72, -55, 144, 110, state.physical ? '#101f2b' : '#0c1b29', changing ? tint : '#365165');
    if (state.physical) {
      line(c, [[-68, 51], [-68, -51], [68, -51]], '#b0c7bf40', 1);
      for (let i = 0; i < 7; i++) for (const y of [-49, 49]) box(c, -54 + i * 18, y - 1, 2, 2, '#9bb3b067', undefined, 0);
    }
    if (block.kind === 'passive') passive(c, block, time, portrait); else active(c, block, time, portrait);
  }
  c.restore(); c.save(); c.globalAlpha *= pose.opacity;
  for (const port of block.ports.filter(port => port === 'in' || port === 'out')) terminal(c, portPosition(block, port, portrait, time), tint);
  const labelX = portrait ? 174 : pose.x, labelY = portrait ? pose.y - 8 : pose.y + 86 * (1 + .12 * state.focus);
  text(c, t(block.name), labelX, labelY, portrait ? 16 : 18, palette.ink, portrait ? 'left' : 'center', 550);
  text(c, t(block.role), labelX, labelY + 23, portrait ? 10.5 : 12, palette.muted, portrait ? 'left' : 'center');
  c.restore();
}
function auxiliary(c: Context, block: ReceiverBlock, time: number, portrait: boolean, t: Translate) {
  const pose = blockPose(block, portrait, time), focus = receiverState(time).focus;
  c.save(); c.globalAlpha *= pose.opacity * (1 - focus);
  if (block.ports.includes('lo')) {
    const pin = portPosition(block, 'lo', portrait, time), origin: Point = portrait ? [pin[0] - 36, pin[1]] : [pin[0], pin[1] - 73];
    circle(c, ...origin, portrait ? 10 : 14, palette.gold);
    line(c, portrait ? [[origin[0] + 10, origin[1]], pin] : [[origin[0], origin[1] + 14], pin], palette.gold, 1.6);
    line(c, Array.from({ length: 25 }, (_, i): Point => [origin[0] - 8 + i * 16 / 24, origin[1] - Math.sin(i / 24 * Math.PI * 2) * 4]), palette.gold, 1.2);
    terminal(c, pin, palette.gold); text(c, 'LO', origin[0], origin[1] - (portrait ? 20 : 27), portrait ? 10 : 12, palette.gold);
  }
  if (block.ports.includes('bias')) {
    const pin = portPosition(block, 'bias', portrait, time), end: Point = portrait ? [pin[0] + 12, pin[1]] : [pin[0], pin[1] - 25];
    line(c, [pin, end], '#91a3b1', 1); circle(c, ...end, 2.5, '#91a3b1');
    if (!portrait) text(c, t('Bias'), end[0], end[1] - 11, 10, palette.muted);
  }
  if (block.ports.includes('ground')) {
    const pin = portPosition(block, 'ground', portrait, time), end: Point = [pin[0] + (portrait ? 10 : 0), pin[1] + (portrait ? 9 : 12)];
    line(c, [pin, [end[0], pin[1]], end], '#738b9c', 1);
    for (let i = 0; i < 3; i++) line(c, [[end[0] - (5 - i * 2), end[1] + i * 3], [end[0] + (5 - i * 2), end[1] + i * 3]], '#738b9c', 1);
  }
  c.restore();
}
function routes(c: Context, time: number, portrait: boolean) {
  const state = receiverState(time);
  for (let i = 0; i < receiverBlocks.length - 1; i++) {
    const opacity = Math.min(blockPose(receiverBlocks[i], portrait, time).opacity, blockPose(receiverBlocks[i + 1], portrait, time).opacity);
    c.save(); c.globalAlpha *= opacity;
    const points = connectionPath(i, portrait, time);
    const progress = time < 27.5 ? ease(5 + i * .55, 5.7 + i * .55, time) : ease(31.5 + i * 1.2, 32.4 + i * 1.2, time);
    line(c, points, '#2c4554', .8);
    if (state.physical) line(c, points, '#2e5664', 5, progress);
    line(c, points, state.physical ? '#b8d2c7' : '#8ccbd0', state.physical ? 2.6 : 1.5, progress);
    if (progress === 1 && (time < 12.5 || time > 38)) {
      c.save(); c.setLineDash([7, 160]); c.lineDashOffset = -(time * 24 - i * 23);
      line(c, points, palette.cyan, 2.2); c.restore();
    }
    c.restore();
  }
}
function overview(c: Context, time: number, portrait: boolean, t: Translate) {
  const focus = receiverState(time).focus;
  if (!focus) return;
  c.save(); c.globalAlpha *= focus;
  const x0 = portrait ? 23 : 389, gap = portrait ? 62 : 83, y = portrait ? 27 : 24;
  receiverBlocks.forEach((block, i) => {
    const x = x0 + i * gap, on = ['input', 'lna', 'interstage'].includes(block.id);
    if (i) line(c, [[x - gap + 9, y], [x - 9, y]], '#3f596b', 1);
    box(c, x - 8, y - 6, 16, 12, on ? colorOf(block) : '#2e4355', undefined, 1);
    text(c, block.id === 'rf' ? 'RF' : block.id === 'if' ? 'IF' : block.id === 'lna' ? 'LNA' : block.id === 'mixer' ? t('Mixer') : (block.id === 'input' ? 'P1' : 'P2'), x, y + 22, 9);
  }); c.restore();
}
function jointPanel(c: Context, time: number, portrait: boolean, t: Translate) {
  const state = receiverState(time);
  if (!state.focus) return;
  c.save(); c.globalAlpha *= state.focus;
  const y = portrait ? 505 : 384, mid = portrait ? 180 : 600;
  if (!portrait) {
    line(c, [[265, 340], [265, 352], [935, 352], [935, 340]], '#73638c', 1);
    line(c, [[600, 340], [600, 368]], '#73638c', 1);
  }
  text(c, `GENESIS / ${t(state.selected ? 'Selected design' : 'Joint design')}`, mid, y, portrait ? 11 : 12, palette.violet, 'center', 500);
  receiverCandidates.forEach((candidate, i) => {
    const x = mid + (i - 1) * (portrait ? 69 : 105), selected = i === state.candidate;
    box(c, x - 24, y + 17, 48, 30, selected ? '#18343f' : '#0c1a27', selected ? palette.cyan : '#334a5b', 4);
    text(c, candidate.id, x, y + 32, 14, selected ? palette.cyan : palette.muted, 'center', 550);
  });
  if (!portrait) text(c, t(state.selected ? 'Selected' : 'One coordinated design'), mid, y + 69, 12);
  c.restore();
}
function evaluationPanel(c: Context, time: number, portrait: boolean, t: Translate) {
  const state = receiverState(time);
  if (!state.evaluation) return;
  c.save(); c.globalAlpha *= state.evaluation;
  const x = portrait ? 24 : 770, y = portrait ? 535 : 332, w = portrait ? 312 : 365, h = portrait ? 74 : 90;
  box(c, x, y, w, h, '#0f202f', '#37576a', 5);
  text(c, t('Circuit + EM evaluation'), x + 12, y + 17, 11, palette.cyan, 'left');
  line(c, [[x + 14, y + h - 18], [x + w - 14, y + h - 18]], '#405365', 1);
  line(c, [[x + 14, y + h - 18], [x + 14, y + 32]], '#405365', 1);
  for (const [index, color] of [palette.violet, palette.cyan].entries()) {
    const values = Array.from({ length: 60 }, (_, i): Point => [x + 15 + i / 59 * (w - 32), y + 37 + index * 8 + Math.exp(-(((i / 59 - .57) / .2) ** 2)) * (19 - index * 9)]);
    line(c, values, color, 1.5, ease(43.5 + index * 1.5, 44.5 + index * 1.5, time));
  }
  if (portrait) {
    text(c, 'GENESIS', x + 2, y + h + 19, 11, palette.violet, 'left', 600);
    text(c, t(time < 48 ? 'Layout review' : 'Refine connection'), x + w, y + h + 19, 10, palette.muted, 'right');
  } else {
    text(c, 'GENESIS', 112, y + 25, 17, palette.violet, 'left', 550);
    text(c, t(time < 48 ? 'Layout review' : 'Refine connection'), 112, y + 52, 13, palette.muted, 'left');
    line(c, [[326, y + 40], [730, y + 40], [724, y + 36]], '#60798d', 1);
    if (time > 46) line(c, [[730, y + 62], [326, y + 62], [332, y + 66]], palette.violet, 1, ease(46, 47, time));
  }
  if (time > 46.5 && time < 51.5) line(c, connectionPath(3, portrait, time), palette.gold, 3, ease(46.5, 47, time));
  c.restore();
}

/** Draw in CSS pixels. Resolution is bounded by the player; no camera spin or perspective changes. */
export function renderCircuitFilm(c: Context, width: number, height: number, time: number, t: Translate = text => text) {
  c.clearRect(0, 0, width, height); c.fillStyle = '#07131f'; c.fillRect(0, 0, width, height);
  const light = c.createLinearGradient(0, 0, width, height);
  light.addColorStop(0, '#172b383f'); light.addColorStop(.6, '#15223500'); light.addColorStop(1, '#3028421c');
  c.fillStyle = light; c.fillRect(0, 0, width, height);
  const portrait = width < 650 && height > width;
  const top = portrait ? Math.max(205, height * .245) : height < 550 ? 143 : Math.max(235, height * .285);
  const bottom = portrait ? 112 : height < 550 ? 66 : 110;
  const state = receiverState(time);
  const worldW = portrait ? 360 : 1200, worldH = portrait ? 560 + 82 * state.evaluation : 465;
  const scale = Math.min((width - (portrait ? 24 : 65)) / worldW, Math.max(70, height - top - bottom) / worldH);
  const ox = (width - worldW * scale) / 2, oy = top + (height - top - bottom - worldH * scale) / 2;
  c.save(); c.translate(ox, oy); c.scale(scale, scale);
  c.fillStyle = '#46607428';
  for (let y = 0; y < worldH; y += 24) for (let x = 0; x < worldW; x += 24) c.fillRect(x, y, .9, .9);
  if (!portrait) {
    text(c, 'RX / 01', 24, 13, 11, palette.muted, 'left');
    text(c, t(state.physical ? 'Physical layout' : 'Schematic'), 1170, 13, 11, palette.muted, 'right');
    line(c, [[24, 36], [1170, 36]], '#3344546b', .7);
  }
  if (time >= 27.5 && time < 31.8) receiverBlocks.filter(block => block.kind !== 'contact').forEach(block => {
    const target = blockPose(block, portrait, 42);
    c.save(); c.globalAlpha *= 1 - ease(30.8, 31.8, time); c.setLineDash([3, 5]); c.strokeStyle = '#6c8a9c'; c.lineWidth = .7;
    c.strokeRect(target.x - 74 * target.scale, target.y - 57 * target.scale, 148 * target.scale, 114 * target.scale); c.restore();
  });
  routes(c, time, portrait);
  receiverBlocks.forEach(block => auxiliary(c, block, time, portrait, t));
  receiverBlocks.forEach(block => drawBlock(c, block, time, portrait, t));
  overview(c, time, portrait, t); jointPanel(c, time, portrait, t); evaluationPanel(c, time, portrait, t);
  if (!state.focus && !state.evaluation) {
    const status = time < 5 ? 'Receiver architecture' : time < 27.5 ? 'Schematic' : time < 31.5 ? 'Place components' : time < 42.5 ? 'Connect ports' : 'Selected design';
    if (portrait) {
      text(c, 'GENESIS', 178, 529, 10, palette.violet, 'left', 600); text(c, t(status), 178, 545, 9, palette.muted, 'left');
    } else {
      line(c, [[110, 353], [1090, 353]], '#3c526253', 1);
      text(c, 'GENESIS', 110, 383, 16, palette.violet, 'left', 550); text(c, t(status), 1090, 383, 13, palette.muted, 'right');
      text(c, t('Illustrative design sequence'), 110, 410, 11, '#748a9d', 'left');
    }
  }
  c.restore();
}
