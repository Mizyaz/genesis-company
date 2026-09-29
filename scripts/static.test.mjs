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
  assert.match(component, /<dl className="story-spec" key=\{cycle\}>/);
  assert.doesNotMatch(component, /fetch\s*\(|setInterval/);
  assert.doesNotMatch(component, /story-pixel/);
  // The loop lives in the technical part of the page: the platform section, next to the modules.
  const explorePage = read('src/pages/Explore.tsx');
  const loopAt = explorePage.indexOf('<DesignStory content={site.story.loop}');
  assert.ok(loopAt > explorePage.indexOf('<section id="workflow"') && loopAt < explorePage.indexOf('<Services '), 'design loop in the platform section');
  assert.doesNotMatch(read('src/pages/Welcome.tsx') + read('src/shared/Membership.tsx'), /DesignStory/);
  // On phones the whole loop fits one screen: the team on top, GENESIS and the tools side by side; work goes down and across.
  const loopCss = read('src/styles/design-story.css');
  assert.match(loopCss, /@container \(max-width: 559px\) \{\n  \.story-scene \{ --link: 20px; grid-template-columns: minmax\(0, 1fr\) var\(--link\) minmax\(0, 1fr\); grid-template-areas: "team team team" "down \. \." "engine across tools"; \}/);
  assert.match(loopCss, /\.story-link-team \.story-rail\[data-on="true"\]::before \{ animation-name: story-travel-down; \}/);
  assert.doesNotMatch(loopCss, /@container \(max-width: 420px\)/); // The team card keeps its drawing beside the sheet.
  // The step counter reads as a loop: no "4 / 5, then 2 / 5"; steps 2 to 4 are a lap with the attempt counted.
  assert.doesNotMatch(component, /\{frame\.step\} \/ \{content\.steps\.length\}/);
  assert.match(component, /<Steps frame=\{frame\} count=\{content\.steps\.length\} attempt=\{`\$\{content\.engine\.iteration\} \$\{frame\.design \+ 1\}`\}/);
  assert.match(component, /frame\.step === 2 && frame\.design > 0 && <path key=\{run\} className="story-lap-spark"/);
  assert.match(loopCss, /\.story-steps\[data-looping="true"\] \.story-lap \{ stroke: var\(--violet\)/);
  // Every appearance says it is an illustration and gives screen readers the five steps in words.
  assert.match(component, /story-now-note">\{content.note\}/);
  assert.match(component, /<ol className="sr-only">\{content.steps.map/);
  const explore = read('src/pages/Explore.tsx');
  assert.match(explore, /<Membership content=\{site.membership\} email=\{site.brand.email\} \/>/);
  // Our story is told on the About page; the approach link leads to the hero scene.
  assert.doesNotMatch(explore, /id="story"|id="team"|story-narrative/);
  assert.match(read('src/pages/About.tsx'), /<section id="story" className="about-story" aria-labelledby="story-title">/);
  assert.doesNotMatch(read('src/content/site.json'), /#\/explore\/(story|team)/, 'story links go to About; the approach is the hero');
  for (const app of ['src/PublicApp.tsx', 'src/App.tsx'].filter(path => existsSync(resolve(root, path)))) assert.match(read(app), /const about = route === '#\/about' \|\| route\.startsWith\('#\/about\/'\);/, app);
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
  for (const part of ['className="scene-pen"', 'className="scene-agent"', '<OutputArt key={runs.outcome} on={phase === final} burst={burst} />', 'className="scene-die-check"']) assert.ok(scene.includes(part), part);
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

test('both illustrations answer a click: the part dips, a ripple spreads and it does its own work, and the loop carries on', () => {
  const scene = read('src/shared/StoryScene.tsx'), loop = read('src/shared/DesignStory.tsx');
  const { story } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  // The story scene: every part is a real button that plays its own moment again.
  for (const part of ['expertise', 'agents', 'outcome']) assert.match(scene, new RegExp(`<button type="button" className="scene-[^"]*scene-part"[^\\n]*onClick=\\{play\\('${part}'\\)\\}>`), part);
  assert.match(scene, /const moment: Record<Part, number> = \{ expertise: 1, agents: 3, outcome: final \}/);
  for (const drawing of ['<ExpertiseArt key={runs.expertise}', '<AgentsArt key={runs.agents}', '<OutputArt key={runs.outcome}']) assert.ok(scene.includes(drawing), drawing);
  assert.match(scene, /className="scene-sparks"/); // GENESIS stamps the chip with sparks when asked.
  assert.match(scene, /aria-describedby=\{`\$\{id\}-expertise`\}/); // The detail stays for screen readers, as the button's description.
  // The design loop: each station is a button stretched over its card, named for what it does.
  for (const station of ['designer', 'engine', 'tools']) assert.match(loop, new RegExp(`<button type="button" className="story-press" aria-label=\\{content\\.actions\\.${station}\\} onClick=\\{play\\('${station}'\\)\\} />`), station);
  for (const label of Object.values(story.loop.actions)) assert.ok(dictionary[label], label);
  assert.match(loop, /frameAt\(\(frame\.design \+ 1\) % designs\.length, 2\)/); // GENESIS prepares the next design.
  assert.match(loop, /frameAt\(design, enabled \? 3 : 4\)/); // The tools simulate now; stopped, the result shows still.
  // Buttons stay mounted, so keyboard focus survives the loop; only the drawings start again.
  assert.doesNotMatch(scene, /className="scene-stage" key=/);
  assert.doesNotMatch(loop, /className="story-scene" key=/);
  // One shared feel: a dip sized to the part and a ripple from the touch (the middle for keys), never with motion stopped or reduced.
  assert.match(loop, /export function usePress/);
  assert.match(scene, /usePress<Part>\(enabled\)/);
  assert.match(loop, /if \(!enabled \|\| matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return;/);
  assert.match(loop, /event\.detail === 0/);
  assert.doesNotMatch(scene + loop, /vibrate|fetch\s*\(|setInterval/);
  const sceneCss = read('src/styles/story-scene.css'), loopCss = read('src/styles/design-story.css');
  for (const css of [sceneCss, loopCss]) {
    assert.match(css, /touch-action: manipulation/);
    assert.match(css, /@media \(hover: hover\)/);
    assert.match(css, /:focus-visible \{ outline: 2px solid var\(--cyan\)/);
  }
  assert.match(loopCss, /\.press-ripple \{ position: absolute; z-index: 1; inset: 0; overflow: hidden;/);
  // Replays start from the first frame: drawing is an animation on the part, not a transition that needs the previous state.
  assert.match(sceneCss, /\.scene-draw\[data-on="true"\] \{ stroke-dashoffset: 0; animation: scene-draw/);
});

test('on phones rows of cards scroll sideways, sections are named not numbered, and a live wire shows how far the page is read', () => {
  // Sections: an eyebrow and a title, no numbers; numbers stay for real sequences (the platform steps).
  assert.match(read('src/shared/ui.tsx'), /export function SectionHeading\(\{ eyebrow, children \}/);
  for (const path of walk('src').filter(path => path.endsWith('.tsx'))) assert.doesNotMatch(read(path), /<SectionHeading number=/, path);
  assert.doesNotMatch(read('src/shared/PortfolioCard.tsx'), /item\.number/);
  assert.match(read('src/shared/Workflow.tsx'), /padStart\(2, '0'\)/);
  // Swipe rows: each with its dots, only below 700 px; the row reaches the screen edges and snaps card by card.
  const rows = { 'src/shared/Membership.tsx': 'tiers', 'src/pages/Explore.tsx': 'designs', 'src/shared/Workflow.tsx': 'ref', 'src/shared/Services.tsx': 'scope' };
  for (const [path, ref] of Object.entries(rows)) {
    assert.match(read(path), /className="[^"]*swipe-row"/, path);
    assert.match(read(path), new RegExp(`<SwipeDots [^>]*row=\\{${ref}\\}`), path);
  }
  assert.match(read('src/pages/Explore.tsx'), /<ul ref=\{modules\} className="swipe-row">/);
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
  assert.ok(40 < 1000 && /z-index: 1000/.test(read('src/styles/research-flight.css')), 'the flight covers the wire');
});

test('every platform stage opens a tube screen with what GENESIS offers there, animated, without new claims', () => {
  const { stages, workflow } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const screens = read('src/shared/StageScreens.tsx');
  assert.deepEqual(stages.map(stage => stage.id), ['specification', 'synthesis', 'em', 'optimization', 'layout']);
  assert.ok(dictionary[workflow.softwareLabel], workflow.softwareLabel);
  for (const stage of stages) {
    assert.match(screens, new RegExp(`${stage.id}: \\w+`), `${stage.id} has its picture`);
    assert.equal(stage.software.length, 3, stage.id);
    for (const offer of stage.software) {
      assert.ok(offer.icon && offer.title && offer.detail, stage.id);
      for (const copy of [offer.title, offer.detail]) assert.ok(dictionary[copy], copy);
    }
  }
  // Only what the site already says GENESIS does: no figures, speed-ups or promises.
  assert.doesNotMatch(JSON.stringify(stages), /\d+\s*%|\d+x\b|guarante|unlimited|faster|instant/i);
  assert.doesNotMatch(Object.values(dictionary).join('\n'), /—/);
  // The card title is the disclosure button; the screen can be closed with the card, its own button or Escape.
  const component = read('src/shared/Workflow.tsx');
  assert.match(component, /<h3><button type="button" className="workflow-open" aria-expanded=\{open === index && !off\} aria-controls=\{open === index \? panel : undefined\}/);
  assert.match(component, /event\.key === 'Escape'/);
  assert.match(component, /aria-label=\{t\("Close"\)\}/);
  assert.match(component, /event\.animationName === 'stage-screen-off'/); // It goes back into the tube before it is removed.
  assert.match(component, /if \(still\) setOpen\(null\)/); // With motion stopped it simply closes.
  assert.match(read('src/pages/Explore.tsx'), /<Workflow stages=\{site\.stages\} label=\{site\.workflow\.softwareLabel\} \/>/);
  // A cathode-ray tube: a bright line where the tube lands, then the picture; scanlines; back to a line and a dot.
  const css = read('src/styles/workflow-detail.css');
  assert.match(css, /transform-origin: var\(--tube-x\) 0; animation: stage-screen-on/);
  assert.match(css, /@keyframes stage-screen-on \{ 0% \{ opacity: 0; transform: scale\(\.02, \.012\);[^}]*\} 6% \{ opacity: 1; \} 32% \{ transform: scale\(1, \.012\);/);
  assert.match(css, /@keyframes stage-screen-off/);
  assert.match(css, /@keyframes stage-tube-grow/);
  assert.match(css, /repeating-linear-gradient\(to bottom/);
  assert.match(css, /\.workflow-detail\[data-motion="off"\] \*/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.workflow-detail \{ position: relative; display: grid; grid-template-rows: 0fr;/);
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
  const order = ['<section className="company-hero"', '<Membership ', '<section id="portfolio"', '<section id="workflow"', '<Services ', '<section id="contact"'].map(marker => page.indexOf(marker));
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
  assert.match(read('src/pages/About.tsx'), /site.story.paragraphs.map/);
  assert.doesNotMatch(page, /hero-index|Reason\. Simulate\. Learn\. Refine\./);
});

test('the membership offers a free demo and three tiers with their own symbols; questions are folded until opened', () => {
  const {membership, services, workflow} = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const {tiers, faq} = membership;
  assert.deepEqual(tiers.map(tier => tier.id), ['demo', 'pro', 'enterprise']);
  assert.equal(new Set(tiers.map(tier => tier.icon)).size, tiers.length, 'each tier has its own symbol');
  assert.ok(tiers.every(tier => tier.icon !== 'play'), 'no symbol looks like a video you could play');
  assert.doesNotMatch(read('src/shared/Membership.tsx'), /'play'/);
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

test('every page change and every wait uses the one silicon gate, from the first load on', () => {
  const store = read('src/shared/gate.ts'), gate = read('src/shared/SiliconGate.tsx');
  assert.match(store, /export function holdGate\(request: GateRequest\)/);
  assert.match(store, /export function navigate\(hash: string\)/);
  // Links, code, back and forward, the first load and waits all go through the one gate.
  assert.match(gate, /useSyncExternalStore\(subscribeGate, gateJobs\)/);
  assert.match(gate, /window.addEventListener\('genesis:gate-navigate', requested\)/);
  assert.match(gate, /Back, forward or a typed address/);
  assert.match(gate, /\{ phase: 'boot', title: '', subtitle: '', handoff: false \}/);
  assert.match(read('src/styles/silicon-gate.css'), /\.silicon-gate \{ position: fixed; inset: 0; z-index: 1100;/);
  // Before the app starts, the HTML shows the same cover: the gate's chip, name and energy bar.
  const html = read('index.html');
  assert.match(html, /<div id="root"><div class="boot-gate" aria-hidden="true">/);
  assert.match(html, /M61 83H67L75 65L85 96L94 76H100/);
  assert.match(gate, /M61 83H67L75 65L85 96L94 76H100/);
  // Waits ask for the gate instead of drawing their own loading text; code changes page through it.
  const flight = read('src/shared/ResearchFlight.tsx'), viewer = read('src/shared/ImageViewer.tsx');
  assert.match(flight, /holdGate\(\{ title: 'Loading the city'/);
  assert.match(flight, /release\(\(\) => \{ setRevealed\(true\); flight.start\(\); \}\)/);
  assert.match(flight, /navigate\('#\/explore'\)/);
  assert.match(viewer, /holdGate\(\{ title: 'Loading image', subtitle: title, delay: \d+ \}\)/);
  // Only the gate itself may set the address directly (and only when no gate is on the page).
  for (const path of walk('src').filter(path => /\.tsx?$/.test(path) && path !== 'src/shared/gate.ts')) {
    assert.doesNotMatch(read(path), /["'`]Loading[^"'`]*…["'`]|window\.location\.hash =/, path);
  }
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

test('the research page flies a signal through a city of our papers: one building per paper, on a timeline, with a visit prompt', () => {
  const research = read('src/pages/Research.tsx');
  assert.match(research, /<ResearchFlight papers=\{papers\} onShowPaper=/);
  assert.match(research, /<Publications people=\{site.about.people\} papers=\{papers\} focus=\{focus\}/);
  // three.js loads only when the flight starts; nothing on the page imports it.
  const flight = read('src/shared/ResearchFlight.tsx');
  assert.match(flight, /import\('\.\.\/flight\/world'\)/);
  for (const path of walk('src').filter(path => /\.tsx?$/.test(path) && !path.startsWith('src/flight/'))) {
    assert.doesNotMatch(read(path), /from 'three'|^import \{[^}]*\} from '\.\.\/flight\/world'/m, path);
  }
  assert.equal(JSON.parse(read('package.json')).dependencies.three, '0.186.1');
  // Every paper is a building in its empire; later years stand further along the timeline; nothing overlaps.
  const load = path => { const module = {}; new Function('exports', 'require', ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, () => ({})); return module; };
  const papers = JSON.parse(read('src/content/publications.json'));
  const { layoutCity, empireOf } = load('src/flight/layout.ts');
  const city = layoutCity(papers);
  assert.equal(city.buildings.length, papers.length);
  assert.deepEqual(new Set(city.buildings.map(b => b.paper.id)).size, papers.length);
  assert.deepEqual([...new Set(papers.map(empireOf))].sort(), ['circuit', 'drone', 'signal']);
  for (const b of city.buildings) for (const other of city.buildings) {
    if (b !== other) assert.ok(Math.hypot(b.x - other.x, b.z - other.z) > b.radius + other.radius + 1, `${b.paper.id} / ${other.paper.id}`);
    if (other.paper.year > b.paper.year) assert.ok(other.z < b.z, `${other.paper.id} after ${b.paper.id}`);
  }
  assert.ok(city.years.every((year, i) => !i || year.z < city.years[i - 1].z && year.year === city.years[i - 1].year + 1));
  assert.ok(city.buildings.every(b => b.glyph !== 'chip'), 'every paper gets a picture for its topic');
  // The visit prompt appears after a short stay next to a building and leads to the paper or GENESIS.
  const world = read('src/flight/world.ts');
  const dwell = Number(world.match(/export const DWELL_SECONDS = ([\d.]+)/)[1]);
  assert.ok(dwell >= 0.8 && dwell <= 3);
  assert.match(flight, /t\("Would you like to visit\?"\)/);
  assert.match(flight, /href=\{publicationUrl\(prompt.paper\)\} target="_blank" rel="noopener noreferrer"/);
  assert.match(flight, /role="dialog" aria-modal="true"/);
  assert.match(flight, /reducedMotion: !motion/);
  assert.match(read('src/styles/research-flight.css'), /prefers-reduced-motion: reduce/);
  // Crisp pieces only: prisms, boxes and flat rings; no spheres or blobs in the city.
  assert.doesNotMatch(world.replace(/new THREE\.SphereGeometry\(1800[^)]*\)/, ''), /SphereGeometry|TorusKnot|Capsule|IcosahedronGeometry\(\s*[\d.]+\s*,\s*[1-9]/);
  assert.doesNotMatch([world, read('src/flight/art.ts'), read('src/flight/layout.ts')].join('\n'), /fetch\s*\(|https?:\/\//);
  assert.ok(existsSync(resolve(root, 'public/assets/research-flight.webp')));
});

test('the signal flight is fully playable on a phone: two thumbs, tap to fly, a timeline scrubber, both orientations', () => {
  const flight = read('src/shared/ResearchFlight.tsx');
  // The left thumb flies, the right thumb rises and sinks, at the same time; further fingers can still tap.
  assert.match(flight, /event.pointerType === 'touch' && event.clientX > event.currentTarget.clientWidth \/ 2 \? 'lift' : 'fly'/);
  assert.match(flight, /role: taken \? 'tap' : wanted/);
  assert.match(flight, /handle.current\?.setInput\(\{ turn: x, forward: -y \}\)/);
  assert.match(flight, /handle.current\?.setInput\(\{ lift: -y \}\)/);
  // A tap (or click) that does not move flies to the building under it; the engine picks walls, roofs and posters.
  assert.match(flight, /!touch.moved && event.timeStamp - touch.at < \d+ && handle.current\?.pick\(event.clientX, event.clientY\)/);
  assert.match(read('src/flight/world.ts'), /pick\(clientX: number, clientY: number\): boolean/);
  // The timeline is a scrubber; letting go flies there, sliding off cancels.
  assert.match(flight, /onPointerUp: \(event: ReactPointerEvent<HTMLDivElement>\) => \{[\s\S]*?handle.current\?.flyTo\(paper.id\)/);
  // The game owns every gesture: no page zoom, scroll, selection or long-press menu; pads show where the thumbs go.
  assert.match(flight, /onContextMenu=\{event => event.preventDefault\(\)\}/);
  assert.match(flight, /data-touch=\{coarse \|\| undefined\}/);
  const css = read('src/styles/research-flight.css');
  assert.match(css, /\.flight-overlay \{[^}]*touch-action: none;[^}]*-webkit-touch-callout: none;/);
  assert.match(css, /\.flight-pad-fly \{/);
  assert.match(css, /\.flight-pad-lift \{/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 520px\)/);
  assert.match(flight, /requestFullscreen/);
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
