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
  // It leads the home page; Explore's hero shows the product itself (see the product intro).
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
});

test('Explore opens with the product: a prompt to the assistant becomes pixelated matching networks and sized transistors, then an optimized layout', () => {
  const { intro } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const explore = read('src/pages/Explore.tsx'), component = read('src/shared/ProductIntro.tsx'), css = read('src/styles/product-intro.css');
  const at = explore.indexOf('<ProductIntro content={site.intro} />');
  assert.ok(at > explore.indexOf('<section className="company-hero"') && at < explore.indexOf('<Membership '), 'in the hero');
  assert.doesNotMatch(explore, /<StoryScene/);
  // The circuit is drawn from our pixelated layouts: three matching networks with two multi-finger transistors between.
  assert.match(component, /pixelLayout\(\{/);
  assert.match(component, /const passiveX = \[34, 128, 222\];/);
  assert.match(component, /const deviceX = \[94, 188\];/);
  // Optimizing: pixels flip and the transistor sizes change, iteration by iteration; no figures anywhere.
  assert.match(component, /className="intro-flips"/);
  assert.match(component, /scaleY\(\$\{spec\.width\[step\]\}\)/);
  assert.match(component, /<g key=\{fingers\} className="intro-fingers">/);
  assert.deepEqual(intro.parts, ['Input match', 'Interstage', 'Output match']);
  assert.doesNotMatch(JSON.stringify(intro), /\d|GHz|dB|%/);
  // Honest about what it is, in both languages.
  assert.match(intro.caption, /^Illustration/);
  for (const copy of [intro.label, intro.you, intro.prompt, ...intro.steps, ...intro.parts, ...intro.ports, intro.caption, intro.description]) assert.ok(dictionary[copy], copy);
  // It runs only while seen and moving: types the prompt, sends, draws, optimizes, holds and starts again. Stopped or
  // reduced motion shows the finished layout; the prompt box never grows while it is typed.
  assert.match(component, /useVisibleMotion<HTMLElement>\(\)/);
  assert.match(component, /const view: Run = enabled \? run : \{ phase: 'ready', typed: prompt\.length, step: iterations, cycle: 0 \};/);
  assert.match(component, /if \(!running\) return;/);
  assert.doesNotMatch(component, /setInterval|fetch\s*\(/);
  assert.match(css, /\.product-intro\[data-motion="off"\] \*/);
  assert.match(css, /\.product-intro\[data-running="false"\] \* \{ animation-play-state: paused !important; \}/);
  assert.match(css, /\.intro-rest \{ visibility: hidden; \}/);
  assert.match(read('src/styles/site.css'), /\.company-hero-inner \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/); // Wide text never widens the page.
  for (const exporter of ['scripts/export-public.mjs'].filter(path => existsSync(resolve(root, path)))) {
    assert.match(read(exporter), /'src\/shared\/ProductIntro\.tsx', 'src\/styles\/product-intro\.css'/);
    assert.match(read(exporter), /\['brand', 'intro', /);
  }
});

test('every card of both illustrations grows into a tube screen with what GENESIS offers there; the story waits under it', () => {
  const scene = read('src/shared/StoryScene.tsx'), loop = read('src/shared/DesignStory.tsx'), screens = read('src/shared/StageScreens.tsx');
  const { story } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  // The story scene: every part is a real button that opens its own screen.
  for (const part of ['expertise', 'agents', 'outcome']) assert.match(scene, new RegExp(`<button type="button" className="scene-[^"]*scene-part"[^\\n]*\\{\\.\\.\\.opens\\('${part}'\\)\\}>`), part);
  assert.match(scene, /screen\.toggle\(part, event\.currentTarget, event\.currentTarget\)/);
  assert.match(scene, /aria-describedby=\{`\$\{id\}-expertise`\}/); // The detail stays for screen readers, as the button's description.
  assert.doesNotMatch(scene + read('src/styles/story-scene.css'), /scene-spark|burst/);
  // The design loop: each station is a button stretched over its card, named for its card; the whole card grows.
  assert.match(loop, /<button type="button" className="story-press" aria-label=\{screens\[name\]\.title\}\n    aria-expanded=\{screen\.open && screen\.state\?\.part === name\}/);
  assert.match(loop, /press\(name, event, card\); screen\.toggle\(name, card, event\.currentTarget\);/);
  for (const station of ['designer', 'engine', 'tools']) assert.ok(loop.includes(`{station('${station}')}`), station);
  assert.equal(story.loop.actions, undefined);
  assert.doesNotMatch(loop, /content\.actions|frameAt|rerun/);
  // Both: the screen shares the illustration's grid cell; the story pauses under it and is out of reach, for keys too.
  for (const [name, code, part] of [['scene', scene, 'Part'], ['loop', loop, 'Station']]) {
    assert.ok(code.includes(`const screen = useCardScreen<${part}>(enabled);`), name);
    assert.ok(code.includes('const playing = running && !screen.state;'), name);
    assert.match(code, /\.inert = screen\.open; \}, \[screen\.open\]\);/, name);
    assert.match(code, /<div ref=\{screen\.stack\} className="tube-stack">/, name);
    assert.ok(code.includes('<CardScreen key={screen.state.run} id={`${id}-screen`} state={screen.state} still={screen.still} label={content.label}'), name);
    assert.match(code, /aria-controls/, name);
  }
  // What each card opens: one of the stage pictures and three offers the site already makes, all in Turkish too.
  const parts = [story.scene.expertise, story.scene.agents, story.scene.result, story.loop.designer, story.loop.engine, story.loop.tools];
  for (const part of parts) {
    assert.match(screens, new RegExp(`\\b${part.image}: \\w+`), part.image);
    assert.equal(part.software.length, 3, part.image);
    for (const offer of part.software) {
      assert.ok(offer.icon && offer.title && offer.detail, part.image);
      for (const copy of [offer.title, offer.detail]) assert.ok(dictionary[copy], copy);
    }
  }
  for (const copy of [story.scene.label, story.loop.label, story.loop.engine.title]) assert.ok(dictionary[copy], copy);
  assert.doesNotMatch(JSON.stringify(parts), /\d+\s*%|\d+x\b|guarante|unlimited|faster|instant/i);
  // The card lights up and its box expands from the card's place into the screen (border and all), then the picture
  // comes on; back into the card. The illustration never moves (nothing in the stack stretches), and the page below
  // moves only as the box needs more room than the illustration (rows opening with the box, from its height).
  const tube = read('src/styles/tube-screen.css');
  assert.match(tube, /\.tube-stack > \* \{ grid-area: 1 \/ 1; min-width: 0; align-self: start; \}/);
  assert.match(tube, /@keyframes tube-frame \{ from \{ inset: var\(--t\) calc\(100% - var\(--l\) - var\(--w\)\) calc\(100% - var\(--t\) - var\(--h\)\) var\(--l\);/);
  assert.match(tube, /\.tube-card \.tube-frame, \.tube-card::before, \.tube-card::after \{ animation: tube-frame /);
  assert.match(tube, /@keyframes tube-expand \{ from \{ grid-template-rows: 0fr; \} \}/);
  assert.match(tube, /\.tube-body \{ position: relative; z-index: 1; min-height: var\(--scene, 0px\);/);
  assert.match(tube, /@keyframes tube-collapse/);
  assert.match(tube, /\.tube-flash \{/);
  assert.match(screens, /<span className="tube-frame" aria-hidden="true"><span className="tube-flash" \/><\/span>/);
  assert.match(screens, /const scene = stack\.current\?\.firstElementChild\?\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(tube, /tube-card[^{]*\{[^}]*transform: scale/); // Nothing is squashed or stretched.
  // It is removed once folded; with motion stopped it opens and closes at once. Focus goes into the screen and back to the card.
  assert.match(screens, /event\.animationName === 'tube-collapse'/);
  // Stopped/cancelled exits and focus restoration are exercised in browser.spec.mjs.
  assert.match(screens, /event\.key === 'Escape'/);
  assert.match(screens, /closer\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(screens, /from\.focus\(\{ preventScroll: true \}\)/);
  // Buttons stay mounted, so keyboard focus survives the loop; only the drawings start again.
  assert.doesNotMatch(scene, /className="scene-stage" key=/);
  assert.doesNotMatch(loop, /className="story-scene" key=/);
  // One shared press: a dip sized to the part and a ripple from the touch (the middle for keys), never with motion stopped or reduced.
  assert.match(loop, /export function usePress/);
  assert.match(scene, /usePress<Part>\(enabled\)/);
  assert.match(loop, /if \(!enabled \|\| matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return;/);
  assert.match(loop, /event\.detail === 0/);
  assert.doesNotMatch(scene + loop + screens, /vibrate|fetch\s*\(|setInterval/);
  const sceneCss = read('src/styles/story-scene.css'), loopCss = read('src/styles/design-story.css');
  for (const css of [sceneCss, loopCss]) {
    assert.match(css, /touch-action: manipulation/);
    assert.match(css, /@media \(hover: hover\)/);
    assert.match(css, /:focus-visible \{ outline: 2px solid var\(--cyan\)/);
    assert.match(css, /\[data-motion="off"\] \*, /); // A stopped illustration opens its screen finished, screen included.
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
  assert.match(read('src/shared/CompanyIntro.tsx'), /showModal\(\)/, 'the introduction uses the native top layer');
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
  assert.match(component, /<TubePanel label=\{label\} content=\{\{ title: stage\.title, image: stage\.id, software: stage\.software \}\} onClose=\{close\} \/>/);
  assert.match(screens, /aria-label=\{t\("Close"\)\}/); // One screen for every card on the site (see the illustrations).
  assert.match(component, /event\.animationName === 'stage-screen-off'/); // It goes back into the tube before it is removed.
  // Closing with motion stopped is exercised in browser.spec.mjs, including Escape.
  assert.match(read('src/pages/Explore.tsx'), /<Workflow stages=\{site\.stages\} label=\{site\.workflow\.softwareLabel\} \/>/);
  // A cathode-ray tube: a bright line grows sideways where the tube lands, then the box opens downwards under it (the
  // line stays put, the picture unrolls rather than stretches, the page below moves with the box's lower edge); back
  // into the line and the tube. If the open box would reach below the fold, the page glides up first, so nothing moves
  // while it opens; the room for the tube does not collapse into the section above.
  const css = read('src/styles/workflow-detail.css');
  assert.match(css, /\.workflow-detail \{ --room: 36px; position: relative; display: flow-root; \}/);
  assert.match(css, /height: calc\(var\(--reach, 0px\) \+ var\(--room\)\)/);
  assert.match(css, /@keyframes stage-screen-on \{\n  0% \{ opacity: 0; transform: scaleX\(\.02\); grid-template-rows: 0fr;/);
  assert.match(css, /30% \{ transform: none; grid-template-rows: 0fr;/);
  assert.match(css, /100% \{ opacity: 1; transform: none; grid-template-rows: 1fr; filter: none; \}/);
  assert.doesNotMatch(css, /scale\(1, |scaleY\(\.0/); // The picture is never squashed into the line.
  assert.match(css, /\.stage-screen-frame \{ min-height: 0; \}/);
  assert.match(css, /\.workflow-detail\[data-motion="on"\] \.stage-screen\[data-phase="wait"\] \* \{ animation-play-state: paused !important; \}/);
  assert.match(css, /@keyframes stage-screen-off/);
  assert.match(css, /@keyframes stage-tube-grow/);
  assert.match(component, /return glide\(by, \(\) => setPhase\('open'\)\);/);
  assert.match(component, /const bottom = box\.getBoundingClientRect\(\)\.top \+ room \+ content\.offsetHeight \+ 24;/);
  assert.match(component, /event\.animationName === 'stage-screen-on' \|\| event\.animationName === 'stage-screen-switch'\)\) reveal\(\)/); // Brought into view once open.
  assert.doesNotMatch(component, /setTimeout\(\(\) => detail\.current/); // No scrolling while it opens.
  const tube = read('src/styles/tube-screen.css');
  assert.match(tube, /repeating-linear-gradient\(to bottom/);
  // The screen arranges itself by its own width: one column when narrow, the offers side by side when wide.
  assert.match(tube, /container-type: inline-size;/);
  assert.match(tube, /@container \(max-width: 560px\)/);
  assert.match(tube, /@container \(min-width: 880px\)/);
  assert.match(css, /\.workflow-detail\[data-motion="off"\] \*/);
  assert.match(css, /prefers-reduced-motion: reduce/);
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
  const order = ['<section className="company-hero"', '<Membership ', '<section id="portfolio"', '<section id="workflow"', '<section id="silicon"', '<Services ', '<section id="contact"'].map(marker => page.indexOf(marker));
  assert.ok(order.every((position, i) => position >= 0 && (i === 0 || position > order[i - 1])), `section order ${order}`);
  assert.match(page, /href="#\/explore\/membership"/); // The hero leads straight to the membership.
  assert.doesNotMatch(page, /id="about"|TeamProfiles/); // About us is a page of its own.
  assert.match(page, /<Services content=\{site.services\}/);
  assert.match(read('src/shared/Services.tsx'), /content.items.map/);
  assert.doesNotMatch(read('src/shared/Services.tsx'), /fetch\s*\(|checkout|payment/);
  assert.match(read('src/PublicApp.tsx'), /'membership', 'portfolio', 'workflow', 'silicon', 'services'/);
  assert.equal(dictionary['From specs'], 'Fikirden');
  assert.equal(dictionary['silicon.'], 'çipe.');
  assert.doesNotMatch(Object.values(dictionary).join('\n'), /Hedeflerden|silikona|DEVRELER\. ALANLAR/i);
  assert.match(read('src/styles/site.css'), /font-size: clamp\(2.35rem, 9.5vw, 4rem\)/);
  for (const copy of [content.story.headline, content.story.intro, ...content.story.paragraphs]) assert.ok(dictionary[copy], copy);
  assert.equal(content.story.paragraphs.length, 2);
  assert.match(read('src/pages/About.tsx'), /site.story.paragraphs.map/);
  assert.doesNotMatch(page, /hero-index|Reason\. Simulate\. Learn\. Refine\./);
  // The designs went to silicon: each card names the foundry technology it was fabricated in (as the founders state it).
  assert.deepEqual(content.portfolio.map(item => [item.id, item.foundry]), [['spdt', 'GlobalFoundries'], ['mixer', 'STMicroelectronics'], ['divider', 'STMicroelectronics']]);
  assert.match(read('src/shared/PortfolioCard.tsx'), /\{item\.foundry \? <span className="portfolio-silicon"><Icon name="chip" \/>\{t\("Fabricated"\)\} · \{item\.foundry\}<\/span>/);
  assert.match(read('src/shared/Language.tsx'), /'band', 'foundry'/); // Foundry names are not translated.
  assert.equal(dictionary.Fabricated, 'Üretildi');
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
  // Silicon: the close-up grows out of the probed die inside one beam, a GSG probe comes in from each side with its three
  // tips on the ground-signal-ground pads, the sweep measures; then the prober steps to the next die. Any die can be
  // picked (the nearest to the tap), or the next one with Enter.
  const silicon = read('src/shared/SiliconStory.tsx');
  assert.match(services, /<SiliconStory legend=\{item\.legend \?\? \[\]\} active=\{running\} motion=\{enabled\} \/>/);
  for (const part of ['className="silicon-beam"', 'className="silicon-die silicon-die-picked"', 'className="silicon-zoom"', 'className="silicon-probe-body"', 'className="silicon-probe-tips"', 'className="silicon-measured"', 'className="silicon-ground"']) assert.ok(silicon.includes(part), part);
  assert.match(silicon, /const pads = \[68, 88, 108\];/);
  assert.match(silicon, /const edges = \[\{ side: 'left', pad: 230, tip: 236 \}, \{ side: 'right', pad: 358, tip: 364 \}\] as const;/);
  assert.match(silicon, /data-signal=\{y === 88 \|\| undefined\}/);
  assert.match(silicon, /role="button" tabIndex=\{0\} aria-label=\{t\("Probe the next die"\)\} onClick=\{pick\}/);
  assert.match(silicon, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(silicon, /matrixTransform\(matrix\.inverse\(\)\)/);
  assert.match(silicon, /if \(!active \|\| !motion \|\| !probing\.measured\) return;/); // Steps on only while seen and moving.
  assert.match(silicon, /<g key=\{probing\.run\} className="silicon-run"/); // Each die runs the story once.
  for (const name of ['silicon-pick', 'silicon-beam', 'silicon-zoom', 'silicon-probe-left', 'silicon-probe-right', 'silicon-contact', 'silicon-sweep', 'silicon-measure']) assert.match(styles, new RegExp(`@keyframes ${name} `), name);
  assert.doesNotMatch(styles.slice(styles.indexOf('/* One pass per die'), styles.indexOf('@keyframes integration-link')), /silicon[^;]*infinite/);
  for (const copy of ['Probe the next die', 'Pick a die to probe it']) assert.ok(JSON.parse(read('src/content/tr.json'))[copy], copy);
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
  const viewer = read('src/shared/ImageViewer.tsx');
  assert.match(viewer, /holdGate\(\{ title: 'Loading image', subtitle: title, delay: \d+ \}\)/);
  // Only the gate itself may set the address directly (and only when no gate is on the page).
  for (const path of walk('src').filter(path => /\.tsx?$/.test(path) && path !== 'src/shared/gate.ts')) {
    assert.doesNotMatch(read(path), /["'`]Loading[^"'`]*…["'`]|window\.location\.hash =/, path);
  }
});

test('public source has no assistant, landing page or engineering service', () => {
  for (const path of ['src/App.tsx', 'src/main.tsx', 'src/pages/Landing.tsx', 'src/assistant', 'server', '.env']) assert.equal(existsSync(resolve(root, path)), false, path);
  const content = JSON.parse(read('src/content/site.json'));
  assert.deepEqual(Object.keys(content).sort(), ['about', 'brand', 'intro', 'introduction', 'rfPhysics', 'membership', 'portfolio', 'services', 'silicon', 'stages', 'story', 'workflow'].sort());
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

test('the brand opens a short RF introduction instead of a game', () => {
  const source = walk('src').map(read).join('\n');
  assert.doesNotMatch(source, /ResearchFlight|FlightSymbol|takeRequestedPaper/);
  assert.equal(JSON.parse(read('package.json')).dependencies.three, '0.180.0');
  assert.match(read('src/pages/Welcome.tsx'), /symbol=\{<CompanyIntro symbol \/>\}/);
  const intro = read('src/shared/CompanyIntro.tsx');
  assert.match(intro, /FILM_SECONDS/);
  assert.match(intro, /showModal\(\)/);
  assert.match(intro, /onCancel=/);
  assert.match(intro, /launcher.current\?\.focus\(\)/);
  assert.match(intro, /useVisibleMotion<HTMLDialogElement>/);
  assert.match(intro, /cancelAnimationFrame\(frame\)/);
  assert.match(intro, /resize.disconnect\(\)/);
  assert.match(intro, /sound.pause\(\)/);
  assert.match(intro, /type="range"/);
  assert.match(intro, /<canvas key=\{variant\} ref=\{canvas\}/);
  assert.doesNotMatch(intro, /film-chapters|film-copy|secondsPerChapter/);
  assert.match(read('src/styles/company-intro.css'), /prefers-reduced-motion: reduce/);
  assert.match(read('src/pages/Research.tsx'), /<Publications people=\{site.about.people\} papers=\{papers\} \/>/);
});

test('the RF positioning and introduction are bilingual and clearly illustrative', () => {
  const { introduction, rfPhysics } = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const strings = value => typeof value === 'string' ? [value] : Object.values(value).flatMap(strings);
  for (const text of strings({ introduction, rfPhysics })) {
    assert.ok(text === 'GENESIS' || dictionary[text], text);
    assert.doesNotMatch(text, /—|CLI|JSON|empire|DRC|LVS/);
  }
  assert.match(introduction.description, /not simulated measurement data/);
  assert.match(read('src/pages/Explore.tsx'), /t\("From schematic"\)/);
  assert.match(read('src/pages/Explore.tsx'), /<RFPhysics \/>/);
  const intro = read('src/shared/CompanyIntro.tsx');
  assert.match(intro, /Illustrated workflow/);
  assert.match(intro, /import\('\.\/intro\/frontEndFilm'\)/);
  assert.match(intro, /film.current\?\.dispose\(\)/);
  assert.match(intro, /<RFDesignScene stage=\{3\}/);
});

const transpiled = (path, dependencies = {}) => { const module = {}; new Function('exports', 'require', ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, id => dependencies[id] ?? {}); return module; };

test('the separate 2D film resizes connected components together without replacing the 3D original', () => {
  const { illustrationState, illustrationPixels, illustrationCopy } = transpiled('src/shared/intro/illustrationScene.ts', {
    './timeline': transpiled('src/shared/intro/timeline.ts'), '../pixelLayout': transpiled('src/shared/pixelLayout.ts'),
  });
  const states = Array.from({ length: 9 }, (_, i) => illustrationState(10.15 + i * 1.8));
  for (const readValue of [s => s.mos.fingers, s => s.mos.width, s => s.mos.height, s => s.coil.size, s => s.coil.width, s => s.pixel.width, s => s.cap.width]) {
    assert.ok(new Set(states.map(readValue)).size >= 5, 'the geometry actually changes, not just its label');
  }
  assert.ok(new Set(illustrationPixels.map(p => JSON.stringify(p.metal))).size >= 5);
  for (let time = 3; time <= 26; time += .25) {
    const s = illustrationState(time);
    assert.deepEqual(s, illustrationState(time), 'seeking is deterministic');
    for (const [wire, from, to] of [['input', 'input', 'pixelIn'], ['gate', 'pixelOut', 'gate'], ['drain', 'drain', 'coilIn'], ['output', 'coilOut', 'output']]) {
      const points = s.wires.find(w => w.id === wire).points;
      assert.deepEqual(points[0], s.pins[from]); assert.deepEqual(points.at(-1), s.pins[to]);
    }
    for (const p of Object.values(s.pins)) {
      const screenX = 640 + (p[0] - s.focusX) * s.zoom;
      assert.ok(screenX > 32 && screenX < 1248, 'the output and input remain in frame');
    }
  }
  const dictionary = JSON.parse(read('src/content/tr.json'));
  for (const label of illustrationCopy) assert.ok(dictionary[label], label);
  for (const sentence of Object.values(JSON.parse(read('src/content/site.json')).introduction.illustration)) {
    assert.match(sentence, /\.$/); assert.doesNotMatch(sentence, /—|\?/);
  }
  const renderer = read('src/shared/intro/illustrationFilm.ts');
  assert.match(renderer, /getContext\('2d'/); assert.doesNotMatch(renderer, /from 'three'/);
  const player = read('src/shared/CompanyIntro.tsx');
  assert.match(player, /useState<'3d' \| '2d'>\('3d'\)/);
  assert.match(player, /import\('\.\/intro\/illustrationFilm'\)/);
  assert.match(player, /download="GENESIS-3D-30s.mp4"/);
  const mp4 = readFileSync(resolve(root, 'public/assets/films/genesis-3d-30s.mp4'));
  assert.equal(mp4.subarray(4, 8).toString(), 'ftyp');
  assert.equal(mp4.length, 9_657_818, 'the published 3D export remains unchanged');
});

test('the original score is finite, deterministic and resolves with the film', () => {
  const timeline = transpiled('src/shared/intro/timeline.ts');
  const { composeScore, FILM_SECONDS, BPM } = transpiled('src/shared/intro/score.ts', { './timeline': timeline });
  assert.equal(FILM_SECONDS, 30);
  assert.equal(16 * 4 * 60 / BPM, FILM_SECONDS);
  const notes = composeScore();
  assert.deepEqual(notes, composeScore());
  assert.ok(notes.length > 200 && notes.length < 600);
  assert.ok(notes.every(note => note.at >= 0 && note.at < FILM_SECONDS && note.length > 0 && note.level > 0 && Math.abs(note.pan) <= 1));
  assert.deepEqual([...new Set(notes.map(note => note.voice))].sort(), ['bass', 'bell', 'hat', 'kick', 'pad', 'tick']);
  assert.ok(notes.some(note => note.at >= 27 && note.voice === 'bell'));
  assert.ok(!notes.some(note => note.at >= 26.25 && note.voice === 'tick'));
  const score = read('src/shared/intro/score.ts');
  assert.doesNotMatch(score, /fetch\(|https?:|setInterval/);
  assert.match(score, /removeAttribute\('src'\)/);
  assert.ok(existsSync(resolve(root, 'public/assets/genesis-intro-score.mp3')));
  const musicBytes = statSync(resolve(root, 'public/assets/genesis-intro-score.mp3')).size;
  assert.ok(musicBytes > 350_000 && musicBytes < 800_000, 'bounded pre-rendered stereo track');
});

test('the film tells a complete prompt-to-schematic-to-layout story in thirty seconds', () => {
  const { filmCues, filmCue, filmTime, FILM_SECONDS } = transpiled('src/shared/intro/timeline.ts');
  assert.deepEqual(filmCues.map(cue => cue.id), ['prompt', 'schematic', 'joint', 'layout', 'verify', 'closing']);
  assert.equal(filmCues[0].from, 0);
  assert.equal(filmCues.at(-1).to, FILM_SECONDS);
  filmCues.forEach((cue, i) => { assert.ok(cue.to - cue.from >= 3); if (i) assert.equal(cue.from, filmCues[i - 1].to); });
  for (let time = 0; time <= FILM_SECONDS; time += .1) {
    const cue = filmCue(time); assert.ok(cue.opacity >= 0 && cue.opacity <= 1);
  }
  assert.equal(filmCue(30).id, 'closing');
  assert.equal(filmTime(60), '1:00'); assert.equal(filmTime(59.9), '0:59');
  assert.equal(filmCue(5).id, 'schematic', 'the request does not spend ten seconds drifting');
  assert.equal(filmCue(11).id, 'joint');
  assert.equal(filmCue(19).id, 'layout');
});

const frontEndModel = () => transpiled('src/shared/intro/frontEndScene.ts', {
  './timeline': transpiled('src/shared/intro/timeline.ts'), '../pixelLayout': transpiled('src/shared/pixelLayout.ts'),
});
test('assembly fills the film before the closing brand reveal and starts after the illustrated LLM click', () => {
  const { llmClickAt, parts, partState, requestState } = frontEndModel();
  assert.equal(requestState(1), 'request'); assert.equal(requestState(2.2), 'pressed');
  assert.equal(requestState(25), 'thinking'); assert.equal(requestState(26), 'ready');
  parts.forEach(part => {
    assert.ok(part.start > llmClickAt);
    assert.equal(partState(part, llmClickAt).appear, 0);
    assert.equal(partState(part, part.start).appear, 0);
    assert.equal(partState(part, part.start + .8).appear, 1);
  });
  assert.ok(Math.max(...parts.map(part => part.start)) > 20);
  const dictionary = JSON.parse(read('src/content/tr.json'));
  for (const copy of ['Send to GENESIS', 'Request received', 'Thinking', 'Circuit assembled', 'Illustrated LLM interaction']) assert.ok(dictionary[copy], copy);
});

test('LNA and PA contain complete amplifier structures and retain port connections during resizing', () => {
  const { hierarchy, parts, connections, connectionState, portPosition } = frontEndModel();
  assert.equal(hierarchy.id, 'front-end');
  for (const id of ['lna', 'pa']) {
    const circuit = hierarchy.children.find(child => child.id === id);
    const children = circuit.children.map(id => parts.find(part => part.id === id));
    assert.equal(children.filter(part => part.kind === 'mos').length, 2);
    assert.equal(children.filter(part => part.kind === 'pixel').length, 3);
    assert.equal(children.filter(part => part.kind === 'capacitor').length, 2);
    assert.equal(children.filter(part => part.kind === 'choke').length, 1);
  }
  assert.equal(parts.filter(part => part.kind === 'mixer').length, 2);
  for (let time = 0; time <= 30; time += .5) for (const edge of connections) {
    const state = connectionState(edge, time);
    assert.deepEqual(state.points[0], portPosition(edge.from, time));
    assert.deepEqual(state.points.at(-1), portPosition(edge.to, time));
    assert.ok(state.points.flat().every(Number.isFinite));
    assert.ok(state.progress >= 0 && state.progress <= 1);
  }
});

test('pixel topology, footprint and transistor sizing change together until the final product shot', () => {
  const { parts, partState, pixelCandidates, designTimes, designState, sceneCopy } = frontEndModel();
  assert.ok(designTimes.at(-1) >= 24); assert.equal(designState(26).blend, 1);
  for (const part of parts.filter(part => part.kind === 'pixel')) {
    const variants = pixelCandidates.get(part.id);
    assert.ok(variants.length >= 12);
    for (let i = 1; i < variants.length; i++) assert.notDeepEqual(variants[i].metal, variants[i - 1].metal);
    assert.notEqual(partState(part, 22).width, partState(part, 26).width);
  }
  for (const part of parts.filter(part => part.kind === 'mos')) {
    assert.notEqual(partState(part, 22).fingers, partState(part, 26).fingers);
    assert.notEqual(partState(part, 22).fingerLength, partState(part, 26).fingerLength);
  }
  const dictionary = JSON.parse(read('src/content/tr.json'));
  sceneCopy.forEach(copy => assert.ok(dictionary[copy], `Scene translation: ${copy}`));
  const renderer = read('src/shared/intro/frontEndFilm.ts');
  assert.match(renderer, /new WebGLRenderer/); assert.match(renderer, /new PerspectiveCamera/);
  assert.match(renderer, /new InstancedMesh/); assert.match(renderer, /renderer.forceContextLoss/);
  assert.doesNotMatch(renderer, /getContext\('2d'|CanvasTexture|Math.random/);
});

test('the GENESIS symbol stays consistent and opens without a full-screen flash', () => {
  const { emblem, emblemMark, drawEmblem } = transpiled('src/shared/emblem.ts');
  for (const [grid, size] of [[emblem, 64], [emblemMark, 32]]) {
    assert.equal(grid.length, size);
    assert.ok(grid.every(row => row.length === size && row.every((cell, c) => cell === row[size - 1 - c])));
  }
  const count = kind => emblem.flat().filter(cell => cell === kind).length;
  assert.ok(count(1) > 900 && count(2) > 100 && count(3) === 32);
  assert.deepEqual(drawEmblem(64), emblem);
  const symbol = read('src/shared/Emblem.tsx');
  assert.match(symbol, /onClick=\{onLaunch\}/);
  assert.doesNotMatch(symbol, /setTimeout|createPortal|setFlash/);
  assert.match(read('src/styles/emblem.css'), /prefers-reduced-motion: reduce/);
});

test('pixelated passives look like the ones in our papers: hundreds of pixels, every port connected, mirrored where symmetric', () => {
  const { pixelPassives } = transpiled('src/shared/pixelLayout.ts');
  const edge = (layout, port) => Array.from({ length: port.width ?? 2 }, (_, i) => port.at + i).map(i =>
    port.side === 'left' ? [i, 0] : port.side === 'right' ? [i, layout.columns - 1] : port.side === 'top' ? [0, i] : [layout.rows - 1, i]);
  for (const [name, layout] of Object.entries(pixelPassives)) {
    const cells = layout.columns * layout.rows, metal = layout.metal.flat().filter(Boolean).length;
    assert.ok(cells >= 168 && metal / cells > .35 && metal / cells < .75, `${name}: ${metal} of ${cells}`);
    // Every port starts on metal and all of them are joined through it.
    const seen = layout.metal.map(row => row.map(() => false)), queue = [edge(layout, layout.ports[0])[0]];
    seen[queue[0][0]][queue[0][1]] = true;
    while (queue.length) {
      const [r, c] = queue.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (layout.metal[r + dr]?.[c + dc] && !seen[r + dr][c + dc]) { seen[r + dr][c + dc] = true; queue.push([r + dr, c + dc]); }
    }
    for (const port of layout.ports) for (const [r, c] of edge(layout, port)) assert.ok(layout.metal[r][c] && seen[r][c], `${name}: port ${port.side} ${port.at}`);
  }
  const { divider, coupler } = pixelPassives;
  assert.ok(divider.columns * divider.rows >= 300, 'the EM screen shows a few hundred pixels, not a toy grid');
  assert.ok(divider.metal.every((row, r) => row.every((on, c) => on === divider.metal[divider.rows - 1 - r][c])), 'an equal split is symmetric');
  assert.ok(coupler.metal.every((row, r) => row.every((on, c) => on === coupler.metal[r][coupler.columns - 1 - c] && on === coupler.metal[coupler.rows - 1 - r][c])));
  // These layouts remain in the EM and physical-design screens, independent of the introductory film.
  const screens = read('src/shared/StageScreens.tsx');
  assert.match(screens, /pixelPassives\.divider/);
  assert.match(screens, /pixelPassives\.frontEnd/);
  assert.doesNotMatch(screens, /const pixels = \[/);
});

test('the membership speaks for a general RFIC design system, and the silicon demonstration names no bands, companies or dates', () => {
  const content = JSON.parse(read('src/content/site.json'));
  const dictionary = JSON.parse(read('src/content/tr.json'));
  const { membership, silicon } = content;
  // General, not one application: front-ends and specialised circuits, with nothing that narrows it down.
  const general = [membership.headline, membership.headlineAccent, membership.intro, silicon.eyebrow, silicon.headline, silicon.headlineAccent, silicon.intro,
    ...silicon.steps.flatMap(step => [step.title, step.detail]), silicon.record, silicon.recordAction];
  assert.match(membership.intro, /general RFIC design system/);
  assert.match(membership.headlineAccent, /front-ends to specialised circuits/);
  assert.doesNotMatch(general.join(' '), /\d|GHz|radar|automotive|GlobalFoundries|STMicro|imec|IC-Link|MPW|partner/i);
  for (const copy of general) assert.ok(dictionary[copy], copy);
  // How the system is shown in silicon: specification, design in GENESIS, tape-out, measurement; joined, not numbered.
  assert.deepEqual(silicon.steps.map(step => step.title), ['Specification', 'Design in GENESIS', 'Tape-out', 'Measurement']);
  const page = read('src/pages/Explore.tsx');
  assert.match(page, /<ol className="silicon-steps">\{site\.silicon\.steps\.map\(step => <li key=\{step\.title\}><Icon name=\{step\.icon\} \/><h3>\{step\.title\}<\/h3><p>\{step\.detail\}<\/p><\/li>\)\}<\/ol>/);
  assert.doesNotMatch(page.slice(page.indexOf('<section id="silicon"'), page.indexOf('<Services ')), /padStart|step-number/);
  assert.match(page, /<a href="#\/explore\/portfolio">\{site\.silicon\.recordAction\}/); // The record points at the fabricated designs.
  assert.match(read('src/styles/site.css'), /\.silicon-steps::before \{ content: ''; position: absolute;/);
  for (const exporter of ['scripts/export-public.mjs'].filter(path => existsSync(resolve(root, path)))) assert.match(read(exporter), /'membership', 'silicon', 'services'/); // The section's content is published.
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
