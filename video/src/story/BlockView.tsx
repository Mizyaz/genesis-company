import { Easing, interpolate } from 'remotion';

// The chip's blocks as one symbolic floorplan: each block is a card at its place on the die, pads included, with one
// glyph per member in the members' own row and column order from the layout. Blocks whose members sit interleaved in
// one place share a card. Wires run from member pin to member pin: the RF lines of the interconnect record and every
// DC net of the pins. Cards keep their floorplan order but not their size, so cards are spread apart until none overlap.
export type Box = [number, number, number, number];
type Pin = { block: string; member: string; terminal: string; net: string; box: Box };
export type BlockLinks = { rf: { line: string; blocks: string[]; nets: string[] }[]; dc: { net: string; blocks: string[] }[]; pins: Pin[] };
type Member = { block: string; member: string; cell: string; box: Box };
type Layout = { die: Box; blocks: { name: string; box: Box }[]; members: Member[] };
type Kind = 'pad' | 'resistor' | 'inductor' | 'transistor';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
// A member's kind, from its layout cell.
const kindOf = (cell: string): Kind => /pad/i.test(cell) ? 'pad' : /res/i.test(cell) ? 'resistor' : /^pix_|ind/i.test(cell) ? 'inductor' : 'transistor';
const RF = '#41dce8', DC = '#f5a623', GAP = 26, LABEL = 24, NAME = 14, FILL = .88;
// Glyph cell (width, height) by kind: transistors leave room for their pin wires, resistors stand tall.
const CELL: Record<Kind, [number, number]> = { pad: [66, 66], resistor: [50, 72], inductor: [78, 78], transistor: [108, 82] };
const mid = (b: Box) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as const;
const inside = ([x, y]: readonly [number, number], b: Box) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

