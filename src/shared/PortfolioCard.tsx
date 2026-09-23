import { useId, useState } from 'react';
import { assetUrl, Icon } from './ui';

type PortfolioItem = {
  id: string; number: string; title: string; kind: string; band: string; description: string;
  images: { src: string; alt: string; label: string; fit: string; width: number; height: number; viewport?: { x: number; y: number; width: number; height: number } }[];
};

/** Data-driven gallery: a block can have one layout or several detail views. */
export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const [selected, setSelected] = useState(0);
  const clipId = `layout-${useId().replace(/:/g, '')}`;
  const image = item.images[selected] || item.images[0];
  const imageUrl = assetUrl(image.src);
  return <article className="portfolio-card">
    <div className="portfolio-top"><span className="eyebrow">{item.number} / {item.band}</span><Icon name="chip" /></div>
    <div className="layout-image">
      {image.viewport ? <svg className="layout-media" viewBox={`${image.viewport.x} ${image.viewport.y} ${image.viewport.width} ${image.viewport.height}`} role="img" aria-label={image.alt}><defs><clipPath id={clipId}><rect {...image.viewport} /></clipPath></defs><image href={imageUrl} width={image.width} height={image.height} clipPath={`url(#${clipId})`} /></svg>
        : <img className="layout-media" src={imageUrl} alt={image.alt} loading="lazy" width={image.width} height={image.height} style={{ objectFit: image.fit === 'cover' ? 'cover' : 'contain' }} />}
      <a className="layout-original" href={imageUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open original ${item.title}, ${image.label}`}>Original <Icon name="diagonal" /></a>
    </div>
    {item.images.length > 1 && <div className="layout-views" aria-label={`${item.title} views`}>
      {item.images.map((view, index) => <button key={view.src} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{view.label}</button>)}
    </div>}
    <div className="portfolio-copy"><p className="eyebrow">{item.kind}</p><h3>{item.title}</h3><p>{item.description}</p></div>
  </article>;
}
