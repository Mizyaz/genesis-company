import { useEffect, useRef } from 'react';
import { useLanguage } from './Language';
import { assetUrl, Icon } from './ui';
import '../styles/product-film.css';

/** The site's two films (video/ in this repo renders both): the product film recorded in the workbench, and the
 * 2D film that draws the same flow from saved records. Each has English and Turkish captions and a transcript. */
type Film = { id: string; asset: string; length: string; size: string; eyebrow: string; title: string; description: string; note: string; download: string; opening: string; transcript: string[] };

const films: Film[] = [
  {
    id: 'product-film', asset: 'genesis-product-79s', length: '1:19', size: '6 MB', eyebrow: 'PRODUCT FILM', title: 'RFIC design, on demand.',
    description: 'Recorded on the GENESIS site and workbench: a conversation that becomes a schematic, its blocks and analyses, the chip layout, its checks, its signal path and its 3D model, then four more circuits.',
    note: 'Screen recordings of GENESIS with original music. The conversations are live; the layout, checks, signal path and 3D model are saved records from earlier runs.',
    download: 'Download the product film',
    opening: 'The film opens on the GENESIS landing page: light from the top and the chat box.',
    transcript: [
      'Tell GENESIS what you want to design: “I want a broadband RF switch with low loss and high isolation.”',
      'GENESIS asks what your circuit needs: an SPDT, the series–shunt topology, and the band, DC to 110 GHz on GF22FDX.',
      'GENESIS proposes the schematic: 25 parts, proposed and not yet applied.',
      'GENESIS draws it on your PDK: the approved schematic opens in the workbench on GF22FDX.',
      'GENESIS turns it into blocks and a testbench: block groups and colours, then blocks and testbench regenerated.',
      'GENESIS sets up every analysis and bias state: S-parameters with Port 2 ON and with Port 3 ON.',
      'GENESIS optimizes toward your targets: the test matrix of circuit variants and operating states.',
      'GENESIS places, routes and tiles the layout: Placement, Routing, Tiling and Verify, each with its record.',
      'GENESIS checks it with Calibre DRC and LVS: LVS correct and 124 DRC markers listed by rule.',
      'GENESIS traces the signal path through your layout: from RF pad 1 of chip C1 along its saved MarkNet shapes, through L1 and the switch transistors to both outputs.',
      'GENESIS builds your chip in 3D: the floorplan flow writes a 3D model of chip C1, shown here as a time-lapse.',
      'GENESIS designs any circuit you want: an RF switch, a low-noise amplifier, a mixer and a power amplifier, each from its own recorded conversation.',
      'GENESIS. Whatever you want to design.',
    ],
  },
  {
    id: 'how-it-works-film', asset: 'genesis-story-87s', length: '1:27', size: '5 MB', eyebrow: 'HOW IT WORKS', title: 'From one sentence to a checked chip.',
    description: 'A 2D film of the GENESIS flow, drawn from saved records: a recorded conversation, the SPDT schematic and its blocks, the testbenches, S-parameter plots, the optimizer’s pixel, shape and transistor steps, the C1 chip layout stage by stage, its Calibre checks and its layers.',
    note: 'An illustration with original music. Every schematic, plot, layout layer and check result it shows is read from a GENESIS record.',
    download: 'Download the 2D film',
    opening: 'The film opens as the GENESIS symbol lights up under the landing page sunrise, then its name and the chat box.',
    transcript: [
      'Tell GENESIS what you want to design: “Design a broadband SPDT RF switch, DC to 110 GHz.”',
      'GENESIS asks what your circuit needs: series–shunt, series or distributed and tuned; series–shunt is chosen.',
      'GENESIS proposes the schematic: the GF22FDX series–shunt starting topology.',
      'GENESIS draws the schematic on your PDK: 25 parts and 29 wires, from left to right.',
      'GENESIS splits it into layout blocks: inductors, switch pairs, bias resistors and the input capacitor.',
      'Chip C1 in blocks: its RF pads, inductors, switch transistors, bias resistors and DC pads, joined by its RF lines and bias nets.',
      'GENESIS builds every testbench and measurement: DC and S-parameters, harmonic balance and transient, with their bias states and 26 measurements.',
      'GENESIS runs the analyses and plots every S-parameter: ON S21, ISO S31 and S11 of chip C1 with RF2 on, from PEX and from the EM window.',
      'GENESIS tunes coil pixels, coil shapes and transistor sizes: random pixels on a 12 × 12 grid for each of L1, L2 and L3, half-turn coils and 1.5-turn coils by diameter and width, and the width and fingers of M1 to M4.',
      'Each step is one recorded evaluation: 290 in the pixel run, 342 in the half-turn run and 488 in the 1.5-turn run, each with its goal error.',
      'GENESIS turns the blocks into a layout: the blocks of chip C1 move from the schematic to their places.',
      'GENESIS routes RF lines, drops and DC lines.',
      'GENESIS tiles the ground and fills density.',
      'GENESIS checks it with Calibre DRC and LVS: both clean for this layout.',
      'GENESIS builds your chip in 3D: the metal layers of chip C1, lifted apart.',
      'GENESIS designs any circuit you want: the schematics of an RF switch, a low-noise amplifier, a mixer and a power amplifier, each from its own recorded conversation.',
      'GENESIS. Whatever you want to design.',
    ],
  },
];

/** One film, loaded on demand; it pauses when it leaves the screen, the tab is hidden or a dialog opens over it. */
function FilmSection({ film }: { film: Film }) {
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
  const asset = (suffix: string) => assetUrl(`/assets/films/${film.asset}${suffix}`), movie = asset('.mp4');
  return <section id={film.id} className="content-section product-film-section" aria-labelledby={`${film.id}-title`}>
    <div className="product-film-heading">
      <div><p className="eyebrow">{t(film.eyebrow)} <span>{film.length}</span></p><h2 id={`${film.id}-title`}>{t(film.title)}</h2></div>
      <p id={`${film.id}-description`}>{t(film.description)}</p>
    </div>
    <figure className="product-film-player">
      <video ref={video} controls playsInline preload="none" width="1280" height="720" poster={asset('-poster.jpg')} aria-labelledby={`${film.id}-title`} aria-describedby={`${film.id}-description ${film.id}-note`}>
        <source src={movie} type="video/mp4" />
        <track kind="captions" src={asset('.en.vtt')} srcLang="en" label="English" />
        <track kind="captions" src={asset('.tr.vtt')} srcLang="tr" label="Türkçe" />
        <a href={movie}>{t(film.download)}</a>
      </video>
      <figcaption id={`${film.id}-note`}>{t(film.note)}</figcaption>
    </figure>
    <div className="product-film-actions"><a className="button button-secondary" href={movie} download={`GENESIS-${film.asset.replace('genesis-', '')}.mp4`}><Icon name="down" />{t(film.download)}<span>MP4 · {film.size}</span></a></div>
    <details className="product-film-transcript"><summary>{t('Read the film transcript')}</summary>
      <p>{t('Original instrumental music accompanies the film. There is no spoken narration.')}</p>
      <p>{t(film.opening)}</p>
      <ol>{film.transcript.map(line => <li key={line}>{t(line)}</li>)}</ol>
    </details>
  </section>;
}

export function ProductFilm() {
  return <>{films.map(film => <FilmSection film={film} key={film.id} />)}</>;
}