function Glyph({ kind, x, y, s, colour, vertical }: { kind: Kind; x: number; y: number; s: number; colour: string; vertical: boolean }) {
  const p = { fill: 'none', stroke: colour, strokeWidth: Math.max(2.4, s * .05), strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'pad') return <g><rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * .08} {...p} /><rect x={x - s / 4} y={y - s / 4} width={s / 2} height={s / 2} fill={colour} fillOpacity={.35} /></g>;
  if (kind === 'resistor') return <path transform={vertical ? `rotate(90 ${x} ${y})` : undefined}
    d={`M${x - s / 2} ${y}h${s * .14}` + [0, 1, 2, 3, 4, 5].map(i => `l${s * .12} ${i % 2 ? s * .2 : -s * .2}`).join('') + `L${x + s / 2} ${y}`} {...p} />;
  if (kind === 'inductor') {
    // An octagonal turn and a half, as the coils are drawn in plan view.
    const r = s / 2, o = r * .41;
    return <g><path d={`M${x - o * .5} ${y + r}L${x - o} ${y + r}L${x - r} ${y + o}L${x - r} ${y - o}L${x - o} ${y - r}L${x + o} ${y - r}L${x + r} ${y - o}L${x + r} ${y + o}L${x + o} ${y + r}`} {...p} />
      <path d={`M${x - o} ${y + r * .55}L${x - r * .55} ${y + o * .6}L${x - r * .55} ${y - o * .6}L${x - o} ${y - r * .55}L${x + o} ${y - r * .55}L${x + r * .55} ${y - o * .6}L${x + r * .55} ${y + o * .6}L${x + o * .5} ${y + r * .55}`} {...p} strokeOpacity={.7} /></g>;
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

type Card = { id: string; blocks: string[]; cx: number; cy: number; rx: number; ry: number; w: number; h: number; glyphs: { m: Member; x: number; y: number; s: number; vertical: boolean }[] };

/** Cards in screen pixels with their glyph places. */
function arrange(layout: Layout, x0: number, y0: number, w: number, h: number) {
  const [dx0, dy0, dx1, dy1] = layout.die, k = Math.min(w / (dx1 - dx0), h / (dy1 - dy0));
  const ox = x0 + (w - (dx1 - dx0) * k) / 2, oy = y0 + (h - (dy1 - dy0) * k) / 2;
  // Blocks share a card when a member of one sits inside the other's box.
  const group = new Map(layout.blocks.map(b => [b.name, b.name]));
  const root = (b: string): string => group.get(b) === b ? b : root(group.get(b)!);
  for (const a of layout.blocks) for (const b of layout.blocks)
    if (a !== b && root(a.name) !== root(b.name) && layout.members.some(m => m.block === a.name && inside(mid(m.box), b.box))) group.set(root(a.name), root(b.name));
  const ids = [...new Set(layout.blocks.map(b => root(b.name)))];
  const cards: Card[] = ids.map(id => {
    const blocks = layout.blocks.filter(b => root(b.name) === id), members = layout.members.filter(m => blocks.some(b => b.name === m.block));
    const box: Box = [Math.min(...blocks.map(b => b.box[0])), Math.min(...blocks.map(b => b.box[1])), Math.max(...blocks.map(b => b.box[2])), Math.max(...blocks.map(b => b.box[3]))];
    const size = Math.min(...members.map(m => Math.min(m.box[2] - m.box[0], m.box[3] - m.box[1])));
    const cols = bands(members.map(m => mid(m.box)[0]), size), rows = bands(members.map(m => -mid(m.box)[1]), size);
    const pad = members.every(m => kindOf(m.cell) === 'pad');
    // Pads keep a share of their real size; every other card is a grid of glyph cells.
    const cell = (i: 0 | 1) => Math.max(...members.map(m => CELL[kindOf(m.cell)][i])), names = members.length > 1 ? NAME : 0;
    // Pad cells are squares, a share of the pad's real size.
    const padCell = Math.max(cell(0), Math.min((box[2] - box[0]) * k * .6 / cols.count, (box[3] - box[1]) * k * .38 / rows.count));
    const cw = pad ? padCell : cell(0), ch = pad ? padCell : cell(1);
    const cardW = cols.count * cw + 16, cardH = rows.count * (ch + names) + LABEL + 10;
    const rx = ox + ((box[0] + box[2]) / 2 - dx0) * k, ry = oy + (dy1 - (box[1] + box[3]) / 2) * k;
    const card: Card = { id, blocks: blocks.map(b => b.name), cx: rx, cy: ry, rx, ry, w: cardW, h: cardH, glyphs: [] };
    card.glyphs = members.map(m => ({ m, x: (cols.of(mid(m.box)[0]) + .5) * cw + 8 - cardW / 2, y: rows.of(-mid(m.box)[1]) * (ch + names) + ch / 2 + 8 - cardH / 2,
      s: Math.min(cw, ch) * FILL * (kindOf(m.cell) === 'transistor' ? .8 : 1), vertical: m.box[3] - m.box[1] > m.box[2] - m.box[0] }));
    return card;
  });
  for (let pass = 0; pass < 300; pass++) {
    let moved = false;
    for (const a of cards) for (const b of cards) {
      if (a === b) continue;
      const ox2 = (a.w + b.w) / 2 + GAP - Math.abs(a.cx - b.cx), oy2 = (a.h + b.h) / 2 + GAP - Math.abs(a.cy - b.cy);
      if (ox2 <= 0 || oy2 <= 0) continue;
      moved = true;
      // Push apart along the axis on which the two blocks are further apart on the die, keeping which one is left
      // or above; a tie goes in list order.
      const side = (r: number) => r < 0 || (r === 0 && cards.indexOf(a) < cards.indexOf(b)) ? -1 : 1;
      if (Math.abs(a.rx - b.rx) / (a.w + b.w) > Math.abs(a.ry - b.ry) / (a.h + b.h)) { const s = side(a.rx - b.rx) * ox2 / 2; a.cx += s; b.cx -= s; }
      else { const s = side(a.ry - b.ry) * oy2 / 2; a.cy += s; b.cy -= s; }
    }
    // Cards stay on the die.
    for (const c of cards) { c.cx = Math.min(Math.max(c.cx, ox + c.w / 2 + 8), ox + (dx1 - dx0) * k - c.w / 2 - 8); c.cy = Math.min(Math.max(c.cy, oy + c.h / 2 + 8), oy + (dy1 - dy0) * k - c.h / 2 - 8); }
    if (!moved) break;
  }
  return { cards, die: { x: ox, y: oy, w: (dx1 - dx0) * k, h: (dy1 - dy0) * k } };
}

// Where a terminal meets a glyph, in glyph units: transistors by terminal name, as the glyph draws them; any other
// member where its pin sits in the member's own box.
const TERMINAL: Record<string, [number, number]> = { G: [-.5, 0], D: [.22, -.5], S: [.22, .5], B: [.44, 0] };
function anchor(card: Card, g: Card['glyphs'][number], pin: Pin) {
  const t = kindOf(g.m.cell) === 'transistor' ? TERMINAL[pin.terminal] : undefined;
  const [mx, my] = mid(g.m.box), [px, py] = mid(pin.box), hw = (g.m.box[2] - g.m.box[0]) / 2 || 1, hh = (g.m.box[3] - g.m.box[1]) / 2 || 1;
  const rx = t ? t[0] : Math.max(-.5, Math.min(.5, (px - mx) / hw / 2)), ry = t ? t[1] : Math.max(-.5, Math.min(.5, -(py - my) / hh / 2));
  return { x: card.cx + g.x + rx * g.s, y: card.cy + g.y + ry * g.s, card };
}
type End = ReturnType<typeof anchor>;

/** An orthogonal wire between two pins: across the gap between their cards, then into the far pin. Its lane, from
 * -.5 to .5, spreads parallel wires over the middle of the gap. */
function wire(a: End, b: End, lane: number) {
  const vertical = Math.abs(a.card.cy - b.card.cy) - (a.card.h + b.card.h) / 2 > 0;
  if (vertical) {
    const [top, bottom] = a.card.cy < b.card.cy ? [a.card, b.card] : [b.card, a.card];
    const y0 = top.cy + top.h / 2, y1 = bottom.cy - bottom.h / 2, y = (y0 + y1) / 2 + lane * (y1 - y0) * .7;
    return `M${a.x} ${a.y}V${y}H${b.x}V${b.y}`;
  }
  const [left, right] = a.card.cx < b.card.cx ? [a.card, b.card] : [b.card, a.card];
  const x0 = left.cx + left.w / 2, x1 = right.cx - right.w / 2, x = (x0 + x1) / 2 + lane * (x1 - x0) * .7;
  return `M${a.x} ${a.y}H${x}V${b.y}H${b.x}`;
}

export function BlockView({ layout, links, colours, frame, x, y, w, h, start }:
  { layout: Layout; links: BlockLinks; colours: Map<string, string>; frame: number; x: number; y: number; w: number; h: number; start: number }) {
  const { cards, die } = arrange(layout, x, y, w, h);
  const order = [...cards].sort((a, b) => a.cx - b.cx);
  const cardAt = (c: Card) => start + order.indexOf(c) * 4;
  const rfAt = start + order.length * 4 + 6, dcAt = rfAt + links.rf.length * 5 + 10;
  // Every pin of a net, one per member, at its glyph.
  const ends = (net: string, block?: string) => {
    const seen = new Set<string>(), found: End[] = [];
    for (const pin of links.pins) {
      if (pin.net !== net || (block && pin.block !== block) || seen.has(pin.member)) continue;
      const card = cards.find(c => c.glyphs.some(g => g.m.member === pin.member)), g = card?.glyphs.find(g => g.m.member === pin.member);
      if (card && g) { seen.add(pin.member); found.push(anchor(card, g, pin)); }
    }
    return found;
  };
  const rf = links.rf.flatMap((r, i) => { const [a] = ends(r.nets[1], r.blocks[1]); return a ? ends(r.nets[0], r.blocks[0]).map(b => ({ key: `${r.line}${b.x}`, i, d: wire(a, b, 0) })) : []; });
  // DC nets between cards: each pin wires to the net's pad, or to its first pin without one.
  const rfNets = new Set(links.rf.flatMap(r => r.nets));
  const dcNets = [...new Set(links.pins.map(p => p.net))].filter(n => !rfNets.has(n)).map(net => {
    const all = ends(net), hub = all.find(e => e.card.glyphs.every(g => kindOf(g.m.cell) === 'pad')) ?? all[0];
    const others = all.filter(e => e !== hub && e.card !== hub?.card);
    return { net, hub, others, label: [hub, ...others].find(e => e?.card.glyphs.some(g => kindOf(g.m.cell) === 'transistor')) ?? others[0] };
  }).filter(n => n.hub && n.others.length);
  const trace = (from: number, length = 1600) => ({ strokeDasharray: `${length} ${length}`, strokeDashoffset: length * (1 - out(frame, from, from + 16)) });
  return <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    <rect x={die.x} y={die.y} width={die.w} height={die.h} rx={10} fill="#06182b" stroke="#2a4660" strokeWidth={2} opacity={out(frame, start - 10, start + 6)} />
    {cards.map(c => {
      const k = out(frame, cardAt(c), cardAt(c) + 12), colour = c.blocks.length > 1 ? '#9aacbf' : colours.get(c.blocks[0]) ?? '#9aacbf';
      return <g key={c.id} opacity={k} transform={`translate(${c.cx} ${c.cy}) scale(${.7 + .3 * k}) translate(${-c.cx} ${-c.cy})`}>
        <rect x={c.cx - c.w / 2} y={c.cy - c.h / 2} width={c.w} height={c.h} rx={12} fill="#0b2238" stroke={colour} strokeWidth={2} />
        {c.glyphs.map(g => <Glyph key={g.m.member} kind={kindOf(g.m.cell)} x={c.cx + g.x} y={c.cy + g.y} s={g.s} vertical={g.vertical} colour={colours.get(g.m.block) ?? colour} />)}
        {c.glyphs.length > 1 && c.glyphs.map(g => <text key={`t${g.m.member}`} x={c.cx + g.x} y={c.cy + g.y + Math.min(g.s / 2, 42) + 12} textAnchor="middle" fontFamily="Inter" fontSize={11}
          fill={colours.get(g.m.block) ?? colour}>{g.m.member.replace(/^PAD_/, '')}</text>)}
        <text x={c.cx} y={c.cy + c.h / 2 - 8} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={15} fill="#dce8f4">{c.blocks.map(b => b.replace(/_/g, ' ')).join(' + ')}</text>
      </g>;
    })}
    {rf.map(r => <path key={r.key} d={r.d} fill="none" stroke={RF} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={.9} style={trace(rfAt + r.i * 5)} />)}
    {dcNets.map((n, i) => n.others.map((e, j) => <path key={`${n.net}${j}`} d={wire(e, n.hub, (i % 6) / 5 - .5)} fill="none" stroke={DC} strokeWidth={2}
      strokeDasharray="6 5" opacity={.9 * out(frame, dcAt + i * 3, dcAt + i * 3 + 14)} />))}
    {dcNets.map((n, i) => n.others.map((e, j) => <circle key={`p${n.net}${j}`} cx={e.x} cy={e.y} r={3.2} fill={DC} opacity={out(frame, dcAt + i * 3, dcAt + i * 3 + 14)} />))}
    {dcNets.map(n => { const left = n.label.x < n.label.card.cx; return <text key={`l${n.net}`} x={n.label.x + (left ? -6 : 6)} y={n.label.y - 5} textAnchor={left ? 'end' : 'start'} fontFamily="Inter" fontSize={12} fill={DC}
      stroke="#06182b" strokeWidth={5} paintOrder="stroke" opacity={out(frame, dcAt + 20, dcAt + 34)}>{n.net}</text>; })}
  </svg>;
}
