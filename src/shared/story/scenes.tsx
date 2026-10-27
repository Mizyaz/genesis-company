import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { BlockView, cardBoxes, type BlockLinks, type Box } from './BlockView';
import { blockOfPart, BLOCK_COLOURS, chipColours, partColours } from './colours';
import { blockFlights, FlyingBlocks, layoutFrame, LayoutStages, PART_OF, STAGE_AT, STAGES, type StagedLayout } from './LayoutStages';
import { ease, out } from './motion';
import { alpha, B, C, GRADIENT, P } from './palette';
import { fit, Schematic, type Drawing } from './Schematic';

// The film's schematic, blocks and layout scenes on its 1920 x 1080 stage, as functions of the scene's frame: the film
// (video/src/Story.tsx) plays them on Remotion's clock with its own captions and hand-offs around them, the site
// (src/shared/StoryStage.tsx) on the page's clock while the stage is in view.

// Content stays above the caption band. From the proposal on, the circuit always sits on the right (CIRCUIT) and the
// words and plots about it on the left (PANEL); the circuit's view only moves forward: schematic, blocks, testbench,
// layout, 3D.
export const CIRCUIT = { left: 790, top: 30, width: 1040, height: 700 };
export const PANEL = { left: 96, top: 40, width: 640 };
// The blocks and the testbench sit lower, with room above for the DC sources and below for a port.
export const BENCH = { x: CIRCUIT.left, y: 118, w: CIRCUIT.width, h: 664 };
// The block view pushed in to fill the frame above the caption band, centred on the bench's cards.
export const PUSH = { scale: 1.28, from: [BENCH.x + BENCH.w / 2, BENCH.y + 332] as const, to: [960, 445] as const };
export const zoomTo = (k: number, z: { scale: number; from: readonly [number, number]; to: readonly [number, number] }) => { const s = 1 + (z.scale - 1) * k;
  return `translate(${(z.to[0] - z.from[0]) * k}px, ${(z.to[1] - z.from[1]) * k}px) translate(${z.from[0]}px, ${z.from[1]}px) scale(${s}) translate(${-z.from[0]}px, ${-z.from[1]}px)`; };
export const push = (k: number) => zoomTo(k, PUSH);

/** Each scene's chapter and captions, from the frame each caption starts. */
export const CAPTIONS: Record<'schematic' | 'blocks' | 'layout', { chapter: string; captions: [number, string][] }> = {
  schematic: { chapter: 'Schematic', captions: [[0, 'GENESIS draws your schematic on your PDK.']] },
  blocks: { chapter: 'Blocks', captions: [[0, 'GENESIS splits your circuit into layout blocks.'], [70, 'GENESIS joins your blocks: pads, RF lines and bias nets.']] },
  layout: { chapter: 'Layout', captions: [[0, 'GENESIS turns your blocks into a layout.'], [130, 'GENESIS routes your RF and DC lines.'], [300, 'GENESIS tiles your ground and fill.']] },
};

