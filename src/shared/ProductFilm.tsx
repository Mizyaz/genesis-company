import { useEffect, useRef } from 'react';
import { useLanguage } from './Language';
import { assetUrl, Icon } from './ui';
import '../styles/product-film.css';

const transcript = [
  'The AI-supported system builds your schematic.',
  'Optimizes sizing within the same design loop.',
  'Builds non-intuitive layouts for passive devices, all within one loop.',
  'Tiles devices into circuit blocks.',
  'Floorplans the chip. Place the circuit tiles and route the original connections.',
  '3D perspective. Extract parasitics. Check manufacturing rules and schematic agreement.',
  'GDS layout, a Cadence library with testbenches, and design results.',
  'For supported designs: layout within one hour, with DRC and LVS passed.',
  'Optimization under one day versus the usual prior one-week workflow.',
  'User-reported results. Timings depend on circuit, PDK and compute.',
  'GENESIS. Generative Silicon Intelligence Systems. RFIC design, on demand. From your specs to checked layout.',
];

/** A separate encoded film. The existing introduction and its renderer stay independent. */
export function ProductFilm() {
  const { t } = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    const pauseWhenHidden = () => { if (document.hidden) player.pause(); };
    const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) player.pause(); });
    visibility.observe(player);
    // Do not leave the supplemental soundtrack playing underneath the original introduction.
    const dialogs = new MutationObserver(() => { if (document.querySelector('dialog[open]')) player.pause(); });
    dialogs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { player.pause(); visibility.disconnect(); dialogs.disconnect(); document.removeEventListener('visibilitychange', pauseWhenHidden); };
  }, []);
  const movie = assetUrl('/assets/films/genesis-product-44s.mp4');
  return <section id="product-film" className="content-section product-film-section" aria-labelledby="product-film-title">
    <div className="product-film-heading">
      <div><p className="eyebrow">{t('PRODUCT FILM')} <span>0:44</span></p><h2 id="product-film-title">{t('RFIC design, on demand.')}</h2></div>
      <p id="product-film-description">{t('Follow a design from the first request through schematic, sizing, passive layouts and physical checks.')}</p>
    </div>
    <figure className="product-film-player">
      <video ref={video} controls playsInline preload="none" width="1280" height="720" poster={assetUrl('/assets/films/genesis-product-44s-poster.jpg')} aria-labelledby="product-film-title" aria-describedby="product-film-description product-film-note">
        <source src={movie} type="video/mp4" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-44s.en.vtt')} srcLang="en" label="English" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-44s.tr.vtt')} srcLang="tr" label="Türkçe" />
        <a href={movie}>{t('Download the product film')}</a>
      </video>
      <figcaption id="product-film-note">{t('Illustrated product workflow with original music. Performance timings are user-reported and depend on circuit, PDK and compute.')}</figcaption>
    </figure>
    <div className="product-film-actions"><a className="button button-secondary" href={movie} download="GENESIS-product-film-44s.mp4"><Icon name="down" />{t('Download the product film')}<span>MP4 · 5 MB</span></a></div>
    <details className="product-film-transcript"><summary>{t('Read the film transcript')}</summary>
      <p>{t('Original instrumental music accompanies the film. There is no spoken narration.')}</p>
      <p>{t('The opening shows a design request, a process-file upload and the send action.')}</p>
      <ol>{transcript.map(line => <li key={line}>{t(line)}</li>)}</ol>
    </details>
  </section>;
}
