import { useId, useState } from 'react';
import { assetUrl, Icon } from './ui';
import { ImageViewer } from './ImageViewer';
import spdt from '../content/story/spdt.json';

type Curves = { S21: number[]; S31: number[]; S11: number[] };
const SPDT_CURVES = spdt.versions as Record<string, Curves>;
/** One line per SPDT version: its simulated values at the band's top frequency (layout parasitics and EM included). */
function topLine(curves: Curves) {
  const i = spdt.ghz.length - 1, loss = (v: number) => (-v).toFixed(2);
  return `${spdt.ghz[i]} GHz: insertion loss ${loss(curves.S21[i])} dB · isolation ${loss(curves.S31[i])} dB · input match ${loss(curves.S11[i])} dB`;
}

type PortfolioItem = {
  id: string; title: string; kind: string; band?: string; description: string;
  images: { src: string; preview?: string; previewWidth?: number; alt: string; label: string; fit: string; width: number; height: number; viewport?: { x: number; y: number; width: number; height: number } }[];
};

/** Data-driven gallery: a block can have one layout or several detail views.
 * Cards show the picture at the screen's resolution at once; the viewer and Original link load the unchanged source. */
export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const clipId = `layout-${useId().replace(/:/g, '')}`;
  const image = item.images[selected] || item.images[0];
  const imageUrl = assetUrl(image.src);
  const previewUrl = assetUrl(image.preview ?? image.src);
  // A preview as large as the source stands in for it; a smaller one is offered for narrow screens.
  const sharp = image.previewWidth && image.previewWidth < image.width;
  const curves = item.id === 'spdt' ? SPDT_CURVES[image.label.toLowerCase()] : undefined;
  return <article className="portfolio-card">
    <div className="portfolio-top">{item.band && <span className="eyebrow">{item.band}</span>}<Icon name="chip" /></div>
    {item.images.length > 1 && <div className="layout-views" role="group" aria-label={`${item.title} version`}>
      {item.images.map((view, index) => <button key={view.src} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{view.label}</button>)}
    </div>}
    <div className="layout-image">
      <button type="button" className="layout-open" onClick={() => setViewing(true)} aria-label={`Explore layout of ${item.title}, ${image.label}`} aria-haspopup="dialog">
      {image.viewport ? <svg className="layout-media" viewBox={`${image.viewport.x} ${image.viewport.y} ${image.viewport.width} ${image.viewport.height}`} role="img" aria-label={image.alt}><defs><clipPath id={clipId}><rect {...image.viewport} /></clipPath></defs><image href={previewUrl} width={image.width} height={image.height} clipPath={`url(#${clipId})`} /></svg>
        : <img className="layout-media" src={sharp ? imageUrl : previewUrl} srcSet={sharp ? `${previewUrl} ${image.previewWidth}w, ${imageUrl} ${image.width}w` : undefined} sizes="(max-width: 720px) 92vw, 420px" alt={image.alt} decoding="async" width={image.width} height={image.height} style={{ objectFit: image.fit === 'cover' ? 'cover' : 'contain' }} />}
      <span className="layout-inspect"><Icon name="diagonal" /> Explore layout</span></button>
      <a className="layout-original" href={imageUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open original ${item.title}, ${image.label}`}>Original <Icon name="diagonal" /></a>
    </div>
    {curves && <p className="portfolio-numbers">{topLine(curves)}</p>}
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
