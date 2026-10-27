import type { ReactNode } from 'react';
import { out, STAGGER } from './motion';
import { B, C, P } from './palette';
import { kindOf, type Kind } from './kind';
import { coilGlyphs, type CoilSample } from './coil';

export { kindOf, type Kind };

// The chip's blocks as one symbolic floorplan: each block is a card at its place on the die, pads included, with one
// glyph per member in the members' own row and column order from the layout. Blocks whose members sit interleaved in
// one place share a card. Each card carries one name and no member or pin labels. One RF wire joins two cards for each
// RF line of the interconnect record and one DC wire joins two cards that share DC nets; wires run under the cards.
// Cards keep their floorplan order but not their size, so cards are spread apart until none overlap.
export type Box = [number, number, number, number];
type Pin = { block: string; member: string; terminal: string; net: string; box: Box };
export type BlockLinks = { rf: { line: string; blocks: string[]; nets: string[] }[]; dc: { net: string; blocks: string[] }[]; pins: Pin[] };
type Member = { block: string; member: string; cell: string; box: Box };
type Layout = { die: Box; blocks: { name: string; box: Box }[]; members: Member[]; shapes?: Record<string, Pick<CoilSample, 'layers' | 'bbox'>> };
const RF = B.brand1, DC = C.dc, GAP = 16, LABEL = 30, TITLE = 22, FILL = .88;
// Glyph cell (width, height) by kind: transistors leave room for their pin wires, resistors stand tall.
const CELL: Record<Kind, [number, number]> = { pad: [48, 48], rfpad: [48, 48], resistor: [40, 50], inductor: [84, 72], pixelated: [84, 72], transistor: [90, 56] };
// A print draws a transistor in a square cell, as tall as the glyph, so it fills the card beside the names.
const SQUARE: [number, number] = [90, 90];
const mid = (b: Box) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as const;
const inside = ([x, y]: readonly [number, number], b: Box) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

export function Glyph({ kind, x, y, s, colour, vertical }: { kind: Kind; x: number; y: number; s: number; colour: string; vertical: boolean }) {
  const p = { fill: 'none', stroke: colour, strokeWidth: Math.max(2.4, s * .05), strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'pad') return <g><rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * .08} {...p} /><rect x={x - s / 4} y={y - s / 4} width={s / 2} height={s / 2} fill={colour} fillOpacity={.35} /></g>;
  // An RF pad is ground, signal, ground along the die edge; the signal pad is filled.
  if (kind === 'rfpad') return <g transform={vertical ? undefined : `rotate(90 ${x} ${y})`}>{[-1, 0, 1].map(i =>
    <rect key={i} x={x - s * .32} y={y + i * s * .34 - s * .14} width={s * .64} height={s * .28} rx={s * .04} {...p} fill={i ? 'none' : colour} fillOpacity={i ? 0 : .55} />)}</g>;
  if (kind === 'resistor') return <path transform={vertical ? `rotate(90 ${x} ${y})` : undefined}
    d={`M${x - s / 2} ${y}h${s * .14}` + [0, 1, 2, 3, 4, 5].map(i => `l${s * .12} ${i % 2 ? s * .2 : -s * .2}`).join('') + `L${x + s / 2} ${y}`} {...p} />;
  if (kind === 'inductor' || kind === 'pixelated') {
    // A half turn from one port to the other, as the chip's passives run between pins on opposite sides.
    const pts = [[-.5, .16], [-.34, .16], [-.34, -.08], [-.17, -.3], [.17, -.3], [.34, -.08], [.34, .16], [.5, .16]];
    return <path transform={vertical ? `rotate(90 ${x} ${y})` : undefined} d={pts.map(([u, v], i) => `${i ? 'L' : 'M'}${x + u * s} ${y + v * s}`).join('')} {...p} strokeWidth={Math.max(4, s * .1)} />;
  }
  return <g {...p}><path d={`M${x - s / 2} ${y}h${s * .3}M${x - s * .2} ${y - s * .3}v${s * .6}M${x - s * .06} ${y - s * .4}v${s * .8}`} />
    <path d={`M${x - s * .06} ${y - s * .28}h${s * .28}v${-s * .22}M${x - s * .06} ${y + s * .28}h${s * .28}v${s * .22}M${x - s * .06} ${y}h${s * .5}`} /></g>;
}