/** A caption at `frame` frames after it starts: whole, or word by word, each word rising into its place. */
export function Caption({ text, frame, whole = false }: { text: string; frame: number; whole?: boolean }) {
  return <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 62, lineHeight: 1.1, letterSpacing: '-.015em', color: C.text, textShadow: '0 4px 30px #000a' }}>
    {text.split(' ').map((word, i) => {
      const t = out(frame - 4 - (whole ? 0 : i * 2.5), 0, 9);
      const brand = word.startsWith('GENESIS');
      return <span key={i} style={{ display: 'inline-block', marginRight: '.25em', opacity: t, transform: `translateY(${(1 - t) * 26}px)` }}>
        {brand ? <><span style={{ background: GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GENESIS</span>{word.slice(7)}</> : word}
      </span>;
    })}
  </div>;
}

/** Frames over which a caption fades out before the next one comes in. */
export const CROSS = 6;
/** The caption band at the scene's `frame`: a chapter chip and the caption, switching at the given frames. Every caption
 * comes in whole and fades in after the one before has faded out, so no caption stands half-built or over another.
 * `k` fades the words and `shade` the dark band behind them. */
export function CaptionBand({ chapter, captions, frame, k = 1, shade = 1 }: { chapter: string; captions: [number, string][]; frame: number; k?: number; shade?: number }) {
  const at = captions.reduce((last, [from], i) => frame >= from ? i : last, -1), next = captions[at + 1]?.[0];
  return <>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 330, opacity: shade, background: `linear-gradient(180deg, ${alpha(C.page, 0)} 0%, ${alpha(C.page, 0xcc / 255)} 45%, ${alpha(C.page, 0xf2 / 255)} 100%)` }} />
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 74, opacity: k }}>
      <div style={{ marginBottom: 18, fontFamily: 'Inter', fontWeight: 600, fontSize: 24, letterSpacing: '.18em', textTransform: 'uppercase', color: C.cyan }}>{chapter}</div>
      <div style={{ display: 'grid' }}>{at >= 0 && <div style={{ gridArea: '1 / 1', opacity: next === undefined ? 1 : 1 - Math.min(1, Math.max(0, (frame - next + CROSS) / CROSS)) }}>
        <Caption text={captions[at][1]} frame={frame - captions[at][0]} whole /></div>}</div>
    </div>
  </>;
}

/** Screen boxes of the colouring groups, from their members' part positions: one box per cluster of members that stand
 * within a part pitch of each other, so a group spread over the drawing is not one box over its neighbours. */
export function groupBoxes(drawing: Drawing, w: number, h: number) {
  const { k, dx, dy } = fit(drawing, w, h), NEAR = 240;
  return Object.entries(drawing.colouring).flatMap(([name, g], i) => {
    const parts = drawing.parts.filter(p => g.members.includes(p.label)), clusters: (typeof parts)[] = [];
    for (const p of parts) {
      const near = clusters.filter(c => c.some(q => Math.abs(q.x - p.x) <= NEAR && Math.abs(q.y - p.y) <= NEAR));
      clusters.splice(0, clusters.length, ...clusters.filter(c => !near.includes(c)), [...near.flat(), p]);
    }
    clusters.sort((a, b) => Math.min(...a.map(p => p.x)) - Math.min(...b.map(p => p.x)) || Math.min(...a.map(p => p.y)) - Math.min(...b.map(p => p.y)));
    return clusters.map((members, j) => {
      const xs = members.map(p => p.x * k + dx), ys = members.map(p => p.y * k + dy), pad = 46 * Math.max(k, .6);
      return { name, key: `${name}:${j}`, colour: BLOCK_COLOURS[i % BLOCK_COLOURS.length], x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad, cx: xs.reduce((a, b) => a + b) / xs.length, cy: ys.reduce((a, b) => a + b) / ys.length };
    });
  });
}

/** One spot per group for its name, on the box it is placed by, null on the group's other boxes: above or below
 * either end of one of its boxes, the first that covers no earlier name and no other group's box. */
export const boxLabels = <T extends { name: string; x0: number; y0: number; x1: number; y1: number }>(boxes: T[]) => {
  const placed: [number, number, number, number][] = [], H = 34, spots = boxes.map((): [number, number] | null => null);
  const hits = (x0: number, y0: number, x1: number, y1: number) => ([a, b, c, d]: number[]) => x1 > a && x0 < c && y1 > b && y0 < d;
  for (const name of [...new Set(boxes.map(b => b.name))]) {
    const own = boxes.map((b, i) => ({ b, i })).filter(({ b }) => b.name === name), w = name.length * 17.5;
    const others = boxes.filter(b => b.name !== name).map(b => [b.x0, b.y0, b.x1, b.y1]);
    const candidates = own.flatMap(({ b, i }) => ([[b.x0 + 4, b.y0 - 12], [b.x0 + 4, b.y1 + 36], [b.x1 - w - 4, b.y0 - 12], [b.x1 - w - 4, b.y1 + 36]] as [number, number][]).map(xy => ({ i, xy })));
    const fits = ({ xy: [x, y] }: { xy: [number, number] }) => !placed.some(hits(x, y - H, x + w, y)) && !others.some(hits(x, y - H, x + w, y));
    const pick = candidates.find(fits) ?? candidates.find(({ xy: [x, y] }) => !placed.some(hits(x, y - H, x + w, y))) ?? candidates[0];
    spots[pick.i] = pick.xy;
    placed.push([pick.xy[0], pick.xy[1] - H, pick.xy[0] + w, pick.xy[1]]);
  }
  return spots;
};

