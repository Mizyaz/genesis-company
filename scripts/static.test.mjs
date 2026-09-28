import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  // JSON.parse silently keeps the last duplicate; one once replaced the Platform navigation label.
  const keys = ts.parseJsonText('tr.json', read('src/content/tr.json')).statements[0].expression.properties.map(property => property.name.text);
  assert.deepEqual(keys.filter((key, index) => keys.indexOf(key) !== index), []);
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

test('the design loop tells one story: your team, GENESIS and your CAD tools design one circuit until it meets the target', () => {
  const code = ts.transpileModule(read('src/shared/designStory.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const story = {};
  new Function('exports', code)(story);
  const { designs, meetsTarget, failingPath, timeline } = story;
  assert.ok(designs.length >= 2);
  for (const design of designs) {
    assert.match(design.size, /µm$/);
    // Drawn as schematic symbols, not pixels: whole inductor turns and capacitor plate widths that fit the drawing.
    for (const turns of [design.l1, design.l2]) assert.ok(Number.isInteger(turns) && turns >= 2 && turns <= 6);
    for (const plate of [design.c1, design.c2]) assert.ok(plate >= 8 && plate <= 18);
  }
  assert.equal(new Set(designs.map(design => `${design.l1}-${design.c1}-${design.c2}-${design.l2}-${design.size}`)).size, designs.length, 'every iteration changes the circuit');
  designs.forEach((_, i) => assert.equal(meetsTarget(i), i === designs.length - 1, `design ${i}`));
  designs.slice(0, -1).forEach((_, i) => assert.match(failingPath(i), /^M/, `design ${i} shows where it misses the target`));
  assert.equal(failingPath(designs.length - 1), '');
  assert.deepEqual([timeline[0].step, timeline.at(-1).step], [1, 5]);
  // Every design goes to the tools and its results come back to GENESIS; only then does the best one go back to the team.
  const flows = timeline.map(frame => frame.flow).filter(Boolean);
  assert.deepEqual(flows, ['target', ...designs.flatMap(() => ['jobs', 'results']), 'review']);
  const firstMet = timeline.findIndex(frame => frame.met);
  assert.equal(timeline[firstMet].design, designs.length - 1);
  assert.ok(timeline.slice(firstMet).every(frame => frame.met));
  assert.ok(timeline.every(frame => frame.ms >= 1000), 'each step stays long enough to read');
  const { story: content } = JSON.parse(read('src/content/site.json'));
  assert.equal(content.loop.steps.length, Math.max(...timeline.map(frame => frame.step)));
  // Whole circuits, not only EM: devices go to circuit simulation, passives to EM, the result on to layout.
  assert.deepEqual(content.loop.tools.chips, ['Circuit', 'EM', 'Layout']);
  assert.ok(content.loop.designer.spec.length >= 3 && content.loop.designer.spec.every(row => row.label && row.value));
  const component = read('src/shared/DesignStory.tsx');
  assert.match(component, /useVisibleMotion/);
  assert.match(component, /timeline\[final\]/); // Stopped or reduced motion shows the finished loop.
  assert.match(component, /<dl className="story-spec">/);
  assert.doesNotMatch(component, /fetch\s*\(|setInterval/);
  assert.doesNotMatch(component, /story-pixel/);
  // The loop lives in the technical part of the page: the platform section, next to the modules.
  const explorePage = read('src/pages/Explore.tsx');
  const loopAt = explorePage.indexOf('<DesignStory content={site.story.loop}');
  assert.ok(loopAt > explorePage.indexOf('<section id="workflow"') && loopAt < explorePage.indexOf('<Services '), 'design loop in the platform section');
  assert.doesNotMatch(read('src/pages/Welcome.tsx') + read('src/shared/Membership.tsx'), /DesignStory/);
  // On phones the three stations stack, and work flows down while results come back up.
  const loopCss = read('src/styles/design-story.css');
  assert.match(loopCss, /@container \(max-width: 559px\) \{\n  \.story-scene \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(loopCss, /@keyframes story-travel-down/);
  // Every appearance says it is an illustration and gives screen readers the five steps in words.
  assert.match(component, /story-now-note">\{content.note\}/);
  assert.match(component, /<ol className="sr-only">\{content.steps.map/);
  const explore = read('src/pages/Explore.tsx');
  assert.match(explore, /<Membership content=\{site.membership\} email=\{site.brand.email\} \/>/);
  assert.match(explore, /className="story-narrative"/);
  assert.match(explore, /id="team"/); // Existing approach links still reach the story illustration.
  for (const path of ['src/styles/design-story.css', 'src/styles/story-scene.css']) {
    assert.match(read(path), /prefers-reduced-motion: reduce/);
    assert.match(read(path), /data-motion="off"/);
  }
});

test('the lead diagram is an animated scene: a designer, AI agents and GENESIS making a chip, not a list of words', () => {
  const { story } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const scene = read('src/shared/StoryScene.tsx');
  // It leads both the home page and Explore (in the hero, before the membership).
  const explore = read('src/pages/Explore.tsx');
  const sceneAt = explore.indexOf('<StoryScene content={site.story.scene} brand={<Brand />} />');
  assert.ok(sceneAt > explore.indexOf('<section className="company-hero"') && sceneAt < explore.indexOf('<Membership '), 'scene in the hero');
  assert.match(read('src/pages/Welcome.tsx'), /<StoryScene content=\{site.story.scene\} brand=\{<Brand \/>\} \/>/);
  // More telling without more text: the designer's pen, the agent that checks each candidate, and the chip GENESIS hands back.
  for (const part of ['className="scene-pen"', 'className="scene-agent"', '<OutputArt on={phase === final} />', 'className="scene-die-check"']) assert.ok(scene.includes(part), part);
  assert.equal(existsSync(resolve(root, 'src/shared/DesignPillars.tsx')), false);
  assert.match(scene, /className="art-person"/); // The designer is a person at the workstation.
  assert.match(scene, /coil\(/); // Circuits are drawn with schematic symbols.
  assert.match(scene, /useVisibleMotion/);
  assert.match(scene, /enabled \? index : final/); // Stopped or reduced motion shows the finished scene.
  assert.doesNotMatch(scene, /fetch\s*\(|setInterval|<ul/);
  // Only the two titles and the outcome are visible; the details are for screen readers.
  assert.equal((scene.match(/className="scene-title"/g) || []).length, 2);
  assert.equal((scene.match(/className="sr-only"/g) || []).length, 2);
  for (const copy of [story.scene.caption, story.scene.outcome, ...['expertise', 'agents'].flatMap(key => [story.scene[key].title, story.scene[key].detail])]) assert.ok(dictionary[copy], copy);
  assert.match(read('src/styles/site.css'), /\.company-hero-inner \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/); // Wide text never widens the page.
});

test('welcome uses the shared, single-line brand entrance with readable acronym emphasis', () => {
  const welcome = read('src/pages/Welcome.tsx');
  const identity = read('src/shared/CircuitIdentity.tsx');
  const css = read('src/styles/circuit-identity.css');
  assert.match(welcome, /<BrandIntro headingId="welcome-heading"/);
  assert.match(identity, /aria-label="Generative Evolution of Silicon Intelligent Systems"/);
  assert.equal([...identity.matchAll(/<strong>([A-Za-z]+)<\/strong>/g)].map(match => match[1]).join('').toUpperCase(), 'GENESIS');
  assert.match(identity, /if \(!enabled\) setEntered\(true\)/);
  assert.match(identity, /onAnimationEnd/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /identity-signature-arrive .65s ease-out 1.25s/);
  assert.match(css, /data-running="false"/);
  assert.doesNotMatch(welcome + read('src/styles/welcome.css'), /welcome-tagline|welcome-signature|welcome-identity/);
  // Decorative motion that told no story (drifting chips, running trace dashes) stays removed.
  assert.doesNotMatch(welcome + identity + css, /CircuitBackdrop|identity-signal|chip-drift/);
});

test('Explore opens with the membership, then the portfolio; services stay data-driven with natural Turkish copy', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  assert.deepEqual(content.services.items.map(item => item.id), ['silicon-demonstration', 'specialised-integration']);
  for (const copy of [content.services.eyebrow, content.services.title, content.services.intro, content.services.action, content.services.scopeLabel, ...content.services.items.flatMap(item => [item.label, item.title, item.headline, item.description, item.note, item.visualLabel, item.scopeLabel, item.action, ...(item.connections ?? []).flatMap(connection => [connection.label, connection.action]), ...(item.legend ?? []), ...item.features.flatMap(feature => [feature.title, feature.detail, feature.unit])])].filter(Boolean)) assert.ok(dictionary[copy], copy);
  for (const item of content.services.items) {
    assert.ok(item.features.length >= 3 && item.features.every(feature => feature.icon && feature.title && feature.detail), item.id);
    assert.equal(item.stages, undefined);
  }
  const page = read('src/pages/Explore.tsx');
  const order = ['<section className="company-hero"', '<Membership ', '<section id="portfolio"', '<section id="workflow"', '<Services ', '<section id="story"', '<section id="contact"'].map(marker => page.indexOf(marker));
  assert.ok(order.every((position, i) => position >= 0 && (i === 0 || position > order[i - 1])), `section order ${order}`);
  assert.match(page, /href="#\/explore\/membership"/); // The hero leads straight to the membership.
  assert.doesNotMatch(page, /id="about"|TeamProfiles/); // About us is a page of its own.
  assert.match(page, /<Services content=\{site.services\}/);
  assert.match(read('src/shared/Services.tsx'), /content.items.map/);
  assert.doesNotMatch(read('src/shared/Services.tsx'), /fetch\s*\(|checkout|payment/);
  assert.match(read('src/PublicApp.tsx'), /'membership', 'portfolio', 'workflow', 'services'/);
  assert.equal(dictionary['From specs'], 'Fikirden');
  assert.equal(dictionary['silicon.'], 'çipe.');
  assert.doesNotMatch(Object.values(dictionary).join('\n'), /Hedeflerden|silikona|DEVRELER\. ALANLAR/i);
  assert.match(read('src/styles/site.css'), /font-size: clamp\(2.75rem, 12vw, 4.6rem\)/);
  for (const copy of [content.story.headline, content.story.intro, ...content.story.paragraphs]) assert.ok(dictionary[copy], copy);
  assert.equal(content.story.paragraphs.length, 2);
  assert.match(page, /site.story.paragraphs.map/);
  assert.doesNotMatch(page, /hero-index|Reason\. Simulate\. Learn\. Refine\./);
});

test('the membership offers a free demo and three tiers with their own symbols; questions are folded until opened', () => {
  const {membership, services, workflow} = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const {tiers, faq} = membership;
  assert.deepEqual(tiers.map(tier => tier.id), ['demo', 'pro', 'enterprise']);
  assert.equal(new Set(tiers.map(tier => tier.icon)).size, tiers.length, 'each tier has its own symbol');
  for (const tier of tiers) assert.ok(tier.title && tier.label && tier.pitch && tier.action && tier.features.length >= 3, tier.id);
  assert.equal(tiers[0].label, 'Free');
  assert.match(tiers[0].features.join(' '), /free live demo sessions/i);
  assert.match(tiers[2].features[0], /Everything in Pro/);
  assert.match(membership.note, /offer/);
  // No fixed term is promised on the page.
  assert.doesNotMatch(JSON.stringify(membership), /one year|annual|yearly/i);
  assert.ok(workflow.modules.length >= 5 && workflow.modules.every(module => module.icon && module.title && module.detail.length > 60));
  assert.ok(faq.items.length >= 6);
  for (const item of faq.items) {
    assert.match(item.question, /\?$/);
    assert.ok(item.answer.length > 60, item.question);
  }
  const copy = [membership.eyebrow, membership.headline, membership.headlineAccent, membership.intro, membership.note,
    ...tiers.flatMap(tier => [tier.title, tier.label, tier.pitch, tier.action, ...tier.features]),
    workflow.visualLabel, workflow.modulesTitle, ...workflow.modules.flatMap(module => [module.title, module.detail]),
    faq.title, faq.intro, faq.action, ...faq.items.flatMap(item => [item.question, item.answer])];
  for (const text of copy) assert.ok(dictionary[text], text);
  const answers = faq.items.map(item => item.answer).join('\n');
  assert.match(answers, /^Per user\./m);
  assert.match(answers, /software access, not a chip design/);
  assert.match(answers, /CAD and solver licenses.*PDK access.*compute/);
  assert.match(answers, /own Linux server/);
  assert.match(answers, /free demo session/);
  assert.doesNotMatch(JSON.stringify({membership, services}), /€\s*\d|\d+\s*%|24\/7|unlimited|guaranteed|—/i);
  assert.doesNotMatch(JSON.stringify({membership, services}), /\bCLI\b|\bJSON\b|configurations and runners|subscription/i);
  const component = read('src/shared/Membership.tsx');
  assert.match(component, /id="membership"/);
  assert.match(component, /data-tier=\{tier.id\}/);
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
  assert.equal(services.subscription, undefined);
  assert.equal(services.faq, undefined);
  for (const path of ['src/shared/SubscriptionOverview.tsx', 'src/styles/subscription-overview.css', 'src/shared/MembershipValue.tsx', 'src/styles/membership-value.css']) assert.equal(existsSync(resolve(root, path)), false, path);
  assert.doesNotMatch(read('src/shared/Services.tsx'), /service-stages|service-workspace|SubscriptionStart|DesignStory|ServiceFaq/);
  assert.doesNotMatch(read('src/styles/services.css'), /service-stages|service-stage|service-workspace/);
});

test('the header fits one row on phones: navigation and settings open from a menu button', () => {
  const shell = read('src/shared/SiteShell.tsx');
  assert.match(shell, /className="icon-button menu-toggle" type="button" aria-expanded=\{menuOpen\} aria-controls=\{navId\}/);
  assert.match(shell, /event.key === 'Escape'/);
  assert.match(shell, /addEventListener\('hashchange', close\)/);
  assert.match(shell, /href="#\/about"/);
  assert.match(shell, /href="#\/explore\/membership"/);
  const css = read('src/styles/site.css');
  assert.match(css, /\.site-header\[data-menu='open'\] nav \{ display: flex; \}/);
  assert.doesNotMatch(css, /\.site-header \{ flex-wrap: wrap; \}/);
});

test('services share contact actions, support keyboard tabs and animate only when visible', () => {
  const services = read('src/shared/Services.tsx');
  assert.match(services, /role="tablist"/);
  assert.match(services, /role="tabpanel"/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(services.includes(key));
  assert.match(services, /aria-selected=\{selected === i\}/);
  assert.match(services, /useVisibleMotion<HTMLElement>/);
  assert.match(services, /data-active=\{running\}/);
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
  // Silicon: the close-up grows out of the picked die inside one beam, probes land, the sweep measures.
  for (const part of ['className="silicon-beam"', 'className="silicon-die silicon-die-picked"', 'className="silicon-zoom"', 'className="silicon-probes"', 'className="silicon-measured"']) assert.ok(services.includes(part), part);
  for (const name of ['silicon-pick', 'silicon-beam', 'silicon-zoom', 'silicon-probe', 'silicon-sweep', 'silicon-measure']) assert.match(styles, new RegExp(`@keyframes ${name} `), name);
  assert.match(styles, /prefers-reduced-motion: reduce\) \{\n(?:  [^\n]*\n)*  \.service-visual :is\(\.silicon-die-picked/);
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
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'membership', 'portfolio', 'services', 'stages', 'story', 'workflow'].sort());
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

test('About us and research are pages of their own; İslam Güven leads the team', () => {
  assert.match(read('src/PublicApp.tsx'), /route === '#\/publications'/);
  assert.match(read('src/PublicApp.tsx'), /route === '#\/about'/);
  const about = read('src/pages/About.tsx');
  assert.match(about, /<main id="main" className="about-page">/);
  assert.match(about, /<TeamProfiles people=\{site.about.people\} \/>/);
  assert.match(about, /href="#\/publications"/);
  assert.match(read('src/pages/Research.tsx'), /href="#\/about"/);
  assert.equal(JSON.parse(read('src/content/site.json')).about.people[0].id, 'islam-guven');
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
