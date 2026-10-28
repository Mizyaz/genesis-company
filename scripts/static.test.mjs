import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { ABSOLUTE_PATH, privatePattern } from './leak-guard.mjs';

const root = resolve(import.meta.dirname, '..');
// The private words (the server's user, host, path roots) come from the untracked .leak-words; without it, as on CI, only
// the generic patterns run.
const PRIVATE = privatePattern() ?? /(?!)/;
const read = path => readFileSync(resolve(root, path), 'utf8');
const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
test('the supplied Scholar profile is used', () => {
  const person = JSON.parse(read('src/content/site.json')).about.people.find(p => p.id === 'islam-guven');
  assert.equal(new URL(person.scholar).searchParams.get('user'), 'p_KOMQwAAAAJ');

});

test('one page: Explore leads with the product and the membership, our story is told in its About section', () => {
  const explore = read('src/pages/Explore.tsx');
  assert.match(explore, /<Membership content=\{site.membership\} email=\{site.brand.email\}( brief)? \/>/);
  // The team is the About section, after the designs; the old About page's links land there.
  assert.match(explore, /<section id="about" className="content-section about-section"/);
  assert.match(read('src/PublicApp.tsx'), /'#\/about': '#\/explore\/about'/);
  assert.match(read('src/styles/site.css'), /\.company-hero-inner \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/); // Wide text never widens the page.
  assert.match(read('src/pages/Explore.tsx'), /\bhome\.headline/); assert.match(read('src/content/site.json'), /Automated and non-intuitive RFIC design/);
  // No page copy calls itself an illustration.
  for (const path of ['src/content/site.json', 'src/shared/CoDesignDiagram.tsx']) assert.doesNotMatch(read(path), /illustrat/i, path);
  // Contact actions share one component and never a text link.
  for (const path of ['src/pages/Explore.tsx']) {
    assert.match(read(path), /<ActionLink [^>]*icon="mail"/);
    assert.doesNotMatch(read(path), /className="text-link services-contact"/);
  }
  assert.match(read('src/shared/ui.tsx'), /export function ActionLink/);
  assert.match(read('src/styles/site.css'), /background: var\(--button-fill\)/);
});
test('on phones rows of cards scroll sideways, sections are named not numbered, and a live wire shows how far the page is read', () => {
  // Sections: an eyebrow and a title, no numbers; numbers stay for real sequences (the platform steps).
  assert.match(read('src/shared/ui.tsx'), /export function SectionHeading\(\{ eyebrow, children \}/);
  for (const path of walk('src').filter(path => path.endsWith('.tsx'))) assert.doesNotMatch(read(path), /<SectionHeading number=/, path);
  assert.doesNotMatch(read('src/shared/PortfolioCard.tsx'), /item\.number/);
  // Swipe rows: each with its dots, only below 700 px; the row reaches the screen edges and snaps card by card.
  const rows = { 'src/shared/Membership.tsx': 'tiers', 'src/pages/Explore.tsx': 'designs' };
  for (const [path, ref] of Object.entries(rows)) {
    assert.match(read(path), /className="[^"]*swipe-row"/, path);
    assert.match(read(path), new RegExp(`<SwipeDots [^>]*row=\\{${ref}\\}`), path);
  }
  const css = read('src/styles/site.css');
  assert.match(css, /\.swipe-dots \{ display: none; \}/);
  const phone = css.slice(css.indexOf('@media (max-width: 700px)'));
  assert.match(phone, /\.content-section \.swipe-row \{ display: flex; gap: 12px; max-width: none; margin-inline: -24px; padding: 4px 24px 12px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory;/);
  assert.match(phone, /\.content-section \.swipe-row > \* \{ flex: 0 0 var\(--swipe-card, 84%\); min-width: 0; scroll-snap-align: start; \}/);
  const dots = read('src/shared/SwipeDots.tsx');
  assert.match(dots, /aria-hidden="true"/);
  assert.match(dots, /tabIndex=\{-1\}/);
  assert.match(dots, /\{ passive: true \}/);
  // The wire: in the shell of every page, decorative, measured once a frame, still when motion is stopped or reduced.
  assert.match(read('src/shared/SiteShell.tsx'), /<ScrollCurrent \/>/);
  const wire = read('src/shared/ScrollCurrent.tsx'), wireCss = read('src/styles/scroll-current.css');
  assert.match(wire, /aria-hidden="true"/);
  assert.match(wire, /requestAnimationFrame\(measure\)/);
  assert.match(wire, /new ResizeObserver\(request\)/);
  assert.match(wireCss, /\.scroll-current \{ --progress: 0; position: fixed; z-index: 40;/);
  assert.match(wireCss, /clip-path: inset\(-8px calc\(\(1 - var\(--progress\)\) \* 100%\) -8px 0\)/);
  assert.match(wireCss, /\.scroll-current\[data-motion="off"\] \*/);
  assert.match(wireCss, /prefers-reduced-motion: reduce/);
});

test('Explore follows the film: the claims, the designs, the flow, the co-design and the 3D view, then what we offer', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const page = read('src/pages/Explore.tsx');
  const order = ['<section className="company-hero"', '<section id="claims"', '<section id="portfolio"', '<section id="flow"', '<section id="methods"', '<section id="chip3d"', '<Membership ', '<Partnership ', '<section id="about"', '<section id="research"', '<section id="contact"'].map(marker => page.indexOf(marker));
  assert.ok(order.every((position, i) => position >= 0 && (i === 0 || position > order[i - 1])), `section order ${order}`);
  assert.match(page, /href="#\/explore\/membership"/); // The hero leads to what we offer.
  assert.match(page, /\{home\.join\}/);
  assert.match(page, /<TeamProfiles people=\{site.about.people\} \/>/); // About us is a section of the one page.
  assert.match(read('src/PublicApp.tsx'), /'flow', 'claims', 'methods', 'chip3d', 'non-intuitive', 'research', 'about', 'membership', 'partnership', 'portfolio'/);
  assert.match(read('src/styles/site.css'), /font-size: clamp\(2.35rem, 9.5vw, 4rem\)/);
  // Few words: no eyebrows, no section intros, no story paragraphs.
  assert.doesNotMatch(page, /eyebrow=|site\.story|home\.\w+\.intro/);
  // The hero's key words lead to the co-design diagram and to the designs.
  assert.match(page, /linked\(home\.headline, home\.links\)/);
  assert.equal(content.home.links.Automated.href, '#/explore/methods');
  assert.equal(content.home.links['non-intuitive'].href, '#/explore/portfolio');
  // The co-design is one block diagram of six steps, drawn live with the run's numbers: no film scene, no video.
  assert.deepEqual(content.home.methods.steps.map(step => step.id), ['spec', 'sizing', 'passives', 'simulate', 'objective', 'layout']);
  assert.match(page, /<CoDesignDiagram steps=\{home\.methods\.steps/);
  const diagram = read('src/shared/CoDesignDiagram.tsx');
  assert.doesNotMatch(diagram, /StoryPlayer|<video|\.mp4|optimization\.json/);
  assert.match(diagram, /onPointerEnter=.*onFocus=.*onClick=/s);
  assert.ok(!existsSync('src/shared/CoDesign.tsx') && !existsSync('src/shared/ScrollJourney.tsx') && !existsSync('src/shared/StoryStage.tsx'), 'the film-scene sections are gone');
  assert.doesNotMatch(page, /StoryStage|ScrollJourney|StoryPlayer/);
  // The film is served from the site and opens full width from the hero; nothing external.
  assert.ok(!existsSync('src/shared/FilmClip.tsx') && !existsSync('src/shared/ProductFilm.tsx') && !existsSync('public/assets/films'), 'one film player only');
  assert.match(page, /<FilmPlayer content=\{home\.film\} \/>/);
  assert.ok(existsSync('public/assets/film/genesis-story.mp4') && existsSync('public/assets/film/genesis-story-poster.jpg'), 'the film and its poster are served from the site');
  assert.doesNotMatch(read('src/shared/FilmPlayer.tsx'), /youtube|vimeo|https?:/i);
  for (const name of ['analysis', 'optimization', 'validation', 'ask']) for (const pattern of [ABSOLUTE_PATH, PRIVATE, /sha256|final/i]) assert.doesNotMatch(read(`src/content/story/${name}.json`), pattern, name);
  for (const { file } of JSON.parse(read('src/content/story/optimization.json')).frames) assert.ok(existsSync(`public/${file}`), file);
  for (const name of ['motion', 'codesign']) for (const pattern of [ABSOLUTE_PATH, PRIVATE, /sha256|spdt|final/i]) assert.doesNotMatch(read(`src/content/story/${name}.json`), pattern, name);
  const flow = read('src/content/story/flow.json');
  for (const pattern of [ABSOLUTE_PATH, PRIVATE, /sha256|spdt|final/i]) assert.doesNotMatch(flow, pattern);
  for (const file of Object.values(JSON.parse(flow).layout.files)) assert.ok(existsSync(`public/${file}`), file);
  assert.doesNotMatch(page, /hero-index|Reason\. Simulate\. Learn\. Refine\./);
  // The mixer leads the designs. No card claims silicon: no tape-out or measurement record backs it. Foundries and partner
  // companies are under NDA: no company name is published.
  assert.deepEqual(content.portfolio.map(item => item.id), ['mixer', 'spdt', 'divider']);
  assert.ok(content.portfolio.every(item => !('fabricated' in item)));
  assert.doesNotMatch(read('src/content/site.json'), /GlobalFoundries|STMicro|foundry"/i);
  // Nor do the film's recorder scripts and the exported story data name a foundry or its technology.
  const recorded = ['video/record', 'src/content/story'].flatMap(dir => readdirSync(dir).filter(f => /\.(json|mjs)$/.test(f)).map(f => `${dir}/${f}`));
  for (const file of recorded) assert.doesNotMatch(read(file), /GF\s?-?\d*\s?FDX|\d+\s?FDX|GlobalFoundries|TSMC|STMicro|\bIHP\b|Infineon|CBIC/i, file);
  // The layers, ground tiles and pictures go by generic names: the stack's own names spell out a foundry.
  for (const name of ['flow', 'validation', 'optimization']) assert.doesNotMatch(read(`src/content/story/${name}.json`), /GTile|"(?:RX|PC|JA|QA|QB|LB)"|layer_(?!metal_\d\d)|coil_/, name);
  assert.deepEqual(readdirSync('public/assets/story').filter(f => /^(?:layer|coil)_(?!metal_\d\d\.png)/.test(f)), []);
  // The film's scripts and the README hold no local path, run name or tool vendor.
  const scripts = ['README.md', 'video/render.mjs', 'video/record.mjs', 'video/record/scenes.mjs', ...readdirSync('video/story').map(f => `video/story/${f}`)];
  for (const file of scripts) for (const pattern of [PRIVATE, /spdt_\w|run_r\d|Calibre|Virtuoso|Spectre/i]) assert.doesNotMatch(read(file), pattern, file);
  // The SPDT shows its two current versions, pixelated and traditional; no passive is called a coil.
  assert.deepEqual(content.portfolio.find(item => item.id === 'spdt').images.map(image => image.label), ['Pixelated', 'Traditional']);
  assert.doesNotMatch(read('src/content/site.json'), /\bcoils?\b|EM-searched|pixel-searched/i);
  // No tool vendor is named on the site.
  assert.doesNotMatch(read('src/content/site.json'), /Calibre|Cadence|Spectre|Virtuoso|signoff|sign-off/i);
  assert.doesNotMatch(read('src/shared/PortfolioCard.tsx'), /fabricated|silicon/i);
});

test('the membership offers a free demo and three tiers with their own symbols; questions are folded until opened', () => {
  const {membership} = JSON.parse(read('src/content/site.json'));
  const {tiers, faq} = membership;
  assert.deepEqual(tiers.map(tier => tier.id), ['demo', 'pro', 'enterprise']);
  assert.equal(new Set(tiers.map(tier => tier.icon)).size, tiers.length, 'each tier has its own symbol');
  assert.ok(tiers.every(tier => tier.icon !== 'play'), 'no symbol looks like a video you could play');
  assert.doesNotMatch(read('src/shared/Membership.tsx'), /'play'/);
  for (const tier of tiers) assert.ok(tier.title && tier.label && tier.pitch && tier.action && tier.features.length >= 3, tier.id);
  assert.equal(tiers[0].label, 'Free');
  assert.match(tiers[0].features.join(' '), /free live demo sessions/i);
  assert.match(tiers[2].features[0], /Everything in Pro/);
  // No fixed term is promised on the page.
  assert.doesNotMatch(JSON.stringify(membership), /one year|annual|yearly/i);
  assert.ok(faq.items.length >= 4);
  for (const item of faq.items) {
    assert.match(item.question, /\?$/);
    assert.ok(item.answer.length > 40, item.question);
  }
  const answers = faq.items.map(item => item.answer).join('\n');
  assert.match(answers, /^Per user\./m);
  assert.match(answers, /software access, not a chip design/);
  assert.match(answers, /CAD and solver licenses.*PDK access.*compute/);
  assert.match(answers, /own Linux server/);
  assert.match(answers, /free demo session/);
  assert.doesNotMatch(JSON.stringify({membership}), /€\s*\d|\d+\s*%|24\/7|unlimited|guaranteed|—/i);
  assert.doesNotMatch(JSON.stringify({membership}), /\bCLI\b|\bJSON\b|configurations and runners|subscription/i);
  const component = read('src/shared/Membership.tsx');
  assert.match(component, /id="membership"/);
  assert.match(component, /\bdata-tier=\{tier.id\}/);
  assert.match(component, /className="tier-symbol"/);
  assert.match(component, /mailto:\$\{email\}\?subject=\$\{encodeURIComponent\(`GENESIS \$\{tier.title\}`\)\}/);
  assert.ok(component.indexOf('membership-tiers') < component.indexOf('<ServiceFaq'), 'the tiers come before the questions');
  assert.doesNotMatch(component, /fetch\s*\(|setInterval|setTimeout|checkout|payment|DesignStory/);
  const css = read('src/styles/membership.css');
  for (const tier of tiers) assert.match(css, new RegExp(`data-tier="${tier.id}"\\] \\.tier-symbol`), tier.id);
  const faqComponent = read('src/shared/ServiceFaq.tsx');
  assert.match(faqComponent, /<details id="faq" className="service-faq">/); // The whole block is folded.
  assert.match(faqComponent, /<details key=\{item.question\} name=/); // Native disclosure, one answer at a time.
  assert.doesNotMatch(faqComponent, /\bopen\b|fetch\s*\(|setInterval|setTimeout/); // Closed until asked.
  assert.match(read('src/PublicApp.tsx'), /target instanceof HTMLDetailsElement\) target.open = true/); // A link to #/explore/faq opens it.
  for (const path of ['src/shared/SubscriptionOverview.tsx', 'src/styles/subscription-overview.css', 'src/shared/MembershipValue.tsx', 'src/styles/membership-value.css']) assert.equal(existsSync(resolve(root, path)), false, path);
  assert.doesNotMatch(read('src/styles/services.css'), /service-stages|service-stage|service-workspace/);
});

test('the header fits one row on phones: navigation and settings open from a menu button', () => {
  const shell = read('src/shared/SiteShell.tsx');
  assert.match(shell, /className="icon-button menu-toggle" type="button" aria-expanded=\{menuOpen\} aria-controls=\{navId\}/);
  assert.match(shell, /event.key === 'Escape'/);
  assert.match(shell, /addEventListener\('hashchange', close\)/);
  assert.match(shell, /href="#\/explore\/about"/);
  assert.match(shell, /href="#\/explore\/membership"/);
  const css = read('src/styles/site.css');
  assert.match(css, /\.site-header\[data-menu='open'\] nav \{ display: flex; \}/);
  assert.doesNotMatch(css, /\.site-header \{ flex-wrap: wrap; \}/);
});

test('the page opens as the film opens, once a visit, and never holds the page', () => {
  for (const path of ['src/shared/SiliconGate.tsx', 'src/styles/silicon-gate.css']) assert.equal(existsSync(resolve(root, path)), false, path);
  const html = read('index.html');
  assert.match(html, /<div id="root"><\/div>/);
  assert.doesNotMatch(html + read('src/shared/SiteShell.tsx') + read('src/shared/ImageViewer.tsx'), /boot-gate|SiliconGate|holdGate/);
  const css = read('src/styles/site.css');
  assert.match(css, /#main \{ animation: page-in/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ #main \{ animation: none; \} \}/);
  const intro = read('src/shared/SiteIntro.tsx');
  assert.match(intro, /<MarkDrawing t=\{time\}/);
  assert.match(intro, /prefers-reduced-motion: reduce/);
  assert.match(intro, /sessionStorage/);
  assert.match(intro, /'pointerdown', 'keydown', 'wheel', 'touchmove'/);
});

test('public source has no assistant, landing page or engineering service', () => {
  for (const path of ['src/App.tsx', 'src/main.tsx', 'src/pages/Landing.tsx', 'src/pages/ProductLaunch.tsx', 'src/pages/About.tsx', 'src/pages/Research.tsx', 'src/styles/welcome.css', 'src/assistant', 'server', '.env']) assert.equal(existsSync(resolve(root, path)), false, path);
  const content = JSON.parse(read('src/content/site.json'));
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'home', 'membership', 'partnership', 'portfolio', 'story'].sort());
  const source = walk('src').map(read).join('\n');
  assert.doesNotMatch(source, /localhost|127\.0\.0\.1|\/api\/|VITE_WORKBENCH_URL|codex exec|fetch\s*\(|new WebSocket/);
  assert.match(read('index.html'), /connect-src 'none'/);
  assert.match(read('vite.config.ts'), /base: '\.\/'/);
});

test('every published image is local and included', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const images = content.portfolio.flatMap(item => item.images);
  const paths = [...images.flatMap(image => [image.src, image.preview]), ...content.about.people.map(person => person.image)];
  for (const path of paths) {
    assert.match(path, /^\/assets\/[\w.-]+$/);
    assert.ok(existsSync(resolve(root, `public${path}`)), path);
  }
  // Cards load light previews; the viewer and Original links keep the unchanged source files.
  for (const image of images) {
    assert.match(image.preview, /\.webp$/, image.src);
    assert.ok(statSync(resolve(root, `public${image.preview}`)).size < statSync(resolve(root, `public${image.src}`)).size / 2, image.preview);
  }
  const card = read('index.html').match(/<meta property="og:image" content="https:\/\/[^"]+?(\/assets\/[\w.-]+)"/);
  assert.ok(card && existsSync(resolve(root, `public${card[1]}`)), 'og:image must be a bundled asset');
});

test('publication records are attributable, deduplicated and exclude preprints', () => {
  const people = JSON.parse(read('src/content/site.json')).about.people;
  const papers = JSON.parse(read('src/content/publications.json'));
  const authors = new Set(people.map(person => person.id));
  assert.equal(authors.size, people.length);
  for (const person of people) {
    assert.ok(person.name);
    assert.equal(new URL(person.scholar).hostname, 'scholar.google.com');
    assert.ok(new URL(person.scholar).searchParams.get('user'));
    assert.ok(papers.some(paper => paper.people.includes(person.id)));
  }
  assert.ok(papers.length > 0);
  assert.equal(new Set(papers.map(paper => paper.id)).size, papers.length);
  const dois = papers.map(paper => paper.doi.toLowerCase()).filter(Boolean);
  assert.equal(new Set(dois).size, dois.length);
  for (const paper of papers) {
    assert.ok(paper.title && paper.authors && paper.venue, paper.id);
    assert.ok(paper.people.length && paper.people.every(person => authors.has(person)), paper.id);
    assert.ok(['Journal', 'Conference'].includes(paper.type), paper.id);
    assert.ok(Number.isInteger(paper.year) && paper.year >= 1900 && paper.year <= new Date().getFullYear(), paper.id);
    assert.ok(paper.keywords.length && paper.keywords.every(keyword => typeof keyword === 'string' && keyword.trim()), paper.id);
    assert.ok(paper.summary === null || typeof paper.summary === 'string' && paper.summary.length > 40, paper.id);
    assert.equal(new URL(paper.source).protocol, 'https:', paper.id);
    assert.ok(paper.citation.authors.length && paper.citation.authors.every(author => author.includes(', ')), paper.id);
    assert.ok(paper.citation.venue, paper.id);
    if (paper.openAccess) {
      assert.equal(new URL(paper.openAccess.url).protocol, 'https:', paper.id);
      assert.ok(paper.openAccess.source && paper.openAccess.version && paper.openAccess.verifiedOn, paper.id);
    }
    if (paper.doi) assert.match(paper.doi, /^10\.\d{4,9}\/\S+$/, paper.id);
    assert.doesNotMatch(JSON.stringify(paper), /arxiv|10\.48550|—/i, paper.id);
  }
});

test('About us and research are sections of the one page; İslam Güven leads the team', () => {
  const page = read('src/pages/Explore.tsx'), app = read('src/PublicApp.tsx');
  assert.match(app, /'#\/publications': '#\/explore\/research'/);
  assert.match(page, /<Publications people=\{site.about.people\} papers=\{papers\} \/>/);
  assert.equal(JSON.parse(read('src/content/site.json')).about.people[0].id, 'islam-guven');
  // The research copy is plain and factual.
  assert.doesNotMatch(read('src/content/site.json'), /Published and shared|Ideas, tested|valuable research|Who are we\?/);
  const library = read('src/shared/Publications.tsx');
  assert.doesNotMatch(library, /<details|<summary|setOpen|window.location/);
  assert.match(library, /aria-controls="publication-reader"/);
  assert.match(library, /<PublicationActions key=\{selected.id\}/);
});

test('the old 3D and 2D introduction films are gone', () => {
  const source = walk('src').map(read).join('\n');
  assert.doesNotMatch(source, /ResearchFlight|FlightSymbol|takeRequestedPaper/);
  assert.equal(JSON.parse(read('package.json')).dependencies.three, undefined);
  for (const path of ['src/shared/intro', 'src/styles/company-intro.css', 'public/assets/films/genesis-3d-30s.mp4', 'public/assets/genesis-intro-score.mp3']) assert.equal(existsSync(resolve(root, path)), false, path);
});


test('one GENESIS mark in the brand colours: header, landing, tab icon and film read the same geometry and brand.json', () => {
  const brand = JSON.parse(read('src/content/brand.json'));
  for (const theme of ['dark', 'light']) assert.deepEqual(Object.keys(brand[theme]), ['brand1', 'brand2', 'brand3', 'brand4']);
  // The colours live only in brand.json: the tokens and the mark use the variables vite.config.ts sets from it.
  const config = read('vite.config.ts'), tokens = read('src/styles/tokens.css');
  assert.match(config, /brand\.json/); assert.match(config, /markSvg\(brand\.dark\)/);
  assert.match(tokens, /--cyan: var\(--brand-1\)/); assert.match(tokens, /--violet: var\(--brand-3\)/);
  for (const value of [...Object.values(brand.dark), ...Object.values(brand.light)]) assert.ok(!tokens.includes(value), value);
  assert.equal(existsSync(resolve(root, 'public/favicon.svg')), false);
  assert.match(read('src/shared/ui.tsx'), /<SmallMark \/>/);
  // The landing keeps its circuit picture; the mark draws itself in the header.
  assert.match(read('src/pages/Explore.tsx'), /company-hero-image/);
  assert.match(read('src/shared/story/landing.tsx'), /brand\.json/);
  // Less motion draws the mark at rest.
  assert.match(read('src/shared/GenesisMark.tsx'), /prefers-reduced-motion: reduce/);
});

test('the membership speaks for a general RFIC design system, and the home claims name no bands, companies or dates', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const { membership } = content;
  // General, not one application: front-ends and specialised circuits, with nothing that narrows it down.
  const general = [membership.headline, membership.headlineAccent];
  assert.match(membership.headlineAccent, /front-ends to specialised circuits/);
  assert.doesNotMatch(general.join(' '), /\d|GHz|radar|automotive|GlobalFoundries|STMicro|imec|IC-Link|MPW|partner/i);
  // The claims are only what a record backs: the layout time of the recorded flow, its DRC and LVS result and the run's
  // designs. No silicon claim (no tape-out or measurement record) and no technology claim (no technology scene).
  const page = read('src/pages/Explore.tsx');
  assert.match(page, /<section id="claims" className="claims-band"/);
  assert.deepEqual(content.home.claims.items.map(item => item.value), ['< 1 hour', 'DRC + LVS', '290']);
  assert.doesNotMatch(JSON.stringify(content.home), /silicon|fabricated|any PDK/i);
  // The home page speaks for general RFIC design automation: no single technique as a headline and no slogans.
  const home = content.home, headings = Object.values(home).flatMap(s => [s?.eyebrow, s?.headline, s?.accent]).filter(Boolean).join(' | ');
  assert.doesNotMatch(headings, /pixel|no one|same day|\bfast\b/i);
  assert.doesNotMatch(home.claims.items.map(i => `${i.value} ${i.title} ${i.detail}`).join(' '), /same day|\bfast\b/i);
});
test('production bundle has no local service client or assistant endpoint', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')), 'Run npm run build before npm test');
  const output = walk('dist').filter(path => /\.(js|css|html)$/.test(path)).map(read).join('\n');
  assert.doesNotMatch(output, /localhost|127\.0\.0\.1|\/api\/navigator|VITE_WORKBENCH_URL|codex exec|gpt-5\.6/);
  assert.match(read('dist/index.html'), /connect-src 'none'/);
  assert.doesNotMatch(read('dist/index.html'), /(?:src|href)="\/assets\//);
});

test('citation exports preserve authors, publication types and safe BibTeX fields', () => {
  const code = ts.transpileModule(read('src/shared/citations.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('exports', code)(exports);
  const { bibtex, citationText, publicationUrl } = exports;
  const papers = JSON.parse(read('src/content/publications.json'));
  for (const paper of papers) {
    const bib = bibtex(paper);
    assert.ok(bib.startsWith(paper.type === 'Journal' ? '@article{' : '@inproceedings{'), paper.id);
    assert.ok(bib.includes('year = {' + paper.year + '}'), paper.id);
    assert.match(bib, paper.type === 'Journal' ? /journal = \{/ : /booktitle = \{/, paper.id);
    assert.ok(citationText(paper).includes(paper.title));
    assert.ok(citationText(paper).endsWith(publicationUrl(paper)));
    assert.doesNotMatch(bib, /undefined|null|doi = \{\}/, paper.id);
    assert.equal(paper.citation.authors.length, paper.authors.split(/,\s*|\s+and\s+/).length, paper.id);
  }
  const survey = papers.find(paper => paper.id === 'ai-ic-survey-2025');
  assert.ok(bibtex(survey).includes('De Vleeschouwer, Christophe'));
  assert.ok(bibtex(survey).includes('167364--167389'));
  const special = bibtex({ ...survey, title: 'A&B_50% {RF} #1', doi: '' });
  assert.ok(special.includes('A\\&B\\_50\\% \\{RF\\} \\#1'));
  assert.ok(special.includes('url = {' + survey.source + '}'));
});

test('layout viewports stay inside original images and viewer is product-independent', () => {
  const content = JSON.parse(read('src/content/site.json'));
  for (const item of content.portfolio) for (const image of item.images) {
    const crop = image.viewport;
    if (crop) {
      assert.ok(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0);
      assert.ok(crop.x + crop.width <= image.width && crop.y + crop.height <= image.height);
    }
  }
  assert.doesNotMatch(read('src/shared/ImageViewer.tsx'), /from ['"].*(?:web\/|schematic|cadence|server)/i);
});

test('product links accept only a valid port and carry the selected theme', async () => {
  const code = ts.transpileModule(read('src/shared/productLink.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(createRequire(resolve(root, 'src/shared/productLink.ts')), exports);
  const { productLink } = exports;
  const { hostname } = JSON.parse(read('connection.json'));
  assert.equal(productLink('4300', 'light'), `http://${hostname}:4300/?theme=light`);
  assert.equal(productLink('65535', 'dark'), `http://${hostname}:65535/?theme=dark`);
  assert.equal(productLink(' 1 ', 'dark'), `http://${hostname}:1/?theme=dark`);
  for (const port of ['', '0', '65536', '-1', '4.3', '1e3', 'abc', 'https://example.test', 'javascript:alert(1)']) assert.equal(productLink(port, 'dark'), null, port);
});

test('the site shows the film\'s material as its own figures, with no embedded video', () => {
  for (const path of ['src/pages/Explore.tsx', 'src/shared/SiteShell.tsx', 'src/PublicApp.tsx']) assert.doesNotMatch(read(path), /product-film|<video/, path);
  assert.doesNotMatch(read('src/shared/story/StoryPlayer.tsx'), /<CaptionBand/);
});

test('the partnership sign-up offers three tracks and fills a mail to us, with no server', () => {
  const { partnership } = JSON.parse(read('src/content/site.json'));
  assert.equal(partnership.tracks.length, 3);
  const form = read('src/shared/Partnership.tsx');
  for (const field of ['name="name"', 'name="organization"', 'type="email"', 'name="message"']) assert.ok(form.includes(field), field);
  assert.match(form, /window\.location\.href = `mailto:\$\{email\}\?subject=/);
  assert.doesNotMatch(form, /fetch\s*\(|XMLHttpRequest/);
  assert.match(read('src/pages/Explore.tsx'), /<Partnership content=\{site.partnership\} email=\{site.brand.email\} \/>/);
  assert.match(read('src/styles/partnership.css'), /prefers-reduced-motion: reduce/);
});

test('the film and the site draw from one design and one set of scenes', () => {
  const design = JSON.parse(read('src/content/design.json'));
  assert.match(read('video/src/Brand.tsx'), /from '\.\.\/\.\.\/src\/shared\/story\/palette'/);
  assert.match(read('video/src/Story.tsx'), /from '\.\.\/\.\.\/src\/shared\/story\/scenes'/);
  assert.match(read('video/src/Story.tsx'), /const TRANSITION = DESIGN_TRANSITION;/);
  assert.match(read('vite.config.ts'), /--story-\$\{name\}/);
  assert.match(read('src/styles/tokens.css'), /--page: var\(--story-page\)/);
  assert.equal(design.motion.transition, 12);
  // Scene code lives once, in src/shared/story; the film keeps no copy.
  for (const moved of ['Schematic.tsx', 'BlockView.tsx']) assert.ok(!existsSync(resolve(root, 'video/src/story', moved)), moved);
  // The page draws the film's schematic with the film's own component.
  assert.match(read('src/shared/FlowMotion.tsx'), /from '\.\/story\/Schematic'/);
});

test('the passive step shows pixelated designs from our EM dataset, with no record paths or hashes', () => {
  const pixels = JSON.parse(read('src/content/story/pixels.json'));
  assert.ok(pixels.designs.length >= 12, `${pixels.designs.length} designs`);
  for (const design of pixels.designs) {
    assert.ok(design.grid.length === 12 && design.grid.every(row => /^[01]{12}$/.test(row)));
    const fill = design.grid.join('').split('1').length - 1;
    assert.ok(fill > 144 * .2 && fill < 144 * .6, `fill ${fill}`);
    for (const name of ['S21', 'S31']) assert.equal(design[name].length, pixels.ghz.length);
  }
  for (const pattern of [ABSOLUTE_PATH, PRIVATE, /[0-9a-f]{32}/i]) assert.doesNotMatch(read('src/content/story/pixels.json'), pattern);
  assert.match(read('src/shared/CoDesignDiagram.tsx'), /pixels on a random grid/);
});

// GENESIS_TOKENS names a GENESIS checkout (GENESIS_TOKENS_REF a ref in it, HEAD by default); without it the site builds
// from its copy.
const genesisTokens = process.env.GENESIS_TOKENS, genesisRef = process.env.GENESIS_TOKENS_REF || 'HEAD';
test('the film tokens copy matches the GENESIS design library', { skip: !genesisTokens || !existsSync(genesisTokens) ? 'GENESIS_TOKENS is not set or not found' : false }, async () => {
  const { staleTokens } = await import('./sync-film-tokens.mjs');
  const stale = staleTokens(genesisTokens, genesisRef);
  assert.deepEqual(stale, [], `src/content/film.json is stale in ${stale.join(', ')}: run node scripts/sync-film-tokens.mjs ${genesisTokens} --ref ${genesisRef}`);
});

test('the physical flow is one CSS motion drawn from the recorded chain, played on screen and paused off it', () => {
  const motion = JSON.parse(read('src/content/story/motion.json')), component = read('src/shared/FlowMotion.tsx');
  assert.ok(read('src/content/story/motion.json').length < 150_000, 'motion.json under 150 kB');
  assert.equal(motion.verify.drc_violations, 0);
  assert.equal(motion.verify.lvs, 'LVS_CORRECT');
  assert.ok(motion.blocks.length && motion.rf.length && motion.dc.length && motion.tiles.length && motion.fill.length);
  assert.equal((component.match(/\{ id: '/g) ?? []).length, 7, 'seven steps');
  // No video and no per-frame script: CSS keyframes, an observer that starts and pauses them.
  assert.doesNotMatch(component, /requestAnimationFrame|addEventListener\('scroll'|<video|setInterval/);
  assert.match(component, /IntersectionObserver/);
  assert.match(read('src/styles/flow-motion.css'), /\.flow-motion:not\(\.is-on\)[^{]*\{ animation-play-state: paused/);
});

test('the 3D view is a still poster until tapped; its layer pictures load only then', () => {
  const chip = read('src/shared/Chip3D.tsx');
  assert.match(chip, /lazy\(\(\) => import\('\.\/Layers3D'\)\)/);
  assert.match(chip, /\{on \? <Suspense/);
  assert.doesNotMatch(read('src/pages/Explore.tsx'), /Layers3D/);
  const sizes = readdirSync('public/assets/layers3d').map(f => statSync(`public/assets/layers3d/${f}`).size);
  assert.ok(sizes.reduce((a, b) => a + b, 0) < 200_000, 'poster and layers under 200 kB');
});

test('portfolio pictures show crisp at once: no filter or blend, no lazy fade, real sizes', () => {
  const card = read('src/shared/PortfolioCard.tsx'), css = read('src/styles/site.css');
  assert.doesNotMatch(css.match(/\.layout-media \{[^}]*\}/)[0], /filter|blend/);
  assert.doesNotMatch(card, /loading="lazy"/);
  assert.match(card, /<img className="layout-media"[^>]*width=\{image\.width\} height=\{image\.height\}/);
  assert.doesNotMatch(css, /will-rise/);
  assert.doesNotMatch(card, /SparamPlot/);
});