/** Positions sorted into bands: a new band starts where the gap to the last one is over half a member. */
function bands(values: number[], size: number) {
  const sorted = [...new Set(values)].sort((a, b) => a - b), band = new Map<number, number>();
  let n = -1, last = -Infinity;
  for (const v of sorted) { if (v - last > size / 2) n++; band.set(v, n); last = v; }
  return { of: (v: number) => band.get(v) ?? 0, count: n + 1 };
}

const NOUN: Record<Kind, [string, string]> = { pad: ['DC pad', 'DC pads'], rfpad: ['RF pad', 'RF pads'], resistor: ['resistor', 'resistors'], inductor: ['inductor', 'inductors'], pixelated: ['pixelated passive device', 'pixelated passive devices'], transistor: ['transistor', 'transistors'] };
const WORD: Record<string, string> = { rf: 'RF', dc: 'DC', fets: 'FETs', fet: 'FET', gnd: 'GND' };
/** "M1–M4" for members named by one prefix and consecutive numbers, else nothing. */
function span(names: string[]) {
  const m = names.map(n => /^([A-Za-z]+)(\d+)$/.exec(n));
  if (names.length < 2 || m.some(x => !x) || new Set(m.map(x => x![1])).size > 1) return '';
  const n = m.map(x => +x![2]).sort((a, b) => a - b), p = m[0]![1];
  return n[n.length - 1] - n[0] === n.length - 1 ? `${p}${n[0]}–${p}${n[n.length - 1]}` : '';
}
/** A card's name from its block names and members: "input_l1" holding inductor L1 reads "Input inductor L1", a block of
 * numbered members gets their span ("Switch FETs M1–M4"), and blocks sharing a card are named by their common words
 * and their members' kind ("Bias resistors"). */
export function cardTitle(blocks: string[], members: { member: string; cell: string }[]) {
  const kinds = [...new Set(members.map(m => kindOf(m.cell)))], names = members.map(m => m.member.replace(/^PAD_/, ''));
  const words = blocks.map(b => b.toLowerCase().split('_'));
  let title: string;
  if (blocks.length === 1) {
    const w = words[0];
    if (members.length === 1 && kinds.length === 1 && names[0].toLowerCase() === w[w.length - 1]) title = [...w.slice(0, -1).map(x => WORD[x] ?? x), NOUN[kinds[0]][0], names[0]].join(' ');
    else title = [...w.map(x => WORD[x] ?? x), span(names)].filter(Boolean).join(' ');
  } else {
    const common = words[0].filter(x => x !== 'and' && words.every(w => w.includes(x)));
    title = [...common.map(x => WORD[x] ?? x), kinds.length === 1 ? NOUN[kinds[0]][1] : 'blocks'].join(' ');
  }
  return title[0].toUpperCase() + title.slice(1);
}

type Card = { id: string; title: string; lines: string[]; blocks: string[]; cx: number; cy: number; rx: number; ry: number; w: number; h: number; glyphs: { m: Member; x: number; y: number; s: number; vertical: boolean }[] };

/** Cards in screen pixels with their glyph places. A card of resistors shows one resistor. With links, the cards each
 * link joins line up on the link's axis (a row or a column), so every wire is one straight line. */
