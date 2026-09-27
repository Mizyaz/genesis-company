import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);

test('TR/ENG dictionary covers static labels, preserves technical identity and uses the supplied Scholar', () => {
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const identity = new Set(['GENESIS', 'Google Scholar', 'DOI', 'BibTeX', 'G / 01']);
  for (const path of walk('src').filter(path => path.endsWith('.tsx'))) {
    const parsed = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if (ts.isCallExpression(node) && node.expression.getText(parsed) === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const label = node.arguments[0].text;
        assert.ok(Object.hasOwn(dictionary, label) || identity.has(label), `${path}: ${label}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }
  for (const [english, turkish] of Object.entries(dictionary)) {
    assert.equal(typeof turkish, 'string');
    assert.doesNotMatch(turkish, /—/);
    assert.deepEqual([...english.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(), [...turkish.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort());
  }
  const code = ts.transpileModule(read('src/shared/Language.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {}, require = createRequire(import.meta.url);
  new Function('exports', 'require', code)(exports, id => id === '../content/tr.json' ? dictionary : require(id));
  assert.equal(exports.translate('Open GENESIS', 'tr'), 'GENESIS’i aç');
  assert.equal(exports.translate('Open GENESIS', 'en'), 'Open GENESIS');
  assert.equal(exports.translate('unknown label', 'tr'), 'unknown label');
  assert.equal(exports.translate('toString', 'tr'), 'toString');
  assert.equal(exports.translate('{name} on Scholar', 'tr', {name:'İslam Güven'}), 'İslam Güven · Scholar');
  const source = {id:'Design', title:'Design', href:'#/design', values:[12,{icon:'Research',detail:'Research'}]};
  assert.deepEqual(exports.translateContent(source, text => exports.translate(text,'tr')), {id:'Design',title:'Tasarla',href:'#/design',values:[12,{icon:'Research',detail:'Yayınlar'}]});
  assert.equal(source.title, 'Design');
  const person = JSON.parse(read('src/content/site.json')).about.people.find(p=>p.id==='islam-guven');
  assert.equal(new URL(person.scholar).searchParams.get('user'), 'p_KOMQwAAAAJ');
  assert.match(read('src/public.tsx'), /<LanguageProvider>/);
});

test('company diagrams share RF artwork instead of text cards and respect visible motion', () => {
  const artwork = read('src/shared/CircuitArtwork.tsx');
  const bridge = read('src/shared/DesignBridge.tsx');
  const loop = read('src/shared/DesignLoop.tsx');
  for (const kind of ['schematic', 'designer', 'engine', 'simulation']) assert.ok(artwork.includes(`kind === '${kind}'`));
  assert.match(artwork, /circuit-mos/);
  assert.match(artwork, /designer-person/);
  assert.match(artwork, /simulation-response/);
  assert.doesNotMatch(artwork, /kind === 'layout'/);
  assert.match(artwork, /circuit-radio/);
  const explore = read('src/pages/Explore.tsx');
  assert.equal((explore.match(/<DesignLoop /g) || []).length, 1);
  assert.match(explore, /className="story-narrative"/);
  assert.doesNotMatch(explore, /<DesignBridge /); // The subscription already explains designer / GENESIS / tools.
  assert.doesNotMatch(explore, /approach-section/);
  assert.match(explore, /id="team"/); // Existing approach links still reach the story illustration.
  for (const diagram of [bridge, loop]) {
    assert.match(diagram, /import \{ CircuitArtwork \}/);
    assert.match(diagram, /useVisibleMotion/);
    assert.match(diagram, /running=\{running\}/);
    assert.match(diagram, /className="sr-only"/);
    assert.doesNotMatch(diagram, /<article|<ul|bridge-actor|loop-node-icon/);
  }
  assert.match(read('src/styles/circuit-artwork.css'), /prefers-reduced-motion: reduce/);
  assert.match(read('src/styles/circuit-artwork.css'), /animation-play-state: running/);
  assert.doesNotMatch(artwork, /from .*?(?:web\/|assistant)|fetch\s*\(/);
});

test('story flow uses fixed circuits and selection, retaining visibility and theme controls', () => {
  const flow = read('src/shared/EnergyFlow.tsx');
  assert.doesNotMatch(flow, /ringPoint|const rings|ribbon|strand/);
  assert.match(flow, /const leftFeed: Point\[\]/);
  assert.match(flow, /const rightFeed: Point\[\]/);
  assert.match(flow, /const active = selected \? 1/);
  assert.match(flow, /IntersectionObserver/);
  assert.match(flow, /document\.hidden \|\| paused/);
  assert.match(flow, /attributeFilter: \['data-theme', 'style', 'class'\]/);
  assert.doesNotMatch(read('src/styles/site.css'), /\.design-loop-energy\s*\{\s*display:\s*none/);
});

test('welcome expansion is a responsive signature attached to the wordmark', () => {
  const welcome = read('src/pages/Welcome.tsx');
  assert.match(welcome, /className="welcome-identity"/);
  assert.match(welcome, /className="welcome-signature"/);
  assert.match(welcome, /Generative Evolution of Silicon Intelligent Systems/);
  assert.doesNotMatch(welcome, /welcome-tagline/);
  assert.match(read('src/styles/welcome.css'), /\.welcome-identity \{ flex-direction: column; align-items: flex-end/);
});

test('services precede the story, remain data-driven and have natural Turkish copy', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  assert.equal(content.services.items.length, 3);
  assert.deepEqual(content.services.items.map(item => item.id), ['platform-membership', 'silicon-demonstration', 'specialised-integration']);
  for (const copy of [content.services.eyebrow, content.services.title, content.services.intro, content.services.action, content.services.scopeLabel, ...content.services.items.flatMap(item => [item.label, item.title, item.headline, item.description, item.note, item.visualLabel, item.scopeLabel, item.action, ...(item.connections ?? []).map(connection => connection.label), ...item.features.flatMap(feature => [feature.title, feature.detail, feature.unit])])].filter(Boolean)) assert.ok(dictionary[copy], copy);
  for (const item of content.services.items) {
    assert.equal(item.features.length, 3);
    assert.equal(item.stages, undefined);
  }
  const page = read('src/pages/Explore.tsx');
  assert.ok(page.indexOf('<Services ') < page.indexOf('<section id="story"'));
  assert.match(page, /<Services content=\{site.services\}/);
  assert.match(read('src/shared/Services.tsx'), /content.items.map/);
  assert.doesNotMatch(read('src/shared/Services.tsx'), /fetch\s*\(|checkout|payment/);
  assert.match(read('src/PublicApp.tsx'), /'services'/);
  assert.equal(dictionary['From specs'], 'Fikirden');
  assert.equal(dictionary['silicon.'], 'çipe.');
  assert.doesNotMatch(Object.values(dictionary).join('\n'), /Hedeflerden|silikona|DEVRELER\. ALANLAR/i);
  assert.match(read('src/styles/site.css'), /font-size: clamp\(2.75rem, 12vw, 4.6rem\)/);
  for (const copy of [content.story.headline, content.story.intro, ...content.story.paragraphs]) assert.ok(dictionary[copy], copy);
  assert.equal(content.story.paragraphs.length, 2);
  assert.match(page, /site.story.paragraphs.map/);
  assert.doesNotMatch(page, /hero-index|Reason\. Simulate\. Learn\. Refine\./);
});

test('subscription distinguishes software access, customer resources and separate services without invented terms', () => {
  const {services} = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const subscription = services.subscription;
  assert.deepEqual(subscription.parts.map(item => item.id), ['software', 'environment', 'services']);
  assert.equal(subscription.setup.steps.length, 3);
  for (const copy of [subscription.label, subscription.teamLabel, subscription.hint, subscription.setup.title, ...Object.values(subscription.flow), ...subscription.parts.flatMap(item => [item.title, item.status, item.detail, ...item.items]), ...subscription.setup.steps.flatMap(step => [step.title, step.detail])]) assert.ok(dictionary[copy], copy);
  assert.equal(subscription.term, undefined);
  assert.equal(services.items[0].features[0].unit, undefined);
  assert.match(services.items[0].features[0].detail, /one user access.*for one year/);
  assert.doesNotMatch(JSON.stringify(services), /Annual · per user|Per-user annual license/);
  assert.match(subscription.parts[1].items.join(' '), /CAD and solver licenses.*PDK access.*Compute/);
  assert.match(services.items[0].note, /not bundled into the software license/);
  assert.doesNotMatch(JSON.stringify(services), /€\s*\d|\d+\s*%|24\/7|unlimited|guaranteed|—/i);
  const component = read('src/shared/SubscriptionOverview.tsx');
  assert.match(component, /aria-pressed=\{selected === i\}/);
  assert.match(component, /data-part=\{part.id\}/);
  assert.match(component, /useVisibleMotion<HTMLElement>/);
  assert.match(component, /aria-live="polite"/);
  for (const kind of ['designer', 'engine', 'simulation']) assert.ok(component.includes(`kind="${kind}"`));
  assert.match(component, /<section ref=\{ref\} className="subscription-role"/);
  assert.match(component, /className="subscription-feedback"/);
  assert.doesNotMatch(JSON.stringify(services) + read('src/shared/Services.tsx'), /\bCLI\b|\bJSON\b|configurations and runners/);
  assert.doesNotMatch(component, /fetch\s*\(|setInterval|setTimeout/);
  assert.equal(services.membership, undefined);
  assert.equal(existsSync(resolve(root, 'src/shared/MembershipValue.tsx')), false);
  assert.equal(existsSync(resolve(root, 'src/styles/membership-value.css')), false);
  assert.doesNotMatch(read('src/shared/Services.tsx'), /service-stages|service-workspace/);
  assert.doesNotMatch(read('src/styles/services.css'), /service-stages|service-stage|service-workspace/);
  assert.match(read('src/styles/subscription-overview.css'), /prefers-reduced-motion: reduce/);
});

test('services share contact actions, support keyboard tabs and animate only when visible', () => {
  const services = read('src/shared/Services.tsx');
  assert.match(services, /role="tablist"/);
  assert.match(services, /role="tabpanel"/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(services.includes(key));
  assert.match(services, /aria-selected=\{selected === i\}/);
  assert.match(services, /useVisibleMotion<HTMLElement>/);
  assert.match(services, /data-active=\{running\}/);
  assert.match(services, /running=\{running\}/);
  for (const path of ['src/shared/Services.tsx', 'src/pages/Explore.tsx', 'src/pages/ProductLaunch.tsx']) {
    assert.match(read(path), /<ActionLink [^>]*icon="mail"/);
    assert.doesNotMatch(read(path), /className="text-link services-contact"/);
  }
  assert.match(read('src/shared/ui.tsx'), /export function ActionLink/);
  assert.match(read('src/styles/site.css'), /background: var\(--button-fill\)/);
  const styles = read('src/styles/services.css');
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /data-active='true'/);
  assert.doesNotMatch(styles, /\.button(?:-primary|-secondary)?\s*\{[^}]*background:/);
  assert.doesNotMatch(services, /setInterval|setTimeout/); // Service choice never advances while someone reads.
});

test('silicon gate is shared, optional and presentation-only', () => {
  const gate = read('src/shared/SiliconGate.tsx');
  assert.equal((read('src/shared/SiteShell.tsx').match(/<SiliconGate\s*\/>/g) || []).length, 1);
  assert.match(gate, /useMotion\(\)/);
  assert.match(gate, /prefers-reduced-motion: reduce/);
  assert.match(gate, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(gate, /pageKey\(target.hash\) === pageKey\(location.hash\)/);
  assert.match(gate, /Loading your future/);
  assert.match(gate, /removeEventListener\('hashchange'/);
  assert.doesNotMatch(gate, /from .*?(?:web\/|recording|assistant)|fetch\s*\(/);
  assert.match(read('src/pages/ProductLaunch.tsx'), /href=\{url\} data-genesis-handoff/);
  assert.match(read('src/styles/silicon-gate.css'), /var\(--page\)/);
});

test('public source has no assistant, landing page or engineering service', () => {
  for (const path of ['src/App.tsx', 'src/main.tsx', 'src/pages/Landing.tsx', 'src/assistant', 'server', '.env']) assert.equal(existsSync(resolve(root, path)), false, path);
  const content = JSON.parse(read('src/content/site.json'));
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'designLoop', 'portfolio', 'services', 'stages', 'story', 'workflow'].sort());
  const source = walk('src').map(read).join('\n');
  assert.doesNotMatch(source, /localhost|127\.0\.0\.1|\/api\/|VITE_WORKBENCH_URL|codex exec|fetch\s*\(|new WebSocket/);
  assert.match(read('index.html'), /connect-src 'none'/);
  assert.match(read('vite.config.ts'), /base: '\.\/'/);
});

test('every published image is local and included', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const paths = [...content.portfolio.flatMap(item => item.images.map(image => image.src)), ...content.about.people.map(person => person.image)];
  for (const path of paths) {
    assert.match(path, /^\/assets\/[\w.-]+$/);
    assert.ok(existsSync(resolve(root, `public${path}`)), path);
  }
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

test('research is a standalone route with a data-driven reader, not an About accordion', () => {
  assert.match(read('src/PublicApp.tsx'), /route === '#\/publications'/);
  assert.match(read('src/pages/Explore.tsx'), /href="#\/publications"/);
  assert.doesNotMatch(read('src/pages/Explore.tsx'), /<Publications|research-toggle/);
  assert.match(read('src/pages/Research.tsx'), /<main id="main"/);
  assert.match(read('src/pages/Research.tsx'), /<Publications people=\{site.about.people\} papers=\{papers\}/);
  const library = read('src/shared/Publications.tsx');
  assert.doesNotMatch(library, /<details|<summary|setOpen|window.location/);
  assert.match(library, /aria-controls="publication-reader"/);
  assert.match(library, /<PublicationActions key=\{selected.id\}/);
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
