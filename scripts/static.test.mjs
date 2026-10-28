import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { ABSOLUTE_PATH, privatePattern } from './leak-guard.mjs';
import { LEAK_KINDS, uncleared } from './export-film-take.mjs';

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

test('one page: the lead, the film, the process cards, membership, research, team and contact', () => {
  const home = read('src/pages/OnePage.tsx');
  const order = ['home-lead', '<FilmTake', 'id="how"', '<ProcessCards', 'id="membership"', 'id="research"', 'id="team"', 'id="contact"'].map(mark => home.indexOf(mark));
  assert.ok(order.every((at, i) => at > 0 && (!i || at > order[i - 1])), order.join());
  const app = read('src/PublicApp.tsx');
  for (const section of ['how', 'membership', 'research', 'team', 'contact']) assert.match(app, new RegExp(`'${section}'`));
  for (const old of ['#/about', '#/publications', '#/explore/lab', '#/design']) assert.ok(app.includes(`'${old}'`), old);
  const shell = read('src/shared/SiteShell.tsx');
  for (const link of ['How it works', 'Membership', 'Research', 'Team', 'Send us a spec']) assert.ok(shell.includes(link), link);
  for (const gone of ['src/pages/Explore.tsx', 'src/shared/ScrollCurrent.tsx', 'src/shared/FilmPlayer.tsx', 'src/shared/Membership.tsx', 'public/assets/story', 'public/assets/hero-metal.webp']) assert.ok(!existsSync(resolve(root, gone)), gone);
});

test('the process cards are visible by default; only a page that can watch them and plays motion hides them first', () => {
  const cards = read('src/shared/ProcessCards.tsx'), css = read('src/styles/one-page.css');
  assert.match(cards, /if \(!el \|\| !enabled \|\| !\('IntersectionObserver' in window\)\) return;/);
  assert.match(cards, /el\.dataset\.reveal = 'on'/);
  // Every rule that hides a card or part of one waits for data-reveal (the film fades in on its own; keyframes start hidden).
  const hiding = css.match(/[^\n{}]*\{[^}]*opacity: 0[^}]*\}/g).map(rule => rule.split('{')[0].trim());
  assert.ok(hiding.includes('.pc-cards[data-reveal="on"] .pc-card:not(.is-in)'));
  for (const rule of hiding) assert.match(rule, /^(?:\.film-take|@keyframes |\.pc-cards\[data-reveal="on"\] )/, rule);
  // Every number on the cards comes from its record.
  assert.match(cards, /codesign\.designs/); assert.match(cards, /drc\.rule_checks/); assert.match(cards, /verification_seconds/);
  assert.match(cards, /public\/assets\/records\/layout-timing\.json/);
  // The layout picture is the GDS render: every mask it lists is published, all of them in the die's proportions.
  assert.match(read('src/shared/ProcessVisuals.tsx'), /content\/story\/layout\.json/);
  const layout = JSON.parse(read('src/content/story/layout.json'));
  assert.deepEqual(Object.keys(layout.files).sort(), ['blocks', 'blocks_below', 'dc', 'devices', 'fill', 'ground', 'rf', 'rf_below']);
  for (const file of Object.values(layout.files)) assert.ok(existsSync(resolve(root, `public${file}`)), file);
  assert.ok(Math.abs(layout.pixels[1] / layout.pixels[0] - layout.die_um[1] / layout.die_um[0]) < .002);
  // Each mask covers the pixels the export counted, so a mask left from another export fails.
  for (const [kind, file] of Object.entries(layout.files)) assert.equal(coveredPixels(readFileSync(resolve(root, `public${file}`))), layout.covered_pixels[kind], kind);
});

/** The pixels with nonzero alpha of an 8-bit gray-and-alpha PNG (the masks export-layout.py writes). */
function coveredPixels(png) {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.deepEqual([png[24], png[25], png[28]], [8, 4, 0], 'an 8-bit gray-and-alpha PNG, not interlaced');
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const size = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + size));
    at += size + 12;
  }
  const data = inflateSync(Buffer.concat(chunks)), bpp = 2, stride = width * bpp;
  let previous = Buffer.alloc(stride), covered = 0;
  for (let row = 0; row < height; row++) {
    const filter = data[row * (stride + 1)], line = Buffer.from(data.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = previous[i], c = i >= bpp ? previous[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[i] = (line[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter]) & 255;
    }
    for (let i = 1; i < stride; i += bpp) if (line[i]) covered++;
    previous = line;
  }
  return covered;
}

