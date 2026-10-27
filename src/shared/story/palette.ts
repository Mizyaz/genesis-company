import filmTokens from '../../content/film.json';

const tokens = filmTokens.tokens;

/** A film token (src/content/film.json, the design library's film tokens, shared with the app): var(--film-<token>)
 * with its dark value as fallback. vite.config.ts sets the light values on the site's light stage; the film defines
 * none, so it renders in the dark values. */
export const film = (token: keyof typeof tokens) => `var(--film-${token}, ${tokens[token].dark})`;

/** The four brand colours: brand 1 marks the active parts, brand 3 the passive devices. */
export const B = { brand1: film('active'), brand2: film('brand2'), brand3: film('passive'), brand4: film('brand4') };
/** The film's surfaces and text, with the brand's cyan and violet. */
export const C = {
  page: film('page'), surface: film('surface'), card: film('raised'), die: film('die'),
  border: film('border'), grid: film('grid'), text: film('text'), muted: film('muted'), dc: film('dc'),
  cyan: film('active'), violet: film('passive'),
};
/** The scenes' other colours, by what they show. */
export const P = {
  plotGrid: film('plot-grid'), dim: film('dim'), active: film('active-fill'),
  green: film('pass'), pink: film('limit'), miss: film('limit'),
  ink: film('ink'), soft: film('soft'), faint: film('faint'), glow: film('glow'),
  gold: film('gold'), rose: film('rose'), sky: film('sky'), lilac: film('lilac'),
  yellow: film('yellow'), lime: film('lime'), orange: film('orange'),
};
export const GRADIENT = `linear-gradient(105deg, ${B.brand1} 10%, ${B.brand2} 47%, ${B.brand3} 92%)`;

/** `a` blended towards `b` by t (0..1), for any CSS colour. */
export const mix = (a: string, b: string, t: number) => `color-mix(in srgb, ${a} ${(100 - t * 100).toFixed(2)}%, ${b})`;
/** A colour at opacity `o` (0..1), for any CSS colour. */
export const alpha = (colour: string, o: number) => `color-mix(in srgb, ${colour} ${(o * 100).toFixed(2)}%, transparent)`;
