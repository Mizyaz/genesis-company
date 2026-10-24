import { useEffect, useRef } from 'react';
import { useLanguage } from './Language';
import { assetUrl, Icon } from './ui';
import '../styles/product-film.css';

const transcript = [
  'Your prompt: “I want a broadband RF switch with low loss and high isolation.”',
  'Circuit Assistant: it reads the Maestro plan, one testbench “full” with two S-parameter tests, port2_on and port3_on.',
  'Schematic: spdt_series_shunt_noC1 on GF22FDX, FETs M1–M4 and coils L1–L3, 24 parts and 27 wires.',
  'Blocks: the DUT opens into Input and Upper branch, 5 blocks each: coils, RF pads, interconnects.',
  'Analyses & Variables: 2 S-parameter tests on testbench “full”, one per bias state, port2_on and port3_on.',
  'Optimize: S21 target ≥ −2 dB; CMA-ES ran 337 evaluations and 8 of 18 targets are met.',
  'Floorplan: the chip layout Cadence captured after the density stage.',
  'GENESIS. Whatever you want to design.',
];

/** A separate encoded film of the real workbench, rendered from screen recordings (video/ in this repo). The existing
 * introduction and its renderer stay independent. */
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
  const movie = assetUrl('/assets/films/genesis-product-60s.mp4');
  return <section id="product-film" className="content-section product-film-section" aria-labelledby="product-film-title">
    <div className="product-film-heading">
      <div><p className="eyebrow">{t('PRODUCT FILM')} <span>1:00</span></p><h2 id="product-film-title">{t('RFIC design, on demand.')}</h2></div>
      <p id="product-film-description">{t('Recorded in the GENESIS workbench: the first request, the schematic and its blocks, the analysis, saved results and the chip layout.')}</p>
    </div>
    <figure className="product-film-player">
      <video ref={video} controls playsInline preload="none" width="1280" height="720" poster={assetUrl('/assets/films/genesis-product-60s-poster.jpg')} aria-labelledby="product-film-title" aria-describedby="product-film-description product-film-note">
        <source src={movie} type="video/mp4" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-60s.en.vtt')} srcLang="en" label="English" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-60s.tr.vtt')} srcLang="tr" label="Türkçe" />
        <a href={movie}>{t('Download the product film')}</a>
      </video>
      <figcaption id="product-film-note">{t('Screen recordings of the GENESIS workbench with original music. Results and layouts shown are saved records from earlier runs.')}</figcaption>
    </figure>
    <div className="product-film-actions"><a className="button button-secondary" href={movie} download="GENESIS-product-film-60s.mp4"><Icon name="down" />{t('Download the product film')}<span>MP4 · 4 MB</span></a></div>
    <details className="product-film-transcript"><summary>{t('Read the film transcript')}</summary>
      <p>{t('Original instrumental music accompanies the film. There is no spoken narration.')}</p>
      <p>{t('The opening shows the GENESIS emblem.')}</p>
      <ol>{transcript.map(line => <li key={line}>{t(line)}</li>)}</ol>
    </details>
  </section>;
}