test('the film goes in only as an export whose on-screen scan cleared every kind of leak', () => {
  assert.deepEqual(LEAK_KINDS, ['host', 'user', 'email', 'paths', 'names', 'vendors', 'models']);
  assert.deepEqual(uncleared({ on_screen_counts: { host: 0, user: 0, email: 0, paths: 0 } }), ['names', 'vendors', 'models']);
  assert.deepEqual(uncleared({ on_screen_counts: Object.fromEntries(LEAK_KINDS.map(kind => [kind, 0])) }), []);
  assert.deepEqual(uncleared({ on_screen_counts: { ...Object.fromEntries(LEAK_KINDS.map(kind => [kind, 0])), names: 2 } }), ['names']);
  const { takes } = JSON.parse(read('src/content/film-take.json'));
  if (!takes) return;
  for (const theme of ['dark', 'light']) {
    for (const asset of [takes[theme].video, takes[theme].poster]) assert.match(asset, /^\/assets\/film\/take-(dark|light)\.(mp4|jpg)$/);
    const video = readFileSync(resolve(root, `public${takes[theme].video}`));
    assert.ok(video.length < 12e6, `${theme} take is ${video.length} bytes`);
    assert.ok(video.indexOf('moov') > 0 && video.indexOf('moov') < video.indexOf('mdat'), `${theme} take must start with its index`);
    assert.ok(existsSync(resolve(root, `public${takes[theme].poster}`)), theme);
  }
});

// The wording of record: "Automated layout", no vendor, foundry, tool or model names, no "sign-off".
const BANNED = /\blaid out\b|sign-?off|signoff|\bcadence\b|calibre|virtuoso|spectre|maestro|keysight|\bads\b|ansys|synopsys|mentor graphics|globalfoundries|\b22fdx\b|tsmc|gpt-|openai|\bcodex\b|\bcoils?\b|em-searched|pixel-searched/i;
test('the copy keeps the wording of record and names no vendor, foundry, tool or model', () => {
  const copy = ['src/content/site.json', 'index.html', 'src/pages/OnePage.tsx', 'src/shared/ProcessCards.tsx', 'src/shared/ProcessVisuals.tsx', 'src/shared/FilmTake.tsx', 'src/shared/SiteShell.tsx', 'src/PublicApp.tsx'];
  for (const path of copy) assert.doesNotMatch(read(path), BANNED, path);
  const site = JSON.parse(read('src/content/site.json'));
  assert.equal(`${site.home.headline} ${site.home.accent}`, 'Automated layout for RF and mmWave front-ends.');
  assert.match(site.home.intro, /^Zero DRC \(design rule check\) violations, LVS \(layout versus schematic\) correct\./);
  // No cell or run name (lower_case_words_joined) in the copy.
  assert.doesNotMatch(JSON.stringify(site), /\b[a-z0-9]+(?:_[a-z0-9]+){2,}\b/);
});

test('the built page keeps the wording of record and names no vendor, foundry, tool or model', t => {
  if (!existsSync(resolve(root, 'dist/index.html'))) return t.skip('no build: run npm run build first');
  for (const file of walk('dist').filter(path => /\.(html|js|css)$/.test(path))) {
    const text = read(file);
    for (const [, string] of text.matchAll(/"([^"\n]{12,})"/g)) assert.doesNotMatch(string, BANNED, `${file}: ${string.slice(0, 80)}`);
  }
});

test('public source has no assistant, landing page or engineering service', () => {
  for (const path of ['src/App.tsx', 'src/main.tsx', 'src/pages/Landing.tsx', 'src/pages/ProductLaunch.tsx', 'src/pages/About.tsx', 'src/pages/Research.tsx', 'src/styles/welcome.css', 'src/assistant', 'server', '.env']) assert.equal(existsSync(resolve(root, path)), false, path);
  const content = JSON.parse(read('src/content/site.json'));
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'home']);
  const source = walk('src').map(read).join('\n');
  assert.doesNotMatch(source, /localhost|127\.0\.0\.1|\/api\/|VITE_WORKBENCH_URL|codex exec|fetch\s*\(|new WebSocket/);
  assert.match(read('index.html'), /connect-src 'none'/);
  assert.match(read('vite.config.ts'), /base: '\.\/'/);
});


