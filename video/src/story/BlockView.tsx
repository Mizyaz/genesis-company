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
export type Kind = 'pad' | 'rfpad' | 'resistor' | 'inductor' | 'transistor';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
// A member's kind, from its layout cell.
const kindOf = (cell: string): Kind => /pad_mmw|rfpad/i.test(cell) ? 'rfpad' : /pad/i.test(cell) ? 'pad' : /res/i.test(cell) ? 'resistor' : /^pix_|ind/i.test(cell) ? 'inductor' : 'transistor';
const RF = '#41dce8', DC = '#f5a623', GAP = 14, LABEL = 26, NAME = 16, FILL = .88;
// Glyph cell (width, height) by kind: transistors leave room for their pin wires, resistors stand tall.
const CELL: Record<Kind, [number, number]> = { pad: [52, 52], rfpad: [52, 52], resistor: [40, 54], inductor: [70, 62], transistor: [90, 62] };
const mid = (b: Box) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as const;
const inside = ([x, y]: readonly [number, number], b: Box) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

function Glyph({ kind, x, y, s, colour, vertical }: { kind: Kind; x: number; y: number; s: number; colour: string; vertical: boolean }) {
  const p = { fill: 'none', stroke: colour, strokeWidth: Math.max(2.4, s * .05), strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (kind === 'pad') return <g><rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={s * .08} {...p} /><rect x={x - s / 4} y={y - s / 4} width={s / 2} height={s / 2} fill={colour} fillOpacity={.35} /></g>;
  // An RF pad is ground, signal, ground along the die edge; the signal pad is filled.
  if (kind === 'rfpad') return <g transform={vertical ? undefined : `rotate(90 ${x} ${y})`}>{[-1, 0, 1].map(i =>
    <rect key={i} x={x - s * .32} y={y + i * s * .34 - s * .14} width={s * .64} height={s * .28} rx={s * .04} {...p} fill={i ? 'none' : colour} fillOpacity={i ? 0 : .55} />)}</g>;
  if (kind === 'resistor') return <path transform={vertical ? `rotate(90 ${x} ${y})` : undefined}
    d={`M${x - s / 2} ${y}h${s * .14}` + [0, 1, 2, 3, 4, 5].map(i => `l${s * .12} ${i % 2 ? s * .2 : -s * .2}`).join('') + `L${x + s / 2} ${y}`} {...p} />;
  if (kind === 'inductor') {
    // A half turn from one port to the other, as the chip's coils run between pins on opposite sides.
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
    const pad = members.every(m => /pad/.test(kindOf(m.cell)));
    // Pads keep a share of their real size; every other card is a grid of glyph cells.
    const cell = (i: 0 | 1) => Math.max(...members.map(m => CELL[kindOf(m.cell)][i])), names = members.length > 1 ? NAME : 0;
    // Pad cells are squares, a share of the pad's real size.
    const padCell = Math.max(cell(0), Math.min((box[2] - box[0]) * k * .4 / cols.count, (box[3] - box[1]) * k * .25 / rows.count));
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
    // Cards stay in the view.
    for (const c of cards) { c.cx = Math.min(Math.max(c.cx, x0 + c.w / 2 + 4), x0 + w - c.w / 2 - 4); c.cy = Math.min(Math.max(c.cy, y0 + c.h / 2 + 4), y0 + h - c.h / 2 - 4); }
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
  let rx = t ? t[0] : Math.max(-.5, Math.min(.5, (px - mx) / hw / 2)), ry = t ? t[1] : Math.max(-.5, Math.min(.5, -(py - my) / hh / 2));
  // A coil's pins sit on the ends of its half turn, as the glyph draws it.
  if (kindOf(g.m.cell) === 'inductor') [rx, ry] = g.vertical ? [-.16, Math.sign(ry) * .5] : [Math.sign(rx) * .5, .16];
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

/** Each block's card centre on screen, for a view that moves the blocks on from the cards. */
export function blockCentres(layout: Layout, x: number, y: number, w: number, h: number) {
  return new Map(arrange(layout, x, y, w, h).cards.flatMap(c => c.blocks.map(b => [b, [c.cx, c.cy] as const])));
}

/** A ground symbol hanging from (x, y). */
const Ground = ({ x, y, colour, up = false }: { x: number; y: number; colour: string; up?: boolean }) => { const d = up ? -1 : 1;
  return <path d={`M${x} ${y}v${12 * d}M${x - 16} ${y + 12 * d}h32M${x - 10} ${y + 19 * d}h20M${x - 4} ${y + 26 * d}h8`} stroke={colour} strokeWidth={2.4} fill="none" strokeLinecap="round" />; };

/** The testbench around the chip, appearing by k: an S-parameter port on every RF pad and a DC source on every DC pad,
 * each out past the die edge nearest its pad (the ground pad goes straight to ground). Ports are numbered in pad order. */
function Bench({ cards, die, k }: { cards: Card[]; die: { x: number; y: number; w: number; h: number }; k: number }) {
  const glyphs = cards.flatMap(c => c.glyphs.map(g => ({ c, g, kind: kindOf(g.m.cell) })));
  const rf = glyphs.filter(e => e.kind === 'rfpad').sort((a, b) => a.g.m.member.localeCompare(b.g.m.member));
  const dc = glyphs.filter(e => e.kind === 'pad');
  const ink = '#dce8f4', port = '#6fe0a5', dcInk = DC;
  return <g opacity={k}>
    {rf.map(({ c, g }, i) => {
      const gx = c.cx + g.x, gy = c.cy + g.y, dx = gx - (die.x + die.w / 2), dy = gy - (die.y + die.h / 2);
      const side = Math.abs(dx) / die.w > Math.abs(dy) / die.h;
      const px = side ? (dx < 0 ? die.x - 70 : die.x + die.w + 70) : gx, py = side ? gy : (dy < 0 ? die.y - 70 : die.y + die.h + 70);
      const length = Math.hypot(px - gx, py - gy);
      return <g key={g.m.member}>
        <path d={`M${gx} ${gy}L${px} ${py}`} stroke={port} strokeWidth={3} strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - k)} />
        <circle cx={px} cy={py} r={26} fill="#06182b" stroke={port} strokeWidth={3} />
        <text x={px} y={py + 8} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={22} fill={port}>P{i + 1}</text>
        <path d={`M${px} ${py + 26}v14`} stroke={port} strokeWidth={2.4} /><Ground x={px} y={py + 40} colour={port} />
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
        <text x={gx} y={top ? by - 54 : by + 68} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={19} fill={dcInk}>{net}</text>
      </g>;
    })}
  </g>;
}

export function BlockView({ layout, links, colours, frame, x, y, w, h, start, focus, bench = 0 }:
  { layout: Layout; links: BlockLinks; colours: Map<string, string>; frame: number; x: number; y: number; w: number; h: number; start: number;
    focus?: { kinds: Kind[]; k: number }; bench?: number }) {
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
    const all = ends(net), hub = all.find(e => e.card.glyphs.every(g => kindOf(g.m.cell) === 'pad' || kindOf(g.m.cell) === 'rfpad')) ?? all[0];
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
        {focus && c.glyphs.map(g => focus.kinds.includes(kindOf(g.m.cell)) && <rect key={`f${g.m.member}`} x={c.cx + g.x - g.s * .62} y={c.cy + g.y - g.s * .62} width={g.s * 1.24} height={g.s * 1.24} rx={10}
          fill="#ffffff" fillOpacity={.1 * focus.k} stroke="#ffffff" strokeOpacity={.9 * focus.k} strokeWidth={3} />)}
        {c.glyphs.map(g => <Glyph key={g.m.member} kind={kindOf(g.m.cell)} x={c.cx + g.x} y={c.cy + g.y} s={g.s} vertical={g.vertical} colour={colours.get(g.m.block) ?? colour} />)}
        {c.glyphs.length > 1 && c.glyphs.map(g => <text key={`t${g.m.member}`} x={c.cx + g.x} y={c.cy + g.y + Math.min(g.s / 2, 42) + 15} textAnchor="middle" fontFamily="Inter" fontSize={15}
          fill={colours.get(g.m.block) ?? colour}>{g.m.member.replace(/^PAD_/, '')}</text>)}
        <text x={c.cx} y={c.cy + c.h / 2 - 9} textAnchor="middle" fontFamily="Inter" fontWeight={600} fontSize={20} fill="#dce8f4">{c.blocks.map(b => b.replace(/_/g, ' ')).join(' + ')}</text>
      </g>;
    })}
    {rf.map(r => <path key={r.key} d={r.d} fill="none" stroke={RF} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={.9} style={trace(rfAt + r.i * 5)} />)}
    {dcNets.map((n, i) => n.others.map((e, j) => <path key={`${n.net}${j}`} d={wire(e, n.hub, (i % 6) / 5 - .5)} fill="none" stroke={DC} strokeWidth={2}
      strokeDasharray="6 5" opacity={.9 * out(frame, dcAt + i * 3, dcAt + i * 3 + 14)} />))}
    {dcNets.map((n, i) => n.others.map((e, j) => <circle key={`p${n.net}${j}`} cx={e.x} cy={e.y} r={3.2} fill={DC} opacity={out(frame, dcAt + i * 3, dcAt + i * 3 + 14)} />))}
    {dcNets.map(n => { const left = n.label.x < n.label.card.cx; return <text key={`l${n.net}`} x={n.label.x + (left ? -6 : 6)} y={n.label.y - 5} textAnchor={left ? 'end' : 'start'} fontFamily="Inter" fontSize={18} fill={DC}
      stroke="#06182b" strokeWidth={5} paintOrder="stroke" opacity={out(frame, dcAt + 20, dcAt + 34)}>{n.net}</text>; })}
    {bench > 0 && <Bench cards={cards} die={die} k={bench} />}
  </svg>;
}
