// The film's schematic from a GENESIS circuit record: its topology (instances and nets, the source the layout chain
// netlists), drawn by one deterministic rule. The signal path runs left to right from the first RF port to each other
// port, one row per branch; shunts hang under their node; a resistor biasing a transistor terminal sits on that
// terminal's side; the DC sources stand on rows above; each wire takes the corner that crosses fewer parts. RF pads are
// named by their port (P1), DC pads by their net (VC); every other part by its instance id, as the layout's members are.
// The drawing is checked against the layout's LVS source netlist (CDL) before it is used: with the lines, inductors and
// pads shorted, as LVS sees them, every transistor and resistor of the CDL must sit on the same nets.

/** Terminal offsets of each symbol, in part coordinates (the app's schematic symbols). */
const SYMBOLS = {
  port: [['PLUS', -40, 0], ['MINUS', 40, 0]], vdc: [['PLUS', -40, 0], ['MINUS', 40, 0]], resistor: [['PLUS', -40, 0], ['MINUS', 40, 0]],
  inductor: [['PLUS', -40, 0], ['MINUS', 40, 0]], line: [['PLUS', -40, 0], ['MINUS', 40, 0]],
  nmos: [['d', 20, -40], ['g', -40, 0], ['s', 20, 40], ['b', 40, 0], ['x', 40, 20]], ground: [['gnd!', 0, -20]],
};
// The drawing parts names up to LABEL units high in a wide font (CHAR per letter, DejaVu Sans Bold's widest), so a print
// may set them that large; the rows stand far enough apart for the names between them.
const LABEL = 48, CHAR = .75 * LABEL;
const COLUMN = 260, PITCH = 160, ROW = 500 + 2.5 * LABEL, GND = 'GND';

const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (base, over) => Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(over)])]
  .map(k => [k, isObject(base[k]) && isObject(over[k]) ? merge(base[k], over[k]) : k in over ? over[k] : base[k]]));

/** A record and the record it extends, merged key by key (the extending record's values win). `read(name)` returns a
 * JSON file of the record's folder. */
export function resolveRecord(read, name = 'circuit.json') {
  const { extends: base, ...record } = read(name);
  return base ? merge(resolveRecord(read, base), record) : record;
}

/** The drawing kind of an instance: lines and inductors by their colouring group and cell, pads by the drive of the
 * pin they lead to, devices by type. */
function kindOf(instance, record, padPin) {
  const group = Object.entries(record.colouring.colouring).find(([, members]) => members.includes(instance.id))?.[0] ?? '';
  if (group.startsWith('conductor_')) return 'line';
  if (instance.type === 'transistor') return 'nmos';
  if (instance.cell === 'reopnpcres' || /res/.test(instance.cell)) return 'resistor';
  if (instance.cell === 'ind') return 'inductor';
  const pin = padPin.get(instance.id);
  if (pin?.drive === 'port') return 'port';
  if (pin?.drive === 'open') return 'vdc';
  if (pin?.drive === 'gnd') return null;
  throw new Error(`no drawing kind for ${instance.id} (${instance.type} ${instance.cell})`);
}

/** A terminal's offset after a part's rotation (SVG: clockwise, y down), as the renderer turns it. */
const turn = ([x, y], degrees) => { const a = degrees * Math.PI / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)); return [x * c - y * s, x * s + y * c]; };
/** The rotation that turns a two-terminal part's `name` end (PLUS on the left, MINUS on the right) to face `dir`. */
const facing = (name, [dx, dy]) => { const base = dx > 0 ? 0 : dx < 0 ? 180 : dy > 0 ? 90 : 270; return (base + (name === 'PLUS' ? 180 : 0)) % 360; };

