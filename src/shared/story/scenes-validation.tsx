import type { ComponentType, CSSProperties } from 'react';
import { chipFrame } from './scenes';
import { LayoutStages, type StagedLayout } from './LayoutStages';
import { ease, out } from './motion';
import { alpha, B, C, P } from './palette';
import { Schematic, type Drawing } from './Schematic';

// The film's validation, 3D and any-circuit scenes on its 1920 x 1080 stage, as functions of the scene's frame (the
// film's captions and fades stay around them, see scenes.tsx).

type Box = [number, number, number, number];
type Picture = { src: (key: string) => string | null; Image?: ComponentType<{ src: string; style: CSSProperties }> | 'img' };
/** The scenes' lengths in frames (the film's 4.5, 7 and 5.5 seconds). */
export const VALIDATION_FRAMES = { validation: 135, chip3d: 210, any: 165 } as const;
export const VALIDATION_CAPTIONS: Record<keyof typeof VALIDATION_FRAMES, { chapter: string; captions: [number, string][] }> = {
  validation: { chapter: 'Validation', captions: [[0, 'GENESIS validates your layout with DRC and LVS.']] },
  chip3d: { chapter: '3D', captions: [[0, 'GENESIS builds your layout in 3D.']] },
  any: { chapter: 'Any circuit', captions: [[0, 'GENESIS designs any circuit you want.']] },
};

/** What the validation scene shows of the checks' record: each check's status and the DRC's error count. */
export type ValidationRecord = { drc: boolean; lvs: boolean; drc_violations?: number; lvs_status?: string };

const quad = (x: number) => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
const span = (frame: number, from: number, to: number) => Math.min(1, Math.max(0, (frame - from) / (to - from)));
const PANEL = { left: 96, top: 40, width: 640 };

/** The layout with a scan across it, and the DRC and LVS results coming in beside it. */
export function ValidationView({ frame, layout, record, src, Image }: { frame: number; layout: StagedLayout & { die: Box }; record: ValidationRecord } & Picture) {
  const f = chipFrame(layout), scan = quad(span(frame, 8, 62));
  const checks = [
    ['DRC', record.drc, record.drc_violations === undefined ? 'clean' : `${record.drc_violations} errors`],
    ['LVS', record.lvs, record.lvs_status === 'LVS_CORRECT' ? 'correct' : 'clean'],
  ] as const;
  return <div style={{ position: 'absolute', inset: 0 }}>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, overflow: 'hidden', borderRadius: 10, boxShadow: `0 0 0 1px ${C.border}` }}>
      <LayoutStages layout={layout} src={src} Image={Image} frame={frame} staged={false} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan * 100}%`, width: 6, marginLeft: -3, opacity: scan < 1 ? 1 : 0, background: C.cyan, boxShadow: `0 0 40px 14px ${alpha(B.brand1, 0x88 / 255)}` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${scan * 100}%`, background: alpha(B.brand1, 0x0d / 255) }} />
    </div>
    <div style={{ position: 'absolute', left: PANEL.left, top: PANEL.top + 80, width: PANEL.width, display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter' }}>
      {checks.map(([name, ok, said], i) => {
        const k = out(frame, 50 + i * 10, 64 + i * 10);
        return <div key={name} style={{ opacity: k, transform: `scale(${.9 + .1 * k})`, transformOrigin: 'left', display: 'flex', alignItems: 'center', gap: 18, padding: '20px 26px', borderRadius: 18, background: C.surface, border: `1px solid ${alpha(ok ? P.green : P.pink, 0x66 / 255)}` }}>
          <span style={{ fontSize: 40, color: ok ? P.green : P.pink }}>{ok ? '✓' : '✗'}</span>
          <span style={{ fontSize: 34, fontWeight: 700, color: C.text }}>{name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 26, color: ok ? P.green : P.pink }}>{ok ? said : 'open'}</span>
        </div>;
      })}
    </div>
  </div>;
}

/** The layout's layers (`layer_<name>` pictures, bottom to top), lifted apart in z order and tilted into 3D. */
export function Chip3DView({ frame, die, layers, src, Image = 'img' }: { frame: number; die: Box; layers: { name: string }[] } & Picture) {
  const tilt = ease(frame, 4, 64), lift = ease(frame, 40, 130), spin = -14 * span(frame, 0, 210), c = chipFrame({ die });
  const shown = layers.filter(l => src(`layer_${l.name}`));
  // The tilted, lifted stack spreads wider and taller than the flat layout, so it starts smaller, centred above the band.
  const width = c.width * .74, height = c.height * .74, f = { left: 960 - width / 2, top: 420 - height / 2, width, height };
  return <div style={{ position: 'absolute', inset: 0, perspective: 3200 }}>
    <div style={{ position: 'absolute', left: f.left, top: f.top, width: f.width, height: f.height, transformStyle: 'preserve-3d',
      transform: `rotateX(${56 * tilt}deg) rotateZ(${(-28 + spin) * tilt}deg) scale(${1 - .12 * tilt})` }}>
      {shown.map((l, i) => <Image key={l.name} src={src(`layer_${l.name}`)!} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
        transform: `translateZ(${i * 22 * lift - (shown.length - 1) * 11 * lift}px)`, opacity: .93 }} />)}
    </div>
  </div>;
}

/** The recorded circuits, each drawn from its schematic in its own tile. */
export function AnyView({ frame, drawings }: { frame: number; drawings: Drawing[] }) {
  const gap = 24, top = 30, w = (1920 - 3 * gap) / 2, h = (1080 - 300 - top - gap) / 2;
  return <div style={{ position: 'absolute', inset: 0 }}>
    {drawings.map((d, i) => {
      const k = out(frame, i * 6, i * 6 + 16), left = gap + (i % 2) * (w + gap), tileTop = top + Math.floor(i / 2) * (h + gap);
      return <div key={d.id} style={{ position: 'absolute', left, top: tileTop, width: w, height: h, borderRadius: 18,
        background: C.surface, border: `1px solid ${C.border}`, opacity: k, transform: `scale(${.95 + .05 * k})`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 40, top: 56, width: w - 80, height: h - 80 }}>
          <Schematic drawing={d} width={w - 80} height={h - 80} t={span(frame, 10 + i * 6, 64 + i * 6)} labels={false} />
        </div>
        <div style={{ position: 'absolute', left: 16, top: 14, padding: '8px 16px', borderRadius: 999, background: alpha(C.page, 0xd9 / 255), border: `1px solid ${C.border}`, fontFamily: 'Inter', fontWeight: 650, fontSize: 30, color: C.text }}>{d.title}</div>
      </div>;
    })}
  </div>;
}
