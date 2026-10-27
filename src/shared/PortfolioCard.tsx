import { useId, useState } from 'react';
import { assetUrl, Icon } from './ui';
import { ImageViewer } from './ImageViewer';
import spdt from '../content/story/spdt.json';

type Curves = { S21: number[]; S31: number[]; S11: number[] };
const SPDT_CURVES = spdt.versions as Record<string, Curves>;
const TRACES = [
  { key: 'S21', label: 'S21 insertion loss', color: 'var(--cyan)' },
  { key: 'S31', label: 'S31 isolation', color: '#e0a030' },
  { key: 'S11', label: 'S11 match', color: '#c77dff' },
] as const;

/** S-parameters (dB) of one version over frequency: the plot takes the data's own range, shows a legend, and a
 * crosshair with the three values at the frequency under the pointer (or the arrow keys). */
function SparamPlot({ curves, version }: { curves: Curves; version: string }) {
  const ghz = spdt.ghz, W = 360, H = 210, L = 38, R = 10, T = 10, B = 28;
  const [hover, setHover] = useState<number | null>(null);
  const all = TRACES.flatMap(t => curves[t.key]);
  const step = 10, lo = Math.floor(Math.min(...all) / step) * step, hi = Math.ceil(Math.max(...all) / step) * step || step;
  const x = (f: number) => L + (f - ghz[0]) / (ghz[ghz.length - 1] - ghz[0]) * (W - L - R);
  const y = (v: number) => T + (hi - v) / (hi - lo) * (H - T - B);
  const index = hover ?? ghz.length - 1;
  const at = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect(), f = ghz[0] + ((event.clientX - box.left) / box.width * W - L) / (W - L - R) * (ghz[ghz.length - 1] - ghz[0]);
    setHover(Math.max(0, Math.min(ghz.length - 1, Math.round((f - ghz[0]) / (ghz[1] - ghz[0])))));
  };
  const yTicks = Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step), xTicks = [1, 20, 40, 60, 80, 100, 110];
  return <div className="sparam-plot">
    <ul className="sparam-legend" aria-label="Curves">{TRACES.map(t => <li key={t.key}><i style={{ background: t.color }} />{t.label}</li>)}</ul>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" tabIndex={0} aria-label={`${version} S-parameters in dB from 1 to 110 GHz. Move the pointer or use the arrow keys to read values.`}
      onPointerMove={at} onPointerDown={at} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
      onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setHover(Math.max(0, Math.min(ghz.length - 1, index + (e.key === 'ArrowRight' ? 1 : -1)))); } }}>
      {yTicks.map(v => <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text x={L - 5} y={y(v) + 3} textAnchor="end">{v}</text></g>)}
      {xTicks.map(f => <text key={f} x={x(f)} y={H - 12} textAnchor="middle">{f}</text>)}
      <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle">GHz</text><text x={4} y={T + 2} className="unit">dB</text>
      {TRACES.map(t => <polyline key={t.key} fill="none" stroke={t.color} strokeWidth="1.8" strokeLinejoin="round" points={curves[t.key].map((v, i) => `${x(ghz[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />)}
      {hover !== null && <g><line className="cross" x1={x(ghz[index])} x2={x(ghz[index])} y1={T} y2={H - B} />
        {TRACES.map(t => <circle key={t.key} cx={x(ghz[index])} cy={y(curves[t.key][index])} r="3.2" fill={t.color} />)}</g>}
    </svg>
    <p className="sparam-readout" aria-live="polite"><strong>{ghz[index]} GHz</strong>{TRACES.map(t => <span key={t.key}><i style={{ background: t.color }} />{t.key} {curves[t.key][index].toFixed(2)} dB</span>)}</p>
    <p className="sparam-note">Layout parasitics and EM included. Point or use the arrow keys to read values.</p>
  </div>;
}

type PortfolioItem = {
  id: string; title: string; kind: string; band: string; description: string; fabricated?: boolean;
  images: { src: string; preview?: string; alt: string; label: string; fit: string; width: number; height: number; viewport?: { x: number; y: number; width: number; height: number } }[];
};

/** Data-driven gallery: a block can have one layout or several detail views.
 * Cards show the light preview; the viewer and Original link load the unchanged source. */
export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const clipId = `layout-${useId().replace(/:/g, '')}`;
  const image = item.images[selected] || item.images[0];
  const imageUrl = assetUrl(image.src);
  const previewUrl = assetUrl(image.preview ?? image.src);
  const curves = item.id === 'spdt' ? SPDT_CURVES[image.label.toLowerCase()] : undefined;
  return <article className="portfolio-card">
    <div className="portfolio-top"><span className="eyebrow">{item.band}</span>
      {item.fabricated ? <span className="portfolio-silicon"><Icon name="chip" />Fabricated in silicon</span> : <Icon name="chip" />}</div>
    {item.images.length > 1 && <div className="layout-views" role="group" aria-label={`${item.title} version`}>
      {item.images.map((view, index) => <button key={view.src} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{view.label}</button>)}
    </div>}
    <div className="layout-image">
      <button type="button" className="layout-open" onClick={() => setViewing(true)} aria-label={`Inspect ${item.title}, ${image.label}`} aria-haspopup="dialog">
      {image.viewport ? <svg className="layout-media" viewBox={`${image.viewport.x} ${image.viewport.y} ${image.viewport.width} ${image.viewport.height}`} role="img" aria-label={image.alt}><defs><clipPath id={clipId}><rect {...image.viewport} /></clipPath></defs><image href={previewUrl} width={image.width} height={image.height} clipPath={`url(#${clipId})`} /></svg>
        : <img className="layout-media" src={previewUrl} alt={image.alt} loading="lazy" width={image.width} height={image.height} style={{ objectFit: image.fit === 'cover' ? 'cover' : 'contain' }} />}
      <span className="layout-inspect"><Icon name="diagonal" /> Explore layout</span></button>
      <a className="layout-original" href={imageUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open original ${item.title}, ${image.label}`}>Original <Icon name="diagonal" /></a>
    </div>
    {curves && <SparamPlot curves={curves} version={image.label} />}
    <div className="portfolio-copy"><p className="eyebrow">{item.kind}</p><h3>{item.title}</h3><p>{item.description}</p></div>
    {viewing && <ImageViewer src={imageUrl} alt={image.alt} title={item.title}
      viewport={image.viewport} mediaClassName="layout-preview"
      caption={`${image.label} · Source ${image.width} × ${image.height} px · Double-click to fit`}
      onClose={() => setViewing(false)} toolbar={<>
        {item.images.length > 1 && <div className="viewer-views" role="group" aria-label="Layout views">
          {item.images.map((view, index) => <button key={view.src} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{view.label}</button>)}
        </div>}
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">Original <Icon name="diagonal" /></a>
      </>} />}
  </article>;
}