function arrange(layout: Layout, x0: number, y0: number, w: number, h: number, links?: BlockLinks, text = TITLE) {
  // A card fits its title: the site's font is narrow; a print may fall back to a wide one (DejaVu Sans Bold, .62 em a
  // letter in these names).
  // A print's larger names part the cards only as far as they need: its cards may leave the view.
  const t = text / TITLE, char = text === TITLE ? 11.5 : .62 * text;
  const [dx0, dy0, dx1, dy1] = layout.die, k = Math.min(w / (dx1 - dx0), h / (dy1 - dy0));
  const ox = x0 + (w - (dx1 - dx0) * k) / 2, oy = y0 + (h - (dy1 - dy0) * k) / 2;
  // Blocks share a card when a member of one sits inside the other's box.
  const group = new Map(layout.blocks.map(b => [b.name, b.name]));
  const root = (b: string): string => group.get(b) === b ? b : root(group.get(b)!);
  for (const a of layout.blocks) for (const b of layout.blocks)
    if (a !== b && root(a.name) !== root(b.name) && layout.members.some(m => m.block === a.name && inside(mid(m.box), b.box))) group.set(root(a.name), root(b.name));
  const ids = [...new Set(layout.blocks.map(b => root(b.name)))];
  const cards: Card[] = ids.map(id => {
    const blocks = layout.blocks.filter(b => root(b.name) === id), all = layout.members.filter(m => blocks.some(b => b.name === m.block));
    const members = all.length > 1 && all.every(m => kindOf(m.cell) === 'resistor') ? all.slice(0, 1) : all;
    const box: Box = [Math.min(...blocks.map(b => b.box[0])), Math.min(...blocks.map(b => b.box[1])), Math.max(...blocks.map(b => b.box[2])), Math.max(...blocks.map(b => b.box[3]))];
    const size = Math.min(...members.map(m => Math.min(m.box[2] - m.box[0], m.box[3] - m.box[1])));
    const cols = bands(members.map(m => mid(m.box)[0]), size), rows = bands(members.map(m => -mid(m.box)[1]), size);
    const pad = members.every(m => /pad/.test(kindOf(m.cell)));
    // Pads keep a share of their real size; every other card is a grid of glyph cells.
    const cell = (i: 0 | 1) => Math.max(...members.map(m => (t !== 1 && kindOf(m.cell) === 'transistor' ? SQUARE : CELL[kindOf(m.cell)])[i])), names = 0, title = cardTitle(blocks.map(b => b.name), all.map(m => kindOf(m.cell) === 'pixelated' && !layout.shapes?.[m.member] ? { ...m, cell: 'inductor' } : m));
    // Pad cells are squares, a share of the pad's real size.
    const padCell = Math.max(cell(0), Math.min((box[2] - box[0]) * k * .4 / cols.count, (box[3] - box[1]) * k * .25 / rows.count));
    // A long name breaks before its last word ("Output inductor" over "L2"); a longer one wraps at 17 characters a line
    // ("Output pixelated" over "passive device L2").
    const words = title.split(" "), broken = words.length > 2 && title.length > 14 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [title];
    // A print wraps names short: the row of cards is as wide as its names.
    const wrap = text === TITLE ? 17 : 9, greedy = () => words.reduce<string[]>((l, w) => { const last = l[l.length - 1]; if (last && last.length + 1 + w.length <= wrap) l[l.length - 1] = `${last} ${w}`; else l.push(w); return l; }, []);
    const lines = text === TITLE && broken[0].length <= wrap ? broken : greedy();
    // A print grows the glyphs with its names, as far as the names are wide, so they fill the card and the row keeps
    // its width.
    const named = Math.max(...lines.map(l => l.length)) * char + 28, base = pad ? padCell : cell(0);
    const grow = t === 1 ? 1 : Math.max(1, Math.min(t, (named - 16) / (cols.count * base)));
    const cw = base * grow, ch = (pad ? padCell : cell(1)) * grow;
    const cardW = Math.max(cols.count * cw + 16, named), cardH = rows.count * (ch + names) + LABEL * t * lines.length + 10;
    const rx = ox + ((box[0] + box[2]) / 2 - dx0) * k, ry = oy + (dy1 - (box[1] + box[3]) / 2) * k;
    const card: Card = { id, title, lines, blocks: blocks.map(b => b.name), cx: rx, cy: ry, rx, ry, w: cardW, h: cardH, glyphs: [] };
    const left = (cardW - cols.count * cw) / 2;
    card.glyphs = members.map(m => ({ m, x: (cols.of(mid(m.box)[0]) + .5) * cw + left - cardW / 2, y: rows.of(-mid(m.box)[1]) * (ch + names) + ch / 2 + 8 - cardH / 2,
      s: Math.min(cw, ch) * FILL * (t === 1 && kindOf(m.cell) === 'transistor' ? .8 : 1), vertical: m.box[3] - m.box[1] > m.box[2] - m.box[0] }));
    return card;
  });
  // Rows and columns of linked cards: each link joins its two cards on the axis they are further apart on.
  const cardOf = (block: string) => cards.find(c => c.blocks.includes(block));
  const pairs = links ? [...links.rf.map(r => r.blocks), ...links.dc.map(n => n.blocks)].flatMap(bs => bs.slice(1).map(b => [cardOf(bs[0]), cardOf(b)])).filter((p): p is [Card, Card] => !!p[0] && !!p[1] && p[0] !== p[1]) : [];
  const rowOf = new Map(cards.map(c => [c, c])), colOf = new Map(cards.map(c => [c, c]));
  const find = (m: Map<Card, Card>, c: Card): Card => m.get(c) === c ? c : find(m, m.get(c)!);
  for (const [a, b] of pairs) { const m = Math.abs(a.rx - b.rx) / (a.w + b.w) >= Math.abs(a.ry - b.ry) / (a.h + b.h) ? rowOf : colOf; m.set(find(m, a), find(m, b)); }
  const line = () => { for (const [m, key] of [[rowOf, 'cy'], [colOf, 'cx']] as const) for (const g of new Set(cards.map(c => find(m, c)))) {
    const members = cards.filter(c => find(m, c) === g); if (members.length < 2) continue;
    const v = members.reduce((s, c) => s + c[key], 0) / members.length; for (const c of members) c[key] = v; } };
  for (let pass = 0; pass < 300; pass++) {
    let moved = false;
    line();
    for (const a of cards) for (const b of cards) {
      if (a === b) continue;
      const ox2 = (a.w + b.w) / 2 + GAP - Math.abs(a.cx - b.cx), oy2 = (a.h + b.h) / 2 + GAP - Math.abs(a.cy - b.cy);
      if (ox2 <= 0 || oy2 <= 0) continue;
      moved = true;
      // Push apart along the axis on which the two blocks are further apart on the die, keeping which one is left
      // or above; a tie goes in list order.
      const side = (r: number) => r < 0 || (r === 0 && cards.indexOf(a) < cards.indexOf(b)) ? -1 : 1;
      // Cards in one row part along it, cards in one column down it.
      const across = find(rowOf, a) === find(rowOf, b) ? true : find(colOf, a) === find(colOf, b) ? false : Math.abs(a.rx - b.rx) / (a.w + b.w) > Math.abs(a.ry - b.ry) / (a.h + b.h);
      if (across) { const s = side(a.rx - b.rx) * ox2 / 2; a.cx += s; b.cx -= s; }
      else { const s = side(a.ry - b.ry) * oy2 / 2; a.cy += s; b.cy -= s; }
    }
    // Cards stay in the view.
    if (t === 1) for (const c of cards) { c.cx = Math.min(Math.max(c.cx, x0 + c.w / 2 + 4), x0 + w - c.w / 2 - 4); c.cy = Math.min(Math.max(c.cy, y0 + c.h / 2 + 4), y0 + h - c.h / 2 - 4); }
    if (!moved) break;
  }
  // A print's die hugs the cards, so a crop to the drawing is as tight as the cards.
  if (t !== 1) { const x = Math.min(...cards.map(c => c.cx - c.w / 2)) - GAP, y = Math.min(...cards.map(c => c.cy - c.h / 2)) - GAP;
    return { cards, die: { x, y, w: Math.max(...cards.map(c => c.cx + c.w / 2)) + GAP - x, h: Math.max(...cards.map(c => c.cy + c.h / 2)) + GAP - y } }; }
  return { cards, die: { x: ox, y: oy, w: (dx1 - dx0) * k, h: (dy1 - dy0) * k } };
}

