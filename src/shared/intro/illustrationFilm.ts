/** A top-down 2D film with shared geometry, anchored connections and deterministic seeking. */
import type { CircuitFilm } from './frontEndFilm';
import type { FilmPalette } from './filmPalette';
import { illustrationPixels, illustrationState, type Point } from './illustrationScene';
import { ease } from './timeline';

// Adapted from Akilaa's public-domain symbol, scaled and recoloured for this film.
// https://commons.wikimedia.org/wiki/File:Inductor_symbol.svg
const coilSymbol = 'm16,112 h96 c0,-72 96,-72 96,0 0,-72 96,-72 96,0 0,-72 96,-72 96,0 h96';

export function createIllustrationFilm(canvas: HTMLCanvasElement, _labels: HTMLDivElement): CircuitFilm {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D is unavailable.');
  const ctx = context, symbol = new Path2D(coilSymbol);
  let palette: FilmPalette, ratio = 1, disposed = false, font = 'sans-serif';
  const saved = (alpha: number, draw: () => void) => { if (alpha <= .001) return; ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); draw(); ctx.restore(); };
  function line(points: readonly Point[], color: string, width = 2, progress = 1) {
    if (progress <= 0 || !points.length) return;
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    let remaining = lengths.reduce((a, b) => a + b, 0) * progress;
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i = 0; i < lengths.length; i++) {
      const f = Math.min(1, remaining / (lengths[i] || 1)), a = points[i], b = points[i + 1];
      ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
      remaining -= lengths[i]; if (remaining <= 0) break;
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function box(x: number, y: number, w: number, h: number, color: string, fill = false, radius = 0) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.lineWidth = 1;
    if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.stroke(); }
  }
  function dot(x: number, y: number, color: string, r = 3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function label(text: string, x: number, y: number, size = 13, color = palette.muted, align: CanvasTextAlign = 'center') {
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
  }
  function ground(x: number, y: number) {
    line([[x, y], [x, y + 9]], palette.subtle, 1.5);
    for (let i = 0; i < 3; i++) line([[x - 13 + i * 4, y + 9 + i * 6], [x + 13 - i * 4, y + 9 + i * 6]], palette.subtle, 1.5);
  }
  function inductance(x: number, y: number, w: number, vertical = false) {
    ctx.save(); ctx.translate(x, y); if (vertical) ctx.rotate(-Math.PI / 2);
    ctx.scale(w / 480, w / 480); ctx.translate(-256, -112);
    ctx.lineWidth = 2.5 * 480 / w; ctx.strokeStyle = palette.ink; ctx.stroke(symbol); ctx.restore();
  }
  function dimension(x: number, y: number, w: number, h: number, color: string) {
    saved(.35, () => { ctx.setLineDash([3, 5]); box(x - w / 2 - 11, y - h / 2 - 11, w + 22, h + 22, color); ctx.setLineDash([]); });
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) box(x + dx * (w / 2 + 11) - 2, y + dy * (h / 2 + 11) - 2, 4, 4, color, true);
    const yy = y + h / 2 + 27;
    line([[x - w / 2, yy], [x + w / 2, yy]], color, 1);
    for (const sign of [-1, 1]) line([[x + sign * (w / 2 - 5), yy - 3], [x + sign * w / 2, yy], [x + sign * (w / 2 - 5), yy + 3]], color, 1);
  }
  function transistor(state: ReturnType<typeof illustrationState>) {
    const { mos, blend, pins } = state, { x, y, width: w, height: h } = mos;
    saved(.08, () => box(x - w / 2 - 12, y - h / 2 - 12, w + 24, h + 24, palette.violet, true, 7));
    saved(.18, () => box(x - w / 2, y - h / 2, w, h, palette.cyan, true));
    const n = Math.max(mos.fingers, mos.previousFingers);
    for (let i = 0; i <= n; i++) {
      const exists = Number(i <= mos.previousFingers) * (1 - blend) + Number(i <= mos.fingers) * blend;
      const count = mos.previousFingers + (mos.fingers - mos.previousFingers) * blend;
      const xx = x - w / 2 + i * w / Math.max(1, count);
      saved(exists, () => {
        // Alternate diffusion stripes connect to drain and source on different buses.
        line([[xx, y - h / 2 + (i % 2 ? 7 : -4)], [xx, y + h / 2 + (i % 2 ? 17 : -7)]], palette.metal, 5);
        for (let j = 0; j < 5; j++) box(xx - 2, y - h / 2 + 11 + j * (h - 26) / 4, 4, 4, palette.ink, true);
      });
      if (i < n) saved(exists, () => line([[xx + w / Math.max(1, count) / 2, y - h / 2 - 20], [xx + w / Math.max(1, count) / 2, y + h / 2 + 10]], palette.violet, 4));
    }
    line([[x - w / 2, y - h / 2 - 20], [x + w / 2, y - h / 2 - 20]], palette.violet, 6);
    line([pins.gate, [pins.gate[0], y - h / 2 - 20], [x - w / 2, y - h / 2 - 20]], palette.violet, 3);
    line([[x - w / 2, y - h / 2 - 4], [x + w / 2, y - h / 2 - 4], [pins.drain[0], y - h / 2 - 4], pins.drain], palette.metal, 5);
    line([[x - w / 2, y + h / 2 + 17], [x + w / 2, y + h / 2 + 17]], palette.metal, 6);
    line([[x, y + h / 2 + 17], pins.source], palette.metal, 5);
  }
  function spiral(state: ReturnType<typeof illustrationState>) {
    const { coil, pins } = state, { x, y, size, width, spacing } = coil;
    const points: Point[] = [];
    for (let i = 0; i <= 23; i++) {
      const angle = Math.PI + i * Math.PI / 4, r = size / 2 - i * spacing / 8;
      points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
    }
    saved(.09, () => box(x - size / 2 - 8, y - size / 2 - 8, size + 16, size + 16, palette.gold, true, 5));
    // Separate underpass layer, visible under the spiral instead of a fake floating terminal.
    const end = points[points.length - 1];
    saved(.6, () => line([end, [end[0], y], pins.coilOut], palette.metal, width * .7));
    line([pins.coilIn, ...points], palette.gold, width);
    box(end[0] - 3, end[1] - 3, 6, 6, palette.ink, true);
  }
  function pixels(state: ReturnType<typeof illustrationState>) {
    const { pixel, before, index, blend } = state, { x, y, width: w, height: h } = pixel;
    const a = illustrationPixels[before], b = illustrationPixels[index], cw = w / b.columns, ch = h / b.rows;
    saved(.08, () => box(x - w / 2 - 12, y - h / 2 - 12, w + 24, h + 24, palette.cyan, true, 5));
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.columns; c++) {
      const was = Number(a.metal[r][c]), now = Number(b.metal[r][c]), alpha = was + (now - was) * blend;
      if (alpha <= .001) continue;
      const changed = was !== now && blend > .03 && blend < .97;
      saved(alpha, () => box(x - w / 2 + c * cw, y - h / 2 + r * ch, cw + .1, ch + .1, changed ? palette.gold : palette.cyan, true));
    }
    for (let i = 0; i < 15; i++) for (const sign of [-1, 1]) {
      saved(.6, () => dot(x - w / 2 + i * w / 14, y + sign * (h / 2 + 8), palette.subtle, 1.3));
    }
  }
  function capacitor(state: ReturnType<typeof illustrationState>) {
    const { cap, pins } = state, { x, y, width: w, height: h } = cap;
    saved(.12, () => box(x - w / 2 - 5, y - h / 2 - 5, w + 10, h + 10, palette.gold, true));
    for (let i = 0; i < 9; i++) {
      const yy = y - h / 2 + (i + .5) * h / 9;
      line([[x - w / 2 + (i % 2 ? 12 : 0), yy], [x + w / 2 - (i % 2 ? 0 : 12), yy]], i % 2 ? palette.metal : palette.gold, 3);
    }
    line([[x - w / 2, y + h / 2], [x - w / 2, y - h / 2], [x, y - h / 2], pins.capIn], palette.gold, 4);
    line([[x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x, y + h / 2], pins.capOut], palette.metal, 4);
  }
  function schematic(state: ReturnType<typeof illustrationState>, time: number) {
    const { pixel, mos, coil, cap, pins } = state;
    saved(ease(3.3, 4, time), () => {
      box(pixel.x - 46, pixel.y - 32, 92, 64, palette.cyan, false, 3);
      inductance(pixel.x, pixel.y, 64);
      label('N1', pixel.x, pixel.y - 48, 14);
    });
    saved(ease(4, 4.7, time), () => {
      line([pins.gate, [mos.x - 12, mos.y]], palette.violet, 2.5);
      line([[mos.x - 12, mos.y - 30], [mos.x - 12, mos.y + 30]], palette.violet, 3);
      for (let i = 0; i < 3; i++) line([[mos.x, mos.y - 30 + i * 23], [mos.x, mos.y - 16 + i * 23]], palette.ink, 2.5);
      line([[mos.x, mos.y - 23], [pins.drain[0], mos.y - 23], pins.drain], palette.ink, 2.5);
      line([[mos.x, mos.y + 23], [pins.source[0], mos.y + 23], pins.source], palette.ink, 2.5);
      line([[mos.x + 11, mos.y + 18], [mos.x + 19, mos.y + 23], [mos.x + 11, mos.y + 28]], palette.ink, 1.5);
      label('M1', mos.x - 4, mos.y - 50, 14);
    });
    saved(ease(4.6, 5.2, time), () => { inductance(coil.x, coil.y, 110); label('L1', coil.x, coil.y - 40, 14); });
    saved(ease(5, 5.7, time), () => {
      line([pins.capIn, [cap.x, cap.y - 7]], palette.ink, 2);
      line([[cap.x - 23, cap.y - 7], [cap.x + 23, cap.y - 7]], palette.ink, 3);
      line([[cap.x - 23, cap.y + 7], [cap.x + 23, cap.y + 7]], palette.ink, 3);
      line([[cap.x, cap.y + 7], pins.capOut], palette.ink, 2);
      label('C1', cap.x + 42, cap.y + 5, 14);
    });
  }
  return {
    resize(width, height, density) { ratio = density; canvas.width = Math.round(width * density); canvas.height = Math.round(height * density); },
    theme(next) { palette = next; font = getComputedStyle(canvas).getPropertyValue('--font-sans') || 'sans-serif'; },
    render(time, translate) {
      if (disposed || !palette) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.fillStyle = palette.page; ctx.fillRect(0, 0, 1280, 720);
      const state = illustrationState(time), visible = ease(3, 3.5, time) * (1 - ease(25.7, 27, time));
      saved(visible, () => {
        // Quiet drafting marks, not another frame or a card around each device.
        saved(.2, () => { for (let x = 64; x < 1240; x += 32) for (let y = 96; y < 568; y += 32) dot(x, y, palette.border, .7); });
        saved(1 - state.physical, () => label(translate('Schematic'), 74, 98, 14, palette.muted, 'left'));
        saved(state.physical, () => label(translate('Physical geometry'), 74, 98, 14, palette.muted, 'left'));
        ctx.translate(640, 335); ctx.scale(state.zoom, state.zoom); ctx.translate(-state.focusX, -335);
        for (const wire of state.wires) line(wire.points, palette.subtle, 1.8 + state.physical, ease(wire.start, wire.start + .7, time));
        saved(ease(5.8, 6.4, time), () => {
          // Bias connections remain separate from the RF path.
          line([[410, 217], [405, 211], [415, 203], [405, 195], [415, 187], [410, 181], [410, 146]], palette.subtle, 1.6);
          inductance(722, 188, 58, true); line([[722, 159], [722, 146]], palette.subtle, 1.6);
          label('Vg', 410, 131, 14); label('VDD', 722, 131, 14);
          ground(state.pins.source[0], 530); ground(state.cap.x, 530);
          for (const p of [state.pins.input, state.pins.output]) { dot(...p, palette.ink, 5); dot(...p, palette.page, 2.5); }
          for (const p of [[410, 326], [722, 294], [state.cap.x, 294]] as Point[]) dot(...p, palette.subtle, 3);
        });
        saved(1 - state.physical, () => schematic(state, time));
        saved(state.physical, () => { pixels(state); transistor(state); spiral(state); capacitor(state); });
        saved(state.guides * .7, () => {
          dimension(state.pixel.x, state.pixel.y, state.pixel.width, state.pixel.height, palette.cyan);
          dimension(state.mos.x, state.mos.y, state.mos.width, state.mos.height + 40, palette.violet);
          dimension(state.coil.x, state.coil.y, state.coil.size, state.coil.size, palette.gold);
        });
        saved(state.physical * .82, () => {
          label(translate('Pixelated matching network'), state.pixel.x, state.pixel.y + state.pixel.height / 2 + 58, 12);
          label(translate('Transistor array'), state.mos.x + 18, state.mos.y + state.mos.height / 2 + 70, 12, palette.muted, 'left');
          label(translate('Spiral inductor'), state.coil.x, state.coil.y + state.coil.size / 2 + 58, 12);
        });
        // Small travelling traces follow the actual wire bends, rather than decorative waves.
        if (time > 9) for (const wire of state.wires.filter(wire => wire.signal)) {
          const a = wire.points[0], b = wire.points[wire.points.length - 1], p = (time * .75) % 1;
          saved(.65, () => dot(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, palette.cyan, 2.7));
        }
      });
      canvas.dataset.time = time.toFixed(2); canvas.dataset.renderer = 'canvas2d';
      canvas.dataset.candidate = String(state.index); canvas.dataset.fingers = String(state.mos.fingers);
      canvas.dataset.coilSize = state.coil.size.toFixed(2); canvas.dataset.pixelWidth = state.pixel.width.toFixed(2);
    },
    dispose() { disposed = true; ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.width = 1; canvas.height = 1; },
  };
}