export function schematicOf(record, cdl) {
  const { topology } = record, pins = new Map(topology.pins.map(p => [p.name, p]));
  // terminal -> net, and the pin a pad leads out to (its EXT terminal's net).
  const netOf = new Map();
  for (const [net, terms] of Object.entries(topology.nets)) for (const t of terms) netOf.set(t, net);
  const padPin = new Map(topology.instances.map(i => [i.id, pins.get(netOf.get(`${i.id}.EXT`))]).filter(([, p]) => p));
  checkAgainstLvs(record, netOf, cdl);

  // The parts to draw, their names, and each drawn terminal's net (a pad's PLUS is its core, its MINUS ground).
  const parts = [];
  for (const instance of topology.instances) {
    const kind = kindOf(instance, record, padPin);
    if (!kind) continue;
    const pin = padPin.get(instance.id), number = /(\d+)$/.exec(pin?.name ?? '')?.[1];
    const label = kind === 'port' ? `P${number}` : kind === 'vdc' ? netOf.get(`${instance.id}.CORE`) : instance.id;
    parts.push({ id: instance.id, kind, label, x: 0, y: 0, rotation: 0, terminals: SYMBOLS[kind].map(([name, x, y]) => ({ name, x, y })) });
  }
  const drawn = new Map(parts.map(p => [p.id, p]));
  const netAt = (part, name) => padPin.has(part.id) ? (name === 'PLUS' ? netOf.get(`${part.id}.CORE`) : GND) : netOf.get(`${part.id}.${name}`);
  const placed = new Set(), put = (part, x, y, rotation, labelAt) => { Object.assign(part, { x, y, rotation }, labelAt && { labelAt }); placed.add(part.id); };
  const at = (part, name) => { const t = part.terminals.find(t => t.name === name), [x, y] = turn([t.x, t.y], part.rotation); return [part.x + x, part.y + y]; };

  // The signal path: series parts (lines, inductors, transistor channels) between nets, shortest from the first port.
  const ports = parts.filter(p => p.kind === 'port').sort((a, b) => padPin.get(a.id).name.localeCompare(padPin.get(b.id).name, 'en', { numeric: true }));
  const channel = p => p.kind === 'nmos' ? ['s', 'd'] : p.kind === 'line' || p.kind === 'inductor' ? ['PLUS', 'MINUS'] : null;
  const edges = new Map();
  for (const p of parts) { const ends = channel(p); if (!ends) continue; const [a, b] = ends.map(n => netAt(p, n));
    if (a === GND || b === GND || !a || !b) continue;
    for (const [from, to, name] of [[a, b, ends[0]], [b, a, ends[1]]]) (edges.get(from) ?? edges.set(from, []).get(from)).push({ part: p, to, enter: name }); }
  const start = netAt(ports[0], 'PLUS'), parent = new Map([[start, null]]), queue = [start];
  while (queue.length) { const net = queue.shift(); for (const e of edges.get(net) ?? []) if (!parent.has(e.to)) { parent.set(e.to, { ...e, from: net }); queue.push(e.to); } }
  const pathTo = net => { const steps = []; for (let s = parent.get(net); s; s = parent.get(s.from)) steps.unshift(s); return steps; };
  const branches = ports.slice(1).map(port => ({ port, steps: pathTo(netAt(port, 'PLUS')) }));
  const series = new Set(branches.flatMap(b => b.steps.map(s => s.part.id)));
  const shuntsAt = net => parts.filter(p => !series.has(p.id) && !padPin.has(p.id) && p.terminals.some(t => netAt(p, t.name) === net) && p.terminals.some(t => netAt(p, t.name) === GND));

  // Columns along each branch: a series part, then the shunts of the node it reaches; the shared start is drawn once.
  // Lines, inductors and ports stand a symbol and its label apart (PITCH); a transistor takes a column.
  // A shunt transistor stands far enough right that its gate tag's name clears the body resistor's name of the series
  // transistor before it: both are as wide as the longest resistor or DC net name.
  const wide = CHAR * Math.max(...parts.filter(p => p.kind === 'resistor' || p.kind === 'vdc').map(p => p.label.length));
  const shuntAt = 24 + wide + 236 + wide + 20;
  branches.forEach(({ port, steps }, row) => {
    const y = row * ROW;
    let x = 0;
    if (!placed.has(ports[0].id)) put(ports[0], 0, y, 180);
    for (const { part, enter, to } of steps) {
      x += part.kind === 'nmos' ? COLUMN : PITCH;
      if (placed.has(part.id)) x = part.x;
      else part.kind === 'nmos' ? put(part, x, y - 20, enter === 's' ? 90 : 270, [-28, -26, 'end']) : put(part, x, y, enter === 'PLUS' ? 0 : 180);
      for (const shunt of shuntsAt(to)) {
        const start = x;
        x += shunt.kind === 'nmos' ? shuntAt + 110 : PITCH;
        if (placed.has(shunt.id)) continue;
        const top = shunt.terminals.find(t => netAt(shunt, t.name) === to).name;
        shunt.kind === 'nmos' ? put(shunt, start + shuntAt, y + 110, top === 'd' ? 0 : 180, [-14, 62, 'end']) : put(shunt, x, y + 80, top === 'PLUS' ? 90 : 270);
      }
    }
    put(port, x + PITCH, y, 0);
  });

  // Bias resistors: beside the transistor terminal they lead to, their joined end facing it.
  for (const r of parts.filter(p => p.kind === 'resistor' && !placed.has(p.id))) {
    const hit = r.terminals.map(t => ({ end: t.name, net: netAt(r, t.name) })).flatMap(({ end, net }) => parts.filter(p => placed.has(p.id) && p.kind === 'nmos')
      .flatMap(m => m.terminals.filter(t => netAt(m, t.name) === net).map(t => ({ end, m, name: t.name }))))[0];
    if (!hit) continue;
    const [tx, ty] = at(hit.m, hit.name), [dx, dy] = turn([hit.m.terminals.find(t => t.name === hit.name).x, hit.m.terminals.find(t => t.name === hit.name).y], hit.m.rotation);
    const dir = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    put(r, tx + dir[0] * 100, ty + dir[1] * 100, facing(hit.end, [-dir[0], -dir[1]]));
    if (dir[1]) r.labelAt = [24, 7, 'start'];
  }
  // DC sources: one row above the start of the signal path, upright, a column apart.
  const top = Math.min(...parts.filter(p => placed.has(p.id)).map(p => p.y)) - 200;
  parts.filter(p => p.kind === 'vdc').sort((a, b) => a.label.localeCompare(b.label)).forEach((p, i) => { put(p, i * COLUMN, top, 90); p.labelAt = [30, 7, 'start']; });
  const lost = parts.filter(p => !placed.has(p.id));
  if (lost.length) throw new Error(`no place for ${lost.map(p => p.id).join(' ')}`);

  // Ground: one symbol under the lowest grounded terminal of each part, wired to all of its grounded terminals.
  for (const part of [...parts]) {
    const grounded = part.terminals.filter(t => netAt(part, t.name) === GND).map(t => t.name);
    if (!grounded.length) continue;
    const [gx, gy] = grounded.map(n => at(part, n)).sort((a, b) => b[1] - a[1])[0];
    // Under the terminal, or beside it when another part stands there.
    const [x, y] = [[gx, gy + 60], [gx - 60, gy + 60], [gx + 60, gy + 60]].find(([x, y]) => parts.every(q => q === part || Math.hypot(q.x - x, q.y - y) > 60)) ?? [gx, gy + 60];
    const ground = { id: `GND_${part.id}`, kind: 'ground', label: `GND_${part.id}`, x, y, rotation: 0, terminals: SYMBOLS.ground.map(([name, x, y]) => ({ name, x, y })) };
    parts.push(ground); drawn.set(ground.id, ground);
    (part.groundWires = grounded);
  }

  // Wires: each net as a star from its source (a pad or source, else its first terminal). Each wire takes the cheapest
  // shape: one corner either way, or three legs through a free channel between the parts' rows or columns (bends,
  // which draw nothing; they cost half a crossing). A part it crosses costs 1, running along another net's wire 5, passing another net's terminal 10.
  const solid = parts.filter(p => p.kind !== 'ground');
  const boxes = solid.map(p => ({ id: p.id, x0: p.x - 30, y0: p.y - 30, x1: p.x + 30, y1: p.y + 30 }));
  const ends = solid.flatMap(p => p.terminals.map(t => ({ net: netAt(p, t.name), xy: at(p, t.name) })));
  const channels = values => { const v = [...new Set(values)].sort((a, b) => a - b); return v.slice(1).map((x, i) => [v[i], x]).filter(([a, b]) => b - a > 60).map(([a, b]) => (a + b) / 2); };
  const midX = channels(solid.map(p => p.x)), midY = channels(solid.map(p => p.y));
  const laid = [], on = ([x0, y0], [x1, y1], [x, y]) => x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y >= Math.min(y0, y1) && y <= Math.max(y0, y1);
  const along = ([a0, a1], [b0, b1]) => (a0[0] === a1[0] && b0[0] === b1[0] && a0[0] === b0[0] && Math.min(Math.max(a0[1], a1[1]), Math.max(b0[1], b1[1])) > Math.max(Math.min(a0[1], a1[1]), Math.min(b0[1], b1[1])))
    || (a0[1] === a1[1] && b0[1] === b1[1] && a0[1] === b0[1] && Math.min(Math.max(a0[0], a1[0]), Math.max(b0[0], b1[0])) > Math.max(Math.min(a0[0], a1[0]), Math.min(b0[0], b1[0])));
  const across = ([a0, a1], [b0, b1]) => { const [h, v] = a0[1] === a1[1] ? [[a0, a1], [b0, b1]] : [[b0, b1], [a0, a1]];
    return h[0][1] === h[1][1] && v[0][0] === v[1][0] && v[0][0] > Math.min(h[0][0], h[1][0]) && v[0][0] < Math.max(h[0][0], h[1][0]) && h[0][1] > Math.min(v[0][1], v[1][1]) && h[0][1] < Math.max(v[0][1], v[1][1]); };
  const cost = (points, skip, net) => points.slice(1).map((p, i) => [points[i], p]).reduce((sum, leg) => sum
    + boxes.filter(q => !skip.includes(q.id) && Math.max(leg[0][0], leg[1][0]) >= q.x0 && Math.min(leg[0][0], leg[1][0]) <= q.x1 && Math.max(leg[0][1], leg[1][1]) >= q.y0 && Math.min(leg[0][1], leg[1][1]) <= q.y1).length
    + 5 * laid.filter(l => l.net !== net && along(leg, l.leg)).length + 3 * laid.filter(l => l.net !== net && across(leg, l.leg)).length
    + 10 * ends.filter(e => e.net !== net && on(leg[0], leg[1], e.xy)).length
    + Math.hypot(leg[1][0] - leg[0][0], leg[1][1] - leg[0][1]) / 1e4, 0);
  const wires = [];
  let bends = 0;
  const bend = (x, y) => { const p = { id: `BEND_${++bends}`, kind: 'bend', label: '', x, y, rotation: 0, terminals: [{ name: 'c', x: 0, y: 0 }] }; parts.push(p); drawn.set(p.id, p); return { partId: p.id, terminal: 'c' }; };
  const wire = (from, to, net) => {
    const a = at(drawn.get(from.partId), from.terminal), b = at(drawn.get(to.partId), to.terminal), skip = [from.partId, to.partId];
    const shapes = [[a, [b[0], a[1]], b], [a, [a[0], b[1]], b], ...midY.map(y => [a, [a[0], y], [b[0], y], b]), ...midX.map(x => [a, [x, a[1]], [x, b[1]], b])];
    // Two bends cost half a crossing: a wire takes a channel only to go around something.
    const best = shapes.map(points => ({ points, cost: cost(points, skip, net) + .5 * (points.length - 3) })).sort((p, q) => p.cost - q.cost)[0].points;
    for (const leg of best.slice(1).map((p, i) => [best[i], p])) laid.push({ net, leg });
    // The renderer draws a wire as H then V: a corner the other way runs from b; three legs pass two bends.
    if (best.length === 3) { wires.push(best[1][1] === a[1] ? { from, to, net } : { from: to, to: from, net }); return; }
    const [one, two] = [bend(...best[1]), bend(...best[2])];
    wires.push({ from, to: one, net }, { from: one, to: two, net }, { from: two, to, net });
  };
  // Ground leads first: they are short, and the longer wires go around them.
  for (const part of parts) if (part.groundWires) { for (const terminal of part.groundWires) wire({ partId: part.id, terminal }, { partId: `GND_${part.id}`, terminal: 'gnd!' }, `GND_${part.id}`); delete part.groundWires; }
  const nets = new Map();
  for (const p of parts) if (p.kind !== 'ground') for (const t of p.terminals) { const net = netAt(p, t.name); if (net && net !== GND) (nets.get(net) ?? nets.set(net, []).get(net)).push({ partId: p.id, terminal: t.name }); }
  // A DC net is drawn as a tag with its name at each of its terminals, pointing away from the part: its wires would
  // cross the signal rows.
  const tag = ({ partId, terminal }, net) => {
    const p = drawn.get(partId), [x, y] = at(p, terminal), d = [Math.sign(Math.round(x - p.x)), Math.sign(Math.round(y - p.y))];
    const rotation = d[0] > 0 ? 0 : d[0] < 0 ? 180 : d[1] > 0 ? 90 : 270;
    const labelAt = d[0] ? [d[0] * 56, 7, d[0] > 0 ? 'start' : 'end'] : [0, d[1] > 0 ? 50 + .75 * LABEL : -52, 'middle'];
    const t = { id: `TAG_${partId}_${terminal}`, kind: 'tag', label: net, x, y, rotation, labelAt, terminals: [{ name: 'c', x: 0, y: 0 }] };
    parts.push(t); drawn.set(t.id, t);
  };
  const fed = new Set(parts.filter(p => p.kind === 'vdc').map(p => netAt(p, 'PLUS')));
  for (const [net, ends] of nets) {
    if (fed.has(net)) { for (const end of ends) if (!padPin.has(end.partId)) tag(end, net); continue; }
    // From the pad, else from the leftmost terminal, where the signal comes in.
    ends.sort((a, b) => Number(padPin.has(b.partId)) - Number(padPin.has(a.partId)) || at(drawn.get(a.partId), a.terminal)[0] - at(drawn.get(b.partId), b.terminal)[0]);
    for (const end of ends.slice(1)) wire(ends[0], end, net);
  }

  // Colouring: the record's groups of placed blocks, by the parts' names, their role from its colours (bias for the
  // groups it leaves uncoloured). The lines are the router's, not blocks: they keep no group.
  const colouring = Object.fromEntries(Object.entries(record.colouring.colouring)
    .map(([group, members]) => [group, { members: members.filter(m => drawn.has(m) && drawn.get(m).kind !== 'line').map(m => drawn.get(m).label), role: record.colouring.colours[group] ?? 'bias', path: [] }])
    .filter(([, g]) => g.members.length));
  return { parts, wires, colouring };
}