type End = { x: number; y: number; card: Card };

/** A wire between two card points: one straight line (the cards are lined up on it), under the cards. */
const wire = (a: End, b: End) => `M${a.x} ${a.y}L${b.x} ${b.y}`;

/** Each card's box on screen with its blocks and title. */
export function cardBoxes(layout: Layout, x: number, y: number, w: number, h: number, links?: BlockLinks) {
  return arrange(layout, x, y, w, h, links).cards.map(c => ({ blocks: c.blocks, title: c.title, x: c.cx - c.w / 2, y: c.cy - c.h / 2, w: c.w, h: c.h, glyphs: c.glyphs.map(g => ({ member: g.m.member, kind: kindOf(g.m.cell), x: c.cx + g.x, y: c.cy + g.y, s: g.s, vertical: g.vertical })) }));
}

/** Each block's card centre on screen, for a view that moves the blocks on from the cards. */
export function blockCentres(layout: Layout, x: number, y: number, w: number, h: number, links?: BlockLinks) {
  return new Map(arrange(layout, x, y, w, h, links).cards.flatMap(c => c.blocks.map(b => [b, [c.cx, c.cy] as const])));
}

/** A ground symbol hanging from (x, y). */
const Ground = ({ x, y, colour, up = false }: { x: number; y: number; colour: string; up?: boolean }) => { const d = up ? -1 : 1;
  return <path d={`M${x} ${y}v${12 * d}M${x - 16} ${y + 12 * d}h32M${x - 10} ${y + 19 * d}h20M${x - 4} ${y + 26 * d}h8`} stroke={colour} strokeWidth={2.4} fill="none" strokeLinecap="round" />; };

