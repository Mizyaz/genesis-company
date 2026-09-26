import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);

test('public source has no assistant, landing page or engineering service', () => {
  for (const path of ['src/App.tsx', 'src/main.tsx', 'src/pages/Landing.tsx', 'src/assistant', 'server', '.env']) assert.equal(existsSync(resolve(root, path)), false, path);
  const content = JSON.parse(read('src/content/site.json'));
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'designLoop', 'portfolio', 'stages', 'story', 'workflow'].sort());
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
    if (paper.doi) assert.match(paper.doi, /^10\.\d{4,9}\/\S+$/, paper.id);
    assert.doesNotMatch(JSON.stringify(paper), /arxiv|10\.48550|—/i, paper.id);
  }
});

test('production bundle has no local service client or assistant endpoint', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')), 'Run npm run build before npm test');
  const output = walk('dist').filter(path => /\.(js|css|html)$/.test(path)).map(read).join('\n');
  assert.doesNotMatch(output, /localhost|127\.0\.0\.1|\/api\/navigator|VITE_WORKBENCH_URL|codex exec|gpt-5\.6/);
  assert.match(read('dist/index.html'), /connect-src 'none'/);
  assert.doesNotMatch(read('dist/index.html'), /(?:src|href)="\/assets\//);
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
