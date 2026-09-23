import { useEffect, useRef } from 'react';

type Palette = { cyan: string; violet: string; blue: string; highlight: string; surface: string; light: boolean };
const TAU = Math.PI * 2;
const rings = [{ x: 180, y: 160, phase: 0, direction: 1 }, { x: 420, y: 160, phase: 2.1, direction: -1 }];

/** FUNCTIONS: ringPoint / drawEnergy render only flow geometry, never diagram text. */
function ringPoint(index: number, angle: number, time: number, ribbon = 0): [number, number] {
  const ring = rings[index];
  const phase = time * ring.direction + ring.phase;
  const radius = 132 + ribbon * 1.15
    + Math.sin(angle * 3 - phase * 1.1 + ribbon * .25) * 3.5
    + Math.sin(angle * 7 + phase * .8 + ribbon * .39) * 2.1
    + Math.cos(angle * 13 - phase * .45 + ribbon * .2) * .8;
  return [ring.x + Math.cos(angle) * radius, ring.y + Math.sin(angle) * radius];
}

function drawEnergy(ctx: CanvasRenderingContext2D, width: number, height: number, ratio: number, time: number, palette: Palette) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width * ratio, height * ratio);
  ctx.setTransform(width * ratio / 600, 0, 0, height * ratio / 440, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  function glow(x: number, y: number, radius: number, color: string, opacity: number) {
    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.globalAlpha = opacity;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
  function trace(index: number, offset: number, start = 0, length = TAU) {
    ctx.beginPath();
    const steps = Math.ceil(length / TAU * 150);
    for (let step = 0; step <= steps; step++) {
      const [x, y] = ringPoint(index, start + length * step / steps, time, offset);
      if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }

  for (let index = 0; index < rings.length; index++) {
    const { x, y, direction } = rings[index];
    const primary = index === 0 ? palette.cyan : palette.violet;
    const secondary = index === 0 ? palette.blue : palette.cyan;
    glow(x, y, 173, primary, palette.light ? .07 : .12);
    const gradient = ctx.createLinearGradient(x - 130, y - 125, x + 130, y + 125);
    gradient.addColorStop(0, primary); gradient.addColorStop(.45, primary); gradient.addColorStop(.78, secondary); gradient.addColorStop(1, primary);

    // Soft volumetric envelope; the individually moving filaments remain crisp.
    ctx.save(); ctx.strokeStyle = gradient;
    ctx.globalAlpha = palette.light ? .12 : .19;
    ctx.lineWidth = 11; ctx.shadowColor = primary; ctx.shadowBlur = 18;
    trace(index, 0); ctx.stroke(); ctx.restore();

    for (let ribbon = -5; ribbon <= 5; ribbon++) {
      ctx.save(); ctx.strokeStyle = gradient;
      ctx.globalAlpha = (ribbon % 3 === 0 ? .73 : .27) * (palette.light ? .95 : 1);
      ctx.lineWidth = ribbon === 0 ? 1.65 : .65;
      trace(index, ribbon); ctx.stroke(); ctx.restore();
    }
    // Travelling ribbons curve around each field, with opposing circulation.
    for (let trail = 0; trail < 4; trail++) {
      const head = time * .32 * direction + trail * TAU / 4 + index * .7;
      const bright = ctx.createLinearGradient(...ringPoint(index, head - .72, time), ...ringPoint(index, head, time));
      bright.addColorStop(0, 'transparent'); bright.addColorStop(.8, primary); bright.addColorStop(1, palette.highlight);
      ctx.save(); ctx.strokeStyle = bright; ctx.lineWidth = 2.5; ctx.globalAlpha = .9;
      ctx.shadowColor = primary; ctx.shadowBlur = 8;
      trace(index, Math.sin(time * .5 + trail) * 3, head - .72, .72); ctx.stroke(); ctx.restore();
    }
    for (let particle = 0; particle < 15; particle++) {
      const angle = time * (.17 + (particle % 3) * .045) * direction + particle * 2.399 + index;
      const [px, py] = ringPoint(index, angle, time, Math.sin(particle * 9.7) * 5.5);
      const size = particle % 5 === 0 ? 1.9 : .8;
      glow(px, py, size * 5, primary, .35);
      ctx.save(); ctx.globalAlpha = .5 + .35 * Math.sin(time + particle) ** 2;
      ctx.fillStyle = particle % 5 === 0 ? palette.highlight : primary;
      ctx.beginPath(); ctx.arc(px, py, size, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  // One clock: charge the +, release its light, then illuminate GENESIS.
  const cycle = time % 3.6;
  const charge = cycle < .9 ? Math.sin(cycle / .9 * Math.PI) ** 2 : 0;
  const arrival = cycle > 2.1 && cycle < 3 ? Math.sin((cycle - 2.1) / .9 * Math.PI) ** 2 : 0;
  glow(300, 160, 38 + charge * 22, palette.cyan, .16 + charge * .45);
  glow(305, 163, 26 + charge * 10, palette.violet, .13 + charge * .22);
  for (let strand = 0; strand < 6; strand++) {
    ctx.save();
    const gradient = ctx.createLinearGradient(290, 182, 310, 338);
    gradient.addColorStop(0, strand % 2 ? palette.violet : palette.cyan);
    gradient.addColorStop(.9, strand % 2 ? palette.cyan : palette.violet);
    gradient.addColorStop(1, 'transparent');
    ctx.strokeStyle = gradient; ctx.globalAlpha = strand % 2 ? .38 : .6;
    ctx.lineWidth = strand % 3 ? .85 : 1.4; ctx.beginPath();
    for (let step = 0; step <= 70; step++) {
      const fraction = step / 70;
      const envelope = Math.sin(fraction * Math.PI) * 8 + 1;
      const x = 300 + Math.sin(fraction * 10 - time * 1.8 + strand * TAU / 6) * envelope;
      const y = 185 + fraction * 151;
      if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }
  for (let particle = 0; particle < 5; particle++) {
    const fraction = (time * .18 + particle / 5) % 1;
    const x = 300 + Math.sin(fraction * 10 - time * 1.8) * (Math.sin(fraction * Math.PI) * 8 + 1);
    const y = 185 + fraction * 151;
    glow(x, y, 8, palette.cyan, .45);
    ctx.save(); ctx.fillStyle = palette.highlight; ctx.globalAlpha = Math.sin(fraction * Math.PI);
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); ctx.restore();
  }
  // Keep the junction and its travelling + in the same canvas/animation clock.
  ctx.save();
  ctx.fillStyle = palette.surface; ctx.globalAlpha = .88;
  ctx.beginPath(); ctx.arc(300, 160, 22, 0, TAU); ctx.fill();
  ctx.strokeStyle = palette.cyan; ctx.globalAlpha = .35 + charge * .6;
  ctx.lineWidth = 1 + charge; ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = palette.light ? palette.cyan : palette.highlight;
  ctx.lineWidth = 1.8 + charge * 1.5; ctx.shadowColor = palette.cyan; ctx.shadowBlur = 6 + charge * 24;
  const arm = 9 + charge * 2;
  ctx.beginPath(); ctx.moveTo(300 - arm, 160); ctx.lineTo(300 + arm, 160);
  ctx.moveTo(300, 160 - arm); ctx.lineTo(300, 160 + arm); ctx.stroke(); ctx.restore();

  if (cycle >= .8 && cycle <= 2.3) {
    const progress = (cycle - .8) / 1.5;
    const x = 300 + Math.sin(progress * TAU) * 4;
    const y = 160 + progress * 176;
    const tail = ctx.createLinearGradient(x, Math.max(160, y - 40), x, y);
    tail.addColorStop(0, 'transparent'); tail.addColorStop(1, palette.cyan);
    ctx.save(); ctx.strokeStyle = tail; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, Math.max(160, y - 40)); ctx.lineTo(x, y); ctx.stroke();
    glow(x, y, 19, palette.cyan, .6);
    ctx.strokeStyle = palette.light ? palette.cyan : palette.highlight;
    ctx.lineWidth = 2; ctx.shadowColor = palette.cyan; ctx.shadowBlur = 14;
    const size = 7 - progress * 3;
    ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke(); ctx.restore();
  }
  glow(300, 334, 32 + arrival * 30, palette.cyan, .12 + arrival * .5);
}

/** Transparent visual layer. The owner controls playback; visibility gates rendering. */
export function EnergyFlow({ paused }: { paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d', { alpha: true });
    if (!context) return;
    const ctx = context;
    let width = 0, height = 0, ratio = 1, frame = 0, visible = false, last = 0;
    let palette: Palette;
    function readPalette() {
      const style = getComputedStyle(element!);
      palette = {
        cyan: style.getPropertyValue('--flow-cyan').trim(), violet: style.getPropertyValue('--flow-violet').trim(),
        blue: style.getPropertyValue('--flow-blue').trim(), highlight: style.getPropertyValue('--flow-highlight').trim(),
        surface: style.getPropertyValue('--surface').trim(),
        light: document.documentElement.dataset.theme === 'light',
      };
    }
    function paint() { if (width && height) drawEnergy(ctx, width, height, ratio, elapsed.current, palette); }
    function tick(now: number) {
      frame = 0;
      if (!visible || document.hidden || paused || !width || !height) return;
      const delta = now - last;
      if (delta >= 1000 / 30) { elapsed.current += Math.min(delta, 70) / 1000; last = now; paint(); }
      frame = requestAnimationFrame(tick);
    }
    function restart() {
      cancelAnimationFrame(frame); frame = 0; last = performance.now();
      element!.dataset.motion = paused ? 'paused' : document.hidden ? 'hidden' : !visible || !width || !height ? 'offscreen' : 'playing';
      paint();
      if (visible && !document.hidden && !paused && width && height) frame = requestAnimationFrame(tick);
    }
    const resize = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width; height = bounds.height; ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      restart();
    });
    const appearance = new MutationObserver(() => { readPalette(); restart(); });
    const intersection = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRect.height > 0;
      if (inView && !visible) elapsed.current = 0;
      visible = inView; restart();
    }, { threshold: 0 });
    readPalette(); resize.observe(element); intersection.observe(element);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    document.addEventListener('visibilitychange', restart);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); appearance.disconnect(); document.removeEventListener('visibilitychange', restart); };
  }, [paused]);
  return <canvas className="design-loop-energy" ref={canvas} aria-hidden="true" />;
}
