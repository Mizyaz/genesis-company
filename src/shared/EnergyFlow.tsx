import { useEffect, useRef } from 'react';

type Palette = { cyan: string; violet: string; blue: string; surface: string; light: boolean };
type Point = [number, number];
const TAU = Math.PI * 2;
const cycleSeconds = 5.4;
const leftFeed: Point[] = [[250, 258], [250, 278], [264, 292], [282, 292]];
const rightFeed: Point[] = [[350, 258], [350, 278], [336, 292], [318, 292]];
const output: Point[] = [[300, 310], [300, 334]];

/** FUNCTIONS: drawEnergy paints fixed circuit geometry; only signals and selection move. */
function drawEnergy(ctx: CanvasRenderingContext2D, width: number, height: number, ratio: number, time: number, palette: Palette) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width * ratio, height * ratio);
  ctx.setTransform(width * ratio / 600, 0, 0, height * ratio / 440, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const cycle = time % cycleSeconds;

  function line(points: Point[], color: string, opacity = 1, thickness = 1) {
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = opacity; ctx.lineWidth = thickness;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke(); ctx.restore();
  }
  function glow(x: number, y: number, radius: number, color: string, opacity: number) {
    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient; ctx.globalAlpha = opacity;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
  }
  function terminal(x: number, y: number, color: string, opacity = .7) {
    ctx.save(); ctx.fillStyle = palette.surface; ctx.strokeStyle = color;
    ctx.globalAlpha = opacity; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, y, 2.8, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function pulse(points: Point[], progress: number, color: string) {
    if (progress < 0 || progress > 1) return;
    const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
    let remaining = progress * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i]) {
        const fraction = remaining / lengths[i];
        const [ax, ay] = points[i], [bx, by] = points[i + 1];
        const x = ax + (bx - ax) * fraction, y = ay + (by - ay) * fraction;
        const tail = Math.max(0, fraction - 14 / lengths[i]);
        line([[ax + (bx - ax) * tail, ay + (by - ay) * tail], [x, y]], color, 1, 2.5);
        glow(x, y, 10, color, .4);
        terminal(x, y, color, 1);
        return;
      }
      remaining -= lengths[i];
    }
  }

  // Stable, chamfered circuit regions, not deforming energy rings.
  [28, 330].forEach((x, i) => {
    const color = i ? palette.violet : palette.cyan;
    const frame: Point[] = [[x + 14, 36], [x + 228, 36], [x + 242, 50], [x + 242, 260],
      [x + 228, 274], [x + 14, 274], [x, 260], [x, 50], [x + 14, 36]];
    line(frame, color, palette.light ? .26 : .32);
    line([[x, 77], [x, 50], [x + 14, 36], [x + 46, 36]], color, .85, 1.5);
    line([[x + 196, 274], [x + 228, 274], [x + 242, 260], [x + 242, 231]], color, .85, 1.5);
    for (let column = 0; column < 8; column++) {
      for (let row = 0; row < 7; row++) {
        ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = .10;
        ctx.fillRect(x + 22 + column * 28, 53 + row * 29, 1, 1); ctx.restore();
      }
    }
  });

  // Three illustrative alternatives share one selection clock. No measured data.
  const selected = cycle >= 1.8;
  const active = selected ? 1 : Math.floor(cycle / .6);
  for (let row = 0; row < 3; row++) {
    const y = 82 + row * 46;
    const opacity = row === active ? 1 : selected ? .23 : .42;
    const color = row === active && selected ? palette.cyan : palette.violet;
    line([[361, y], [387, y]], color, opacity, 1.4);
    // A capacitor, tunable branch and its response make alternatives recognisable.
    line([[387, y - 9], [387, y + 9]], color, opacity, 1.8);
    line([[394, y - 9], [394, y + 9]], color, opacity, 1.8);
    line([[394, y], [414, y], [414, y + 11], [427, y + 11], [427, y - 11], [414, y - 11]], color, opacity, 1.4);
    line([[414, y - 15], [414, y + 15]], color, opacity, 1.4);
    line([[427, y - 11], [440, y - 11]], color, opacity, 1.4);
    terminal(361, y, color, opacity);
    line([[456, y - 16], [456, y + 17], [516, y + 17]], palette.blue, .18);
    const response: Point[] = [];
    for (let i = 0; i <= 28; i++) {
      const notch = Math.exp(-(((i - (12 + row * 2)) / (3.7 + row)) ** 2));
      response.push([458 + i * 2, y - 8 + notch * (14 + row * 4)]);
    }
    line(response, color, opacity, 1.6);
    if (row === active) {
      glow(530, y, 13, color, .17);
      if (selected) line([[526, y], [530, y + 4], [537, y - 5]], color, 1, 2);
      else terminal(531, y, color, 1);
    }
  }

  // RF knowledge and the chosen candidate converge, then charge GENESIS.
  line(leftFeed, palette.cyan, .55, 1.4);
  line(rightFeed, palette.violet, .55, 1.4);
  line(output, palette.cyan, .5, 1.4);
  pulse(leftFeed, (cycle - 1.8) / .75, palette.cyan);
  pulse(rightFeed, (cycle - 1.8) / .75, palette.violet);
  const charge = cycle > 2.45 && cycle < 3.25 ? Math.sin((cycle - 2.45) / .8 * Math.PI) ** 2 : 0;
  glow(300, 292, 24, palette.cyan, .08 + charge * .4);
  ctx.save(); ctx.fillStyle = palette.surface;
  ctx.beginPath(); ctx.arc(300, 292, 18, 0, TAU); ctx.fill(); ctx.restore();
  const junction: Point[] = [[300, 274], [318, 292], [300, 310], [282, 292], [300, 274]];
  line(junction, palette.cyan, .45 + charge * .5, 1.2);
  line([[292, 292], [308, 292]], palette.cyan, .85 + charge * .15, 1.7 + charge);
  line([[300, 284], [300, 300]], palette.cyan, .85 + charge * .15, 1.7 + charge);
  pulse(output, (cycle - 3.1) / .65, palette.cyan);
  const arrival = cycle > 3.5 && cycle < 4.5 ? Math.sin((cycle - 3.5) * Math.PI) ** 2 : 0;
  glow(300, 334, 26, palette.cyan, arrival * .45);
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
        blue: style.getPropertyValue('--flow-blue').trim(),
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