/** Throws unless every transistor and resistor of the LVS source sits on the record's nets once the record's lines,
 * inductors and pads are shorted, and both hold the same devices. */
function checkAgainstLvs(record, netOf, cdl) {
  const parent = new Map(), find = n => { while (parent.has(n) && parent.get(n) !== n) n = parent.get(n); return n; };
  const join = (a, b) => { if (a && b && find(a) !== find(b)) parent.set(find(a), find(b)); };
  const shorted = record.topology.instances.filter(i => i.type !== 'transistor' && i.cell !== 'reopnpcres');
  for (const i of shorted) { const nets = [...netOf].filter(([t]) => t.startsWith(`${i.id}.`)).map(([, n]) => n); for (const n of nets.slice(1)) join(nets[0], n); }
  const pins = { transistor: ['d', 'g', 's', 'b', 'x'], resistor: ['PLUS', 'MINUS'] };
  const ours = new Map(record.topology.instances.filter(i => i.type === 'transistor' || i.cell === 'reopnpcres')
    .map(i => [i.id, (i.type === 'transistor' ? pins.transistor : pins.resistor).map(p => find(netOf.get(`${i.id}.${p}`) ?? '?'))]));
  const lines = cdl.replace(/\n\+/g, ' ').split('\n').map(l => l.trim().split(/\s+/));
  // An lvsres resistor is the LVS source's short (a pixelated device split for the check): its nets are one.
  const theirs = new Map(), same = new Map(), mine = n => { while (same.has(n) && same.get(n) !== n) n = same.get(n); return n; };
  for (const [name, a, b, ...rest] of lines) if (/^R/i.test(name) && rest.includes('$[lvsres]') && mine(a) !== mine(b)) same.set(mine(a), mine(b));
  for (const [name, ...rest] of lines) {
    if (/^XM/i.test(name)) theirs.set(name.slice(1), rest.slice(0, 5).map(mine));
    else if (/^R/i.test(name) && !rest.includes('$[lvsres]')) theirs.set(name.slice(1), rest.slice(0, 2).map(mine));
  }
  const missing = [...ours.keys()].filter(id => !theirs.has(id)), extra = [...theirs.keys()].filter(id => !ours.has(id));
  if (missing.length || extra.length) throw new Error(`devices differ from the LVS source: missing ${missing.join(' ') || '-'}, extra ${extra.join(' ') || '-'}`);
  const pair = new Map(), back = new Map();
  for (const [id, nets] of ours) theirs.get(id).forEach((net, k) => {
    const mine = nets[k];
    if ((pair.get(mine) ?? net) !== net || (back.get(net) ?? mine) !== mine) throw new Error(`${id} terminal ${k}: ${mine} meets ${net} in the LVS source, which another device puts elsewhere`);
    pair.set(mine, net); back.set(net, mine);
  });
}