const KINDS: Record<string, [string, string]> = { port: ['port', 'ports'], nmos: ['transistor', 'transistors'], pmos: ['transistor', 'transistors'], inductor: ['inductor', 'inductors'],
  capacitor: ['capacitor', 'capacitors'], resistor: ['resistor', 'resistors'], vdc: ['DC source', 'DC sources'], line: ['line', 'lines'] };

type Layout = StagedLayout & { die: Box; stages: string[]; blocks: { name: string; box: Box }[]; members: { block: string; member: string; cell: string; box: Box }[] };

/** The schematic on the right and its components by kind on the left: as each kind is listed its parts take their
 * block's colour, so the schematic is grouped by the time the list ends. `draw` draws the schematic in (the film comes
 * in on it drawn); `inPanel` goes on the schematic's panel and `aside` under the list. */
export function SchematicView({ frame, drawing, layout, draw = 1, inPanel, aside }: { frame: number; drawing: Drawing; layout: Layout; draw?: number; inPanel?: ReactNode; aside?: ReactNode }) {
  const all = partColours(layout, drawing);
  const kinds = [...new Set(drawing.parts.map(p => p.kind))].filter(k => KINDS[k]);
  const step = 26, active = Math.floor((frame - 16) / step), lit = kinds[active];
  const listed = new Set(kinds.slice(0, active + 1)), colours = new Map([...all].filter(([label]) => listed.has(drawing.parts.find(p => p.label === label)!.kind)));
  return <>
    <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ position: 'absolute', left: 30, top: 70, right: 30, bottom: 30 }}>
        <svg width={CIRCUIT.width - 60} height={CIRCUIT.height - 100} style={{ position: 'absolute', overflow: 'visible' }}>
          {groupBoxes(drawing, CIRCUIT.width - 60, CIRCUIT.height - 100).map((g, i, every) => {
            const at = boxLabels(every)[i];
            const members = drawing.parts.filter(p => drawing.colouring[g.name].members.includes(p.label)), colour = all.get(members[0].label) ?? g.colour;
            const first = Math.min(...members.map(p => kinds.indexOf(p.kind)).filter(j => j >= 0)), k = out(frame, 16 + first * step, 28 + first * step);
            return <g key={g.key} opacity={k}>
              <rect x={g.x0} y={g.y0} width={g.x1 - g.x0} height={g.y1 - g.y0} rx={14} fill={colour} fillOpacity={.08} stroke={colour} strokeOpacity={.7} strokeWidth={2} strokeDasharray="8 6" />
              {at && <text x={at[0]} y={at[1]} fontFamily="Inter" fontWeight={700} fontSize={32} fill={colour} stroke={C.card} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{g.name.replace(/_/g, ' ')}</text>}
            </g>;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0 }}><Schematic drawing={drawing} width={CIRCUIT.width - 60} height={CIRCUIT.height - 100} t={draw} tint={active >= 0 ? 1 : 0} colours={colours} labels={false} /></div>
      </div>
      {inPanel}
    </div>
    {aside}
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 30, width: PANEL.width, fontFamily: 'Inter' }}>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 20, opacity: out(frame, 6, 16) }}>Components</div>
      {kinds.map((kind, i) => {
        const parts = drawing.parts.filter(p => p.kind === kind), n = parts.length, on = kind === lit, k = out(frame, 10 + i * step, 22 + i * step);
        const dots = [...new Set(parts.map(p => all.get(p.label)!))];
        return <div key={kind} style={{ opacity: k, display: 'flex', alignItems: 'baseline', gap: 18, padding: '10px 20px', marginBottom: 8, borderRadius: 14,
          background: on ? P.active : 'transparent', border: `1px solid ${on ? alpha(B.brand1, 0x66 / 255) : 'transparent'}` }}>
          <span style={{ width: 60, textAlign: 'right', fontSize: 40, fontWeight: 700, color: on ? C.cyan : C.text }}>{n}</span>
          <span style={{ fontSize: 34, color: on ? C.text : C.muted }}>{KINDS[kind][n === 1 ? 0 : 1]}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignSelf: 'center' }}>{dots.map(c => <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}</span>
        </div>;
      })}
    </div>
  </>;
}

