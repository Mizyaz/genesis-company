import { mark, type BrandColors } from './markGeometry';

/** The mark at rest as SVG markup, filled with the gradient `gradient` (an id defined by the caller). */
export function vectorMarkup(gradient: string) {
  const fill = `url(#${gradient})`, { die } = mark.chip;
  return `<g fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round">`
    + mark.traces.map(t => `<path d="${t.d}" stroke-width="${t.width}"/>`).join('')
    + `<path d="${mark.chip.frame}" stroke-width="${mark.chip.stroke}"/>`
    + mark.chip.pins.map(d => `<path d="${d}" stroke-width="${mark.chip.stroke}"/>`).join('')
    + `</g><g fill="${fill}">` + mark.nodes.map(n => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}"/>`).join('')
    + `<rect x="${die.x}" y="${die.y}" width="${die.w}" height="${die.h}" rx="${die.rx}" opacity=".8"/></g>`;
}

/** The left-to-right brand gradient: brand1 over the nodes, brand2 on the traces, brand3 on the chip. */
export function gradientMarkup(id: string, c: BrandColors) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${mark.x + 60}" y1="0" x2="${mark.x + mark.width}" y2="0">`
    + `<stop offset="0" style="stop-color:${c.brand1}"/><stop offset=".2" style="stop-color:${c.brand1}"/><stop offset=".6" style="stop-color:${c.brand2}"/><stop offset="1" style="stop-color:${c.brand3}"/></linearGradient>`;
}

/** A standalone square SVG of the mark (the favicon). */
export function markSvg(c: BrandColors) {
  const side = mark.width, y = mark.y + mark.height / 2 - side / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.x} ${y} ${side} ${side}"><defs>${gradientMarkup('g', c)}</defs>${vectorMarkup('g')}</svg>`;
}
