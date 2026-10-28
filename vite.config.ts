import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import brand from './src/content/brand.json';
import design from './src/content/design.json';
import film from './src/content/film.json';
import { markSvg } from './src/shared/markSvg';

/** The brand colours of src/content/brand.json become the --brand-1..4 CSS variables of each theme, and the favicon is
 * the GENESIS mark drawn in them: change brand.json and the site, the mark and the tab icon follow. The film's design
 * (src/content/design.json) becomes the --story-* colours and the --ease-* and --dur-* motion of the site, so the site
 * and the film share one palette and one motion. */
function brandColors(): Plugin {
  const vars = (c: typeof brand.dark) => Object.values(c).map((value, i) => `--brand-${i + 1}: ${value};`).join(' ');
  const { story, motion } = design, seconds = (frames: number) => `${Math.round(frames / motion.fps * 1000)}ms`;
  const shared = Object.entries(story).map(([name, value]) => `--story-${name}: ${value};`).join(' ')
    + ` --ease-out: cubic-bezier(${motion.out.join(', ')}); --ease-in-out: cubic-bezier(${motion.inOut.join(', ')});`
    + ` --dur-transition: ${seconds(motion.transition)}; --dur-enter: ${seconds(motion.enter)}; --dur-stagger: ${seconds(motion.stagger)};`;
  // The film's scenes and the layout pictures (painted from layout_paint.json) on the light page take the light film
  // tokens (src/content/film.json, shared with the app).
  const lightStage = Object.entries(film.tokens).map(([name, value]) => `--film-${name}: ${value.light};`).join(' ');
  const css = `:root { ${shared} ${vars(brand.dark)} } :root[data-theme="light"] { ${vars(brand.light)} } :root[data-theme="light"] :is(.story-stage-box, .pv-layout) { ${lightStage} }`
    // The first paint, before the script sets data-theme, follows the system.
    + ` @media (prefers-color-scheme: light) { :root:not([data-theme]) { ${vars(brand.light)} } }`;
  const icon = `data:image/svg+xml,${encodeURIComponent(markSvg(brand.dark))}`;
  return { name: 'genesis-brand-colors', transformIndexHtml: () => [
    { tag: 'style', attrs: { id: 'brand-colors' }, children: css, injectTo: 'head-prepend' },
    { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: icon }, injectTo: 'head' },
  ] };
}

export default defineConfig({ plugins: [react(), brandColors()], base: './', build: { chunkSizeWarningLimit: 700 } });