/** The schematic's block groups, then the layout's blocks as one symbolic floorplan: glyph cards with the pads at their
 * places on the die, joined by the RF lines and the DC nets. Each group's box flies to its block's card. */
export function BlocksView({ frame, drawing, layout, links }: { frame: number; drawing: Drawing; layout: Layout; links: BlockLinks }) {
  const colours = partColours(layout, drawing), away = ease(frame, 20, 40);
  const chip = chipColours(layout);
  const sw = CIRCUIT.width - 60, sh = CIRCUIT.height - 100, ox = CIRCUIT.left + 30, oy = CIRCUIT.top + 70;
  // Card boxes on screen: the block view stands pushed in (push(1)), so a card point p shows at to + (p - from) * scale.
  const onScreen = ([x, y]: [number, number]) => [PUSH.to[0] + (x - PUSH.from[0]) * PUSH.scale, PUSH.to[1] + (y - PUSH.from[1]) * PUSH.scale];
  const cards = cardBoxes(layout, BENCH.x, BENCH.y, BENCH.w, BENCH.h, links);
  const groups = groupBoxes(drawing, sw, sh).map(g => {
    const first = drawing.parts.find(p => drawing.colouring[g.name].members.includes(p.label))!;
    const block = blockOfPart(layout, first.label, first.kind), card = cards.find(c => block && c.blocks.includes(block));
    const [x0, y0] = card ? onScreen([card.x, card.y]) : [0, 0], [x1, y1] = card ? onScreen([card.x + card.w, card.y + card.h]) : [0, 0];
    return { ...g, colour: colours.get(first.label) ?? g.colour, card: card && { x0, y0, x1, y1 } };
  });
  return <>
    <div style={{ position: 'absolute', ...CIRCUIT, borderRadius: 22, background: C.surface, border: `1px solid ${C.border}`, opacity: 1 - away }}>
      <div style={{ position: 'absolute', left: 30, top: 70, width: sw, height: sh }}>
        <Schematic drawing={drawing} width={sw} height={sh} t={1} tint={1} colours={colours} labels={false} />
      </div>
    </div>
    {/* The block view fills the frame: each card's name is its label, so no list beside it. */}
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: push(1) }}>
      <BlockView layout={layout} links={links} colours={chip} frame={frame} x={BENCH.x} y={BENCH.y} w={BENCH.w} h={BENCH.h} start={40} />
    </div>
    {/* Each group's box, then its flight to its block's card; boxes bound for one card merge into it. */}
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {groups.map((g, i, all) => {
        const k = 1, at = boxLabels(all)[i], fly = g.card ? ease(frame, 20 + i * 2, 46 + i * 2) : 0, land = g.card ? out(frame, 74, 90) : away;
        const lerp = (a: number, b: number) => a + (b - a) * fly;
        const x0 = lerp(ox + g.x0, g.card?.x0 ?? 0), y0 = lerp(oy + g.y0, g.card?.y0 ?? 0), x1 = lerp(ox + g.x1, g.card?.x1 ?? 0), y1 = lerp(oy + g.y1, g.card?.y1 ?? 0);
        return <g key={g.key} opacity={k * (1 - land)}>
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={14} fill={g.colour} fillOpacity={.08 + .14 * fly} stroke={g.colour} strokeOpacity={.7 + .3 * fly} strokeWidth={2 + 1.5 * fly} strokeDasharray={fly > .5 ? undefined : '8 6'} />
          {at && <text x={ox + at[0]} y={oy + at[1]} opacity={1 - out(frame, 16 + i * 2, 26 + i * 2)} fontFamily="Inter" fontWeight={700} fontSize={32} fill={g.colour} stroke={C.card} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">{g.name.replace(/_/g, ' ')}</text>}
        </g>;
      })}
    </svg>
  </>;
}

