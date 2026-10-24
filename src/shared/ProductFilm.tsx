import { useEffect, useRef } from 'react';
import { useLanguage } from './Language';
import { assetUrl, Icon } from './ui';
import '../styles/product-film.css';

const transcript = [
  'Tell GENESIS what you want to design: “I want a broadband RF switch with low loss and high isolation.”',
  'GENESIS understands your flow: the Circuit Assistant reads the Maestro plan, one testbench with two bias states, port2_on and port3_on.',
  'GENESIS draws the schematic on your PDK: spdt_series_shunt_noC1 on GF22FDX, 24 parts and 27 wires.',
  'GENESIS turns it into blocks and a testbench: Input, Bias, Upper and Lower branch, joined by the nets they share.',
  'GENESIS sets up every analysis and bias state: S-parameters with Port 2 ON and with Port 3 ON.',
  'GENESIS optimizes toward your targets: a recorded CMA-ES run of 337 evaluations meets 16 of 18 targets.',
  'GENESIS places, routes and tiles the layout: Placement, Routing and Tiling, each with its saved layout capture.',
  'GENESIS checks it with Calibre DRC and LVS: LVS correct and 124 DRC markers, then the final layout at full size.',
  'GENESIS builds your chip in 3D: the floorplan flow writes a 3D model of chip C1, shown here as a time-lapse.',
  'GENESIS. Whatever you want to design.',
];

/** The encoded film of the real workbench, rendered from screen recordings (video/ in this repo). */
export function ProductFilm() {
  const { t } = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const player = video.current;
    if (!player) return;
    const pauseWhenHidden = () => { if (document.hidden) player.pause(); };
    const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) player.pause(); });
    visibility.observe(player);
    // A dialog opened over the page (an image viewer, a stage screen) pauses the film under it.
    const dialogs = new MutationObserver(() => { if (document.querySelector('dialog[open]')) player.pause(); });
    dialogs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { player.pause(); visibility.disconnect(); dialogs.disconnect(); document.removeEventListener('visibilitychange', pauseWhenHidden); };
  }, []);
  const movie = assetUrl('/assets/films/genesis-product-58s.mp4');
  return <section id="product-film" className="content-section product-film-section" aria-labelledby="product-film-title">
    <div className="product-film-heading">
      <div><p className="eyebrow">{t('PRODUCT FILM')} <span>0:58</span></p><h2 id="product-film-title">{t('RFIC design, on demand.')}</h2></div>
      <p id="product-film-description">{t('Recorded in the GENESIS workbench: the first request, the schematic and its blocks, the analysis, saved results, the chip layout and its 3D model.')}</p>
    </div>
    <figure className="product-film-player">
      <video ref={video} controls playsInline preload="none" width="1280" height="720" poster={assetUrl('/assets/films/genesis-product-58s-poster.jpg')} aria-labelledby="product-film-title" aria-describedby="product-film-description product-film-note">
        <source src={movie} type="video/mp4" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-58s.en.vtt')} srcLang="en" label="English" />
        <track kind="captions" src={assetUrl('/assets/films/genesis-product-58s.tr.vtt')} srcLang="tr" label="Türkçe" />
        <a href={movie}>{t('Download the product film')}</a>
      </video>
      <figcaption id="product-film-note">{t('Screen recordings of the GENESIS workbench with original music. Results and layouts shown are saved records from earlier runs.')}</figcaption>
    </figure>
    <div className="product-film-actions"><a className="button button-secondary" href={movie} download="GENESIS-product-film-58s.mp4"><Icon name="down" />{t('Download the product film')}<span>MP4 · 6 MB</span></a></div>
    <details className="product-film-transcript"><summary>{t('Read the film transcript')}</summary>
      <p>{t('Original instrumental music accompanies the film. There is no spoken narration.')}</p>
      <p>{t('The opening shows the GENESIS emblem.')}</p>
      <ol>{transcript.map(line => <li key={line}>{t(line)}</li>)}</ol>
    </details>
  </section>;
}
