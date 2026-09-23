import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

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

test('production bundle has no local service or assistant endpoint', () => {
  assert.ok(existsSync(resolve(root, 'dist/index.html')), 'Run npm run build before npm test');
  const output = walk('dist').filter(path => /\.(js|css|html)$/.test(path)).map(read).join('\n');
  assert.doesNotMatch(output, /localhost|127\.0\.0\.1|\/api\/navigator|VITE_WORKBENCH_URL|codex exec|gpt-5\.6/);
  assert.match(read('dist/index.html'), /connect-src 'none'/);
  assert.doesNotMatch(read('dist/index.html'), /(?:src|href)="\/assets\//);
});