/** The layout's box on the right of the stage. */
export const chipFrame = (layout: { die: Box }) => {
  const [x0, y0, x1, y1] = layout.die, w = Math.min(CIRCUIT.width, CIRCUIT.height * (x1 - x0) / (y1 - y0)), h = w * (y1 - y0) / (x1 - x0);
  return layoutFrame(layout, CIRCUIT.left + (CIRCUIT.width - w) / 2, CIRCUIT.top + (CIRCUIT.height - h) / 2, h);
};

type Picture = { src: (key: string) => string | null; Image?: ComponentType<{ src: string; style: CSSProperties }> | 'img' };
/** The block view turns into the layout: each card becomes its block's drawn layout at the card's own size and travels
 * to the block's place, one block after another, then the floorplanner's stages draw in their order, listed on the
 * left. The camera pushes in on `zoomBlock` while its lines are drawn; `glyph` draws members on the cards. */
export function LayoutView({ frame, layout, links, src, Image, zoomBlock, glyph }: Picture & { frame: number; layout: Layout; links: BlockLinks; zoomBlock?: string;
  glyph?: (member: string, x: number, y: number, s: number, vertical: boolean) => ReactNode | undefined }) {
  const f = chipFrame(layout), chip = chipColours(layout);
  const flights = blockFlights(layout, f, cardBoxes(layout, BENCH.x, BENCH.y, BENCH.w, BENCH.h, links), frame);
  const blocks = 1 - ease(frame, 16, 30);
  const core = layout.blocks.find(b => b.name === zoomBlock)?.box;
  const zoom = core ? ease(frame, 176, 204) * (1 - ease(frame, 250, 282)) : 0;
  const zx = core ? f.px((core[0] + core[2]) / 2) : f.width / 2, zy = core ? f.py((core[1] + core[3]) / 2) : f.height / 2, scale = 1 + 3.2 * zoom;
  const step = (stage: string) => PART_OF[stage] ?? stage, active = layout.stages.filter(stage => frame >= STAGE_AT[stage][0]).map(step).pop();
  const ends = (stage: string) => Math.max(...layout.stages.filter(s => step(s) === stage).map(s => STAGE_AT[s][1]));
  return <>
    <div style={{ position: 'absolute', inset: 0, opacity: blocks }}>
      <BlockView layout={layout} links={links} colours={chip} frame={frame} start={-200} {...BENCH} glyph={glyph} />
    </div>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, borderRadius: 10, overflow: frame < 150 ? 'visible' : 'hidden',
      boxShadow: `0 0 0 1px ${alpha(C.border, out(frame, 40, 70))}` }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${zx}px ${zy}px`, transform: `translate(${(f.width / 2 - zx) * zoom}px, ${(f.height / 2 - zy) * zoom}px) scale(${scale})` }}>
        <LayoutStages layout={layout} src={src} Image={Image} frame={frame} staged blocks={<FlyingBlocks flights={flights} src={src} Image={Image} opacity={out(frame, 16, 30)} />} />
      </div>
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 40, width: PANEL.width, fontFamily: 'Inter', opacity: out(frame, 70, 96) }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 18 }}>Floorplanner stages</div>
      {layout.stages.filter(stage => !PART_OF[stage]).map(stage => {
        const on = stage === active, done = frame >= ends(stage);
        return <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', marginBottom: 8, borderRadius: 14,
          background: on ? P.active : 'transparent', border: `1px solid ${on ? alpha(B.brand1, 0x66 / 255) : 'transparent'}`, fontSize: 32, fontWeight: on ? 700 : 500, color: on || done ? C.text : C.muted }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: done ? C.cyan : on ? GRADIENT : alpha(P.glow, 0x22 / 255) }} />{STAGES[stage] ?? stage}
        </div>;
      })}
    </div>
  </>;
}

/** Each scene's length in frames, as the film plays it. */
export const SCENE_FRAMES = { schematic: 195, blocks: 159, layout: 450 } as const;
