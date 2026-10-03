/** Resolve the site's theme once per theme change, never once per animation frame. */
export type FilmPalette = {
  page: string; surface: string; raised: string; border: string; subtle: string;
  cyan: string; violet: string; gold: string; ink: string; muted: string;
  metal: string; edge: string; highlight: string;
};
export function readFilmPalette(element: Element): FilmPalette {
  const style = getComputedStyle(element);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    page: token('--page'), surface: token('--surface'), raised: token('--surface-raised'),
    border: token('--border'), subtle: token('--subtle'), cyan: token('--cyan'), violet: token('--violet'),
    ink: token('--text'), muted: token('--muted'), gold: token('--film-gold'),
    metal: token('--film-metal'), edge: token('--film-edge'), highlight: token('--film-highlight'),
  };
}