/** The testbench around the chip, appearing by k: an S-parameter port on every RF pad and a DC source on every DC pad,
 * each out past the die edge nearest its pad (the ground pad goes straight to ground). Ports are numbered in pad order.
 * `t` scales the names and port circles; a DC name that would touch its left neighbour's moves one line out. */
function Bench({ cards, die, k, t }: { cards: Card[]; die: { x: number; y: number; w: number; h: number }; k: number; t: number }) {
  const glyphs = cards.flatMap(c => c.glyphs.map(g => ({ c, g, kind: kindOf(g.m.cell) })));
  const rf = glyphs.filter(e => e.kind === 'rfpad').sort((a, b) => a.g.m.member.localeCompare(b.g.m.member));
  const dc = glyphs.filter(e => e.kind === 'pad');
  const ink = P.ink, port = P.green, dcInk = DC, size = 22 * t, char = t === 1 ? 13 : .66 * size, r = t === 1 ? 26 : .8 * size;
  // Each DC name's row: 0, or one line further out when it would touch the previous name on its side.
  const ends = new Map<boolean, number[]>(), rowOf = new Map<string, number>();
  for (const { c, g } of [...dc].sort((a, b) => a.c.cx + a.g.x - b.c.cx - b.g.x)) {
    const net = g.m.member.replace(/^PAD_/, ''), top = c.cy < die.y + die.h / 2, x = c.cx + g.x, half = net.length * char / 2;
    if (net === 'GND') continue;
    const rows = ends.get(top) ?? [], row = [0, 1, 2].find(r => (rows[r] ?? -Infinity) < x - half - 4) ?? 0;
    rows[row] = x + half; ends.set(top, rows); rowOf.set(net, row);
  }
  return <g opacity={k}>
    {rf.map(({ c, g }, i) => {
      const gx = c.cx + g.x, gy = c.cy + g.y, dx = gx - (die.x + die.w / 2), dy = gy - (die.y + die.h / 2);
      const side = Math.abs(dx) / die.w > Math.abs(dy) / die.h;
      const out = 24 + r, px = side ? (dx < 0 ? c.cx - c.w / 2 - out : c.cx + c.w / 2 + out) : gx, py = side ? gy : (dy < 0 ? c.cy - c.h / 2 - out : c.cy + c.h / 2 + out);
      // The port line leaves from the card edge, so it never crosses the card name.
      const sx = side ? (dx < 0 ? c.cx - c.w / 2 : c.cx + c.w / 2) : gx, sy = side ? gy : (dy < 0 ? c.cy - c.h / 2 : c.cy + c.h / 2);
      const length = Math.hypot(px - sx, py - sy);
      return <g key={g.m.member}>
        <path d={`M${sx} ${sy}L${px} ${py}`} stroke={port} strokeWidth={3} strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - k)} />
        <circle cx={px} cy={py} r={r} fill={C.die} stroke={port} strokeWidth={3} />
        <text x={px} y={py + 8 * t} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={22 * t} fill={port}>P{i + 1}</text>
        <path d={`M${px} ${py + r}v14`} stroke={port} strokeWidth={2.4} /><Ground x={px} y={py + r + 14} colour={port} />
      </g>;
    })}
    {dc.map(({ c, g }) => {
      const top = c.cy < die.y + die.h / 2, d = top ? -1 : 1, gx = c.cx + g.x, gy = c.cy + g.y + d * g.s / 2, by = top ? die.y - 26 : die.y + die.h + 26;
      const net = g.m.member.replace(/^PAD_/, '');
      if (net === 'GND') return <g key={net}><path d={`M${gx} ${gy}V${by}`} stroke={ink} strokeWidth={2.4} /><Ground x={gx} y={by} colour={ink} up={top} /></g>;
      return <g key={net}>
        <path d={`M${gx} ${gy}V${by}`} stroke={dcInk} strokeWidth={2.4} />
        <path d={`M${gx - 18} ${by}h36M${gx - 10} ${by + 9 * d}h20`} stroke={dcInk} strokeWidth={3} />
        <path d={`M${gx} ${by + 9 * d}v${10 * d}`} stroke={dcInk} strokeWidth={2.4} /><Ground x={gx} y={by + 19 * d} colour={dcInk} up={top} />
        <text x={gx} y={top ? by - 54 - (rowOf.get(net) ?? 0) * size : by + 46 + size * (1 + (rowOf.get(net) ?? 0))} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={size} fill={dcInk}>{net}</text>
      </g>;
    })}
  </g>;
}