test('every published image is local and included', () => {
  const content = JSON.parse(read('src/content/site.json'));
  for (const path of content.about.people.map(person => person.image)) {
    assert.match(path, /^\/assets\/[\w.-]+$/);
    assert.ok(existsSync(resolve(root, `public${path}`)), path);
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
  assert.match(read('src/shared/story/landing.tsx'), /brand\.json/);
  // Less motion draws the mark at rest.
  assert.match(read('src/shared/GenesisMark.tsx'), /prefers-reduced-motion: reduce/);
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
  // The schematic card is the design library's drawing (glyphs.py, the one symbol language), colored by the theme.
  assert.match(read('src/shared/ProcessVisuals.tsx'), /from '\.\.\/content\/story\/schematic\.svg\?raw'/);
  const schematic = read('src/content/story/schematic.svg');
  assert.doesNotMatch(schematic, /#[0-9a-f]{3,8}\b/i, 'no fixed color in the schematic');
  for (const role of ['active', 'passive', 'dc', 'text']) assert.match(schematic, new RegExp(`var\\(--sx-${role}\\)`), role);
  // The simulation card reads the same S-parameters as the public record its numbers link to.
  assert.equal(read('src/content/story/simulation.json'), read('public/assets/records/spdt-s-parameters.json'));
  // The layout drawing, the timing and the DRC and LVS reports come from one chain: their results agree.
  const motion = JSON.parse(read('src/content/story/motion.json')), timing = JSON.parse(read('public/assets/records/layout-timing.json'));
  const verification = JSON.parse(read('src/content/story/verification.json'));
  assert.equal(timing.verdict, 'PASS');
  assert.deepEqual([motion.verify.drc_rule_checks, motion.verify.drc_violations, motion.verify.lvs], [timing.drc.rule_checks, timing.drc.violations, timing.lvs]);
  assert.deepEqual([verification.drc.rule_checks, verification.drc.results, verification.lvs.result], [timing.drc.rule_checks, timing.drc.violations, 'CORRECT']);
  assert.deepEqual(Object.keys(motion.seconds), timing.stages.map(s => s.stage));
});


const genesisTokens = process.env.GENESIS_TOKENS, genesisRef = process.env.GENESIS_TOKENS_REF || 'HEAD';
test('the film tokens copy matches the GENESIS design library', { skip: !genesisTokens || !existsSync(genesisTokens) ? 'GENESIS_TOKENS is not set or not found' : false }, async () => {
  const { staleTokens } = await import('./sync-film-tokens.mjs');
  const stale = staleTokens(genesisTokens, genesisRef);
  assert.deepEqual(stale, [], `src/content/film.json is stale in ${stale.join(', ')}: run node scripts/sync-film-tokens.mjs ${genesisTokens} --ref ${genesisRef}`);
});

// The published build holds no host path and no private word: every file (pictures too, for their metadata) is checked
// for the private words, the text files for absolute paths, except the site's own folders (/assets/... is a URL here).
test('the build holds no host path or private word', t => {
  if (!existsSync(resolve(root, 'dist'))) return t.skip('no build: run npm run build first');
  const own = new Set(readdirSync(resolve(root, 'dist')));
  const hits = walk('dist').filter(file => {
    const bytes = readFileSync(resolve(root, file)).toString('latin1');
    if (PRIVATE.test(bytes)) return true;
    if (!/\.(html|js|css|json|svg|txt|xml|webmanifest)$/.test(file)) return false;
    return [...bytes.matchAll(new RegExp(ABSOLUTE_PATH.source, 'g'))].some(([path]) => !own.has(path.trim().replace(/^["'(=]/, '').split('/')[1]));
  });
  assert.deepEqual(hits, []);
});

test('a card title does not repeat the words its noun says', () => {
  const require = createRequire(resolve(root, 'src/shared/story/BlockView.tsx')), hooks = {};
  for (const ext of ['.ts', '.tsx']) hooks[ext] = require.extensions[ext], require.extensions[ext] = (m, file) => m._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  try {
    const { cardTitle } = require('./BlockView.tsx');
    assert.equal(cardTitle(['dc_pad_vg1'], [{ member: 'PAD_VG1', cell: 'pad' }]), 'DC pad VG1');
    assert.equal(cardTitle(['input_l1'], [{ member: 'L1', cell: 'inductor' }]), 'Input inductor L1');
    assert.equal(cardTitle(['bias_r1', 'bias_r2'], [{ member: 'R1', cell: 'res' }, { member: 'R2', cell: 'res' }]), 'Bias resistors');
  } finally { for (const ext in hooks) require.extensions[ext] = hooks[ext]; }
});