export function BlockView({ layout, links, colours, frame, x, y, w, h, start, focus, bench = 0, glyph, dim, compact = 0, textUnits = TITLE }:
  { layout: Layout; links: BlockLinks; colours: Map<string, string>; frame: number; x: number; y: number; w: number; h: number; start: number;
    focus?: { kinds: Kind[]; k: number }; bench?: number;
    /** Draws a member in place of its glyph, or returns undefined to keep the glyph. */
    glyph?: (member: string, x: number, y: number, s: number, vertical: boolean) => ReactNode | undefined;
    /** Cards other than these blocks' fade back by k. */
    dim?: { blocks: string[]; k: number };
    /** By k, each card's name turns into one small line at its bottom, leaving the card's room to its drawing. */
    compact?: number;
    /** The card names' size in stage units, the bench names' with them; a print sets it, and the cards grow to fit. */
    textUnits?: number }) {
  const { cards, die } = arrange(layout, x, y, w, h, links, textUnits), t = textUnits / TITLE, recorded = coilGlyphs(layout.shapes, 1);
  // A pixelated member is drawn as its recorded shape; the card's name follows the drawing.
  const draw = (g: Card['glyphs'][number], x: number, y: number, colour: string) => glyph?.(g.m.member, x, y, g.s, g.vertical)
    ?? (kindOf(g.m.cell) === 'pixelated' ? recorded(g.m.member, x, y, g.s) : undefined)
    ?? <Glyph key={g.m.member} kind={kindOf(g.m.cell)} x={x} y={y} s={g.s} vertical={g.vertical} colour={colour} />;
  const order = [...cards].sort((a, b) => a.cx - b.cx);
  const cardAt = (c: Card) => start + order.indexOf(c) * STAGGER;
  const rfAt = start + order.length * STAGGER + 6, dcAt = rfAt + 30;
  // Cards joined by each RF line, and cards that share DC nets, each pair once.
  const cardOf = (block: string) => cards.find(c => c.blocks.includes(block));
  const pair = (p: string, q: string) => { const a = cardOf(p), b = cardOf(q); return a && b && a !== b ? (a.id < b.id ? [a, b] : [b, a]) as [Card, Card] : undefined; };
  const unique = (pairs: ([Card, Card] | undefined)[]) => [...new Map(pairs.filter((p): p is [Card, Card] => !!p).map(p => [p[0].id + '|' + p[1].id, p])).values()];
  const rf = unique(links.rf.map(r => pair(r.blocks[0], r.blocks[1])));
  const dc = unique(links.dc.flatMap(n => n.blocks.flatMap((p, i) => n.blocks.slice(i + 1).map(q => pair(p, q)))));
  const centre = (c: Card, dx = 0, dy = 0) => ({ x: c.cx + dx, y: c.cy + dy, card: c });
  const trace = (from: number, length = 1600) => ({ strokeDasharray: `${length} ${length}`, strokeDashoffset: length * (1 - out(frame, from, from + 16)) });
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    <rect x={die.x} y={die.y} width={die.w} height={die.h} rx={10} fill={C.die} stroke={C.grid} strokeWidth={2} opacity={out(frame, start - 10, start + 6)} />
    {dc.map(([p, q], i) => <path key={`d${p.id}${q.id}`} d={wire(centre(p, 14, 14), centre(q, 14, 14))} fill="none" stroke={DC} strokeWidth={3} strokeLinejoin="round"
      opacity={.85 * out(frame, dcAt + i * 3, dcAt + i * 3 + 14) * (dim ? 1 - .7 * dim.k : 1)} />)}
    {rf.map(([p, q], i) => <path key={`r${p.id}${q.id}`} d={wire(centre(p), centre(q))} fill="none" stroke={RF} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
      opacity={dim ? 1 - .7 * dim.k : 1} style={trace(rfAt + i * 5)} />)}
    {cards.map(c => {
      const k = out(frame, cardAt(c), cardAt(c) + 12), colour = c.blocks.length > 1 ? C.muted : colours.get(c.blocks[0]) ?? C.muted;
      const faded = dim && !c.blocks.some(b => dim.blocks.includes(b)) ? 1 - .7 * dim.k : 1;
      return <g key={c.id} opacity={k * faded} transform={`translate(${c.cx} ${c.cy}) scale(${.7 + .3 * k}) translate(${-c.cx} ${-c.cy})`}>
        <rect x={c.cx - c.w / 2} y={c.cy - c.h / 2} width={c.w} height={c.h} rx={12} fill={C.card} stroke={colour} strokeWidth={2} />
        {focus && c.glyphs.map(g => focus.kinds.includes(kindOf(g.m.cell)) && <rect key={`f${g.m.member}`} x={c.cx + g.x - g.s * .62} y={c.cy + g.y - g.s * .62} width={g.s * 1.24} height={g.s * 1.24} rx={10}
          fill={P.glow} fillOpacity={.1 * focus.k} stroke={P.glow} strokeOpacity={.9 * focus.k} strokeWidth={3} />)}
        {c.glyphs.map(g => draw(g, c.cx + g.x, c.cy + g.y, colours.get(g.m.block) ?? colour))}
        {[{ lines: c.lines, small: c.title.length > 22 ? c.lines : [c.title] }].map(({ lines, small }, n) => <g key={n}>
          {compact < 1 && lines.map((l, i) => <text key={l} x={c.cx} y={c.cy + c.h / 2 - 11 * t - (lines.length - 1 - i) * 25 * t} textAnchor="middle" fontFamily="Inter" fontWeight={650} fontSize={textUnits} fill={P.ink} opacity={1 - compact}>{l}</text>)}
          {compact > 0 && small.map((l, i, all) => <text key={`s${l}`} x={c.cx} y={c.cy + c.h / 2 - 8 - (all.length - 1 - i) * 17} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={15} fill={P.soft} opacity={compact}>{l}</text>)}
        </g>)}
      </g>;
    })}
    {bench > 0 && <Bench cards={cards} die={die} k={bench} t={t} />}
  </svg>;
}
