// The promo's recorded scenes. setup() brings the workbench to the scene's starting state off camera; film() is the
// on-camera action and marks where each shot starts; shows names what the frames contain, for the manifest and the
// scene table. Typing is quick and model waits are cut, so the clips hold only what the app does.
import { readFileSync } from 'node:fs';
const TEMPLATE = 'SPDT · Series–shunt · no input capacitor';
const PROMPT = 'I want a broadband RF switch with low loss and high isolation.';
const QUESTION = 'What analyses and bias states are configured in my current circuit? Check its actual Maestro plan and explain the setup briefly.';
// The recorded optimization run the Optimize take opens: its id as the workbench lists it.
const RUN = process.env.GENESIS_RECORD_RUN;
const hold = (page, seconds) => page.waitForTimeout(seconds * 1000);
const visible = (page, text) => page.locator('button:visible', { hasText: text });

async function openWorkbench(page, base) {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Skip/ }).first().click();
  await page.getByRole('img', { name: 'Schematic grid', exact: true }).waitFor();
}

async function loadTemplate(page, base) {
  await openWorkbench(page, base);
  await page.getByRole('button', { name: /^Load design/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Load design', exact: true });
  await dialog.getByRole('button', { name: TEMPLATE, exact: true }).click();
  await dialog.getByRole('button', { name: 'Apply template', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('[data-stage=schematic] [data-part-id]').first().waitFor();
}

/** Color mode on, blocks and testbench regenerated: the Blocks stage is current. */
async function regenerateBlocks(page) {
  await visible(page, /Next: Colou?r blocks/).click();
  await hold(page, .6);
  await visible(page, 'Regenerate blocks & TB').click();
  await page.locator('.workflow-stages [aria-current=step]', { hasText: 'Blocks' }).waitFor({ timeout: 120000 });
  await page.locator('.circuit-arrangement').waitFor({ timeout: 120000 });
}
const stage = (page, name) => page.locator('.workflow-stages').getByRole('button', { name, exact: true }).click();
/** Cuts the model's thinking out of the clip: the recording pauses until GENESIS has answered. */
async function untilAnswered(page, rec) {
  rec.pause();
  await page.waitForTimeout(800);
  await page.waitForFunction(() => !/Shaping your design|answering another request/.test(document.body.innerText), null, { timeout: 300000, polling: 300 });
  // The reply has finished revealing (its text, cards and any proposal), so the next check sees all of it.
  await page.waitForFunction(() => [...document.querySelectorAll('.assistant-reply')].pop()?.dataset.replyPhase === 'complete', null, { timeout: 60000, polling: 300 }).catch(() => {});
  await page.waitForTimeout(600);
  await rec.resume();
}
const BAND = 'Broadband, DC to 110 GHz.';
const { circuits } = JSON.parse(readFileSync(new URL('./circuits.json', import.meta.url), 'utf8'));
const SHAPE = 'Your circuit, taking shape';

/** Sends the prompt on the landing page and answers GENESIS until its schematic proposal arrives. A question with choice
 * cards gets the first card named in design.choose, else the recommended one; a question without cards gets the first
 * answer whose topic matches it, else "Use your recommendation.". Each answer is kept in evidence.answers. Model waits are cut. */
async function converse(page, rec, design, evidence) {
  evidence.answers = [];
  const box = page.getByPlaceholder('Describe your circuit…');
  await box.fill(design.prompt);
  rec.mark('typed');
  await hold(page, 1.4);
  await box.press('Enter');
  await untilAnswered(page, rec);
  // A proposal is a reply that can be approved; a template-based one also shows its construction card.
  const approve = () => page.locator('.assistant-message.assistant').last().getByRole('button', { name: /Approve · open schematic/ });
  // The app's own check can reject a proposal; its message goes back to the model, as a user would send it.
  const rejected = () => page.locator('.assistant-message.assistant').last().getByText(/^Proposal needs correction/);
  for (let step = 1; !(await approve().count()) || await rejected().count(); step++) {
    if (step > 8) throw new Error(`No valid schematic proposal after eight answers: ${design.prompt}`);
    rec.mark(`answer${step}`);
    if (await rejected().count()) {
      const reason = (await rejected().last().innerText()).replace(/^Proposal needs correction:\s*/, '');
      await hold(page, 2.2);
      evidence.answers.push({ step, text: `The preview rejected the proposal: ${reason} Please return the complete corrected schematic.` });
      await box.fill(evidence.answers.at(-1).text);
      await hold(page, .8);
      await box.press('Enter');
      await untilAnswered(page, rec);
      continue;
    }
    const cards = 'button.choice-select:visible:not([disabled])';
    let pick = null;
    for (const name of [...design.choose.map(n => `${cards}[aria-label="Explore ${n}"]`), `${cards}:has(.choice-recommendation)`]) {
      if (await page.locator(name).count()) { pick = page.locator(name).last(); break; }
    }
    if (pick) {
      await pick.scrollIntoViewIfNeeded();
      await hold(page, 2.6);
      evidence.answers.push({ step, card: (await pick.getAttribute('aria-label')).replace(/^Explore /, '') });
      await pick.click();
    } else {
      // Answer the question GENESIS asks (its last sentence ending in a question mark), not the whole reply.
      const reply = await page.locator('.assistant-message.assistant').last().innerText();
      const asked = (reply.match(/[^.?!]*\?/g)?.pop() ?? reply).toLowerCase();
      const answer = design.answers.find(([topic]) => new RegExp(topic).test(asked))?.[1] ?? 'Use your recommendation.';
      evidence.answers.push({ step, text: answer });
      await hold(page, 2.2);
      await box.fill(answer);
      await hold(page, .8);
      await box.press('Enter');
    }
    await untilAnswered(page, rec);
  }
  const card = (await page.getByText(SHAPE, { exact: false }).count()) ? page.getByText(SHAPE, { exact: false }).last() : approve();
  await card.evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  rec.mark('proposal');
}
/** Approves the proposal into the workbench, fits the schematic and marks it; the approved draft (the workbench's own
 * export JSON) goes into the take's evidence, so the same circuit can be laid out later. */
async function approveSchematic(page, rec, evidence) {
  await page.getByRole('button', { name: /Approve · open schematic/ }).last().click();
  await page.locator('[data-stage=schematic] [data-part-id]').first().waitFor({ timeout: 60000 });
  await hold(page, 1.2);
  await page.getByRole('button', { name: 'Fit', exact: true }).first().click().catch(() => {});
  rec.mark('schematic');
  evidence.circuit = JSON.parse(await page.locator('.schematic-runner details pre').first().textContent());
}
const landing = async (page, base) => {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
};
const connect = page => page.getByRole('button', { name: /^Use gpt/ }).first().click();

const scrollTo = (locator, block) => locator.evaluate((e, b) => e.scrollIntoView({ block: b, behavior: 'smooth' }), block);

export const recordedScenes = [
  {
    id: 'S1_conversation', shows: `One take on the real landing page: the light and the chat box come in, the prompt "${PROMPT}" is sent to gpt-5.6-luna, GENESIS's questions are answered (named or recommended choice cards are clicked; the band is "${BAND}"), its schematic proposal takes shape and is approved into the workbench, then Color and Regenerate blocks & TB open the Blocks stage. Model waits are cut`,
    async setup(page) { await page.goto('about:blank'); },
    async film(page, base, rec, evidence) {
      rec.mark('landing');
      await landing(page, base);
      await hold(page, 4.2);
      await connect(page);
      await hold(page, .5);
      await converse(page, rec, { ...circuits.find(c => c.id === 'A_spdt'), prompt: PROMPT }, evidence);
      await hold(page, 6);
      await page.getByRole('button', { name: /Approve · open schematic/ }).last().click();
      await page.locator('[data-stage=schematic] [data-part-id]').first().waitFor({ timeout: 60000 });
      rec.mark('schematic');
      await hold(page, 4.5);
      rec.mark('blocks');
      await visible(page, /Next: Colou?r blocks/).click();
      await hold(page, 1.6);
      await visible(page, 'Regenerate blocks & TB').click();
      rec.pause();
      await page.locator('.circuit-arrangement').waitFor({ timeout: 180000 });
      await hold(page, .5);
      await rec.resume();
      await hold(page, 2.5);
      await scrollTo(page.locator('.circuit-arrangement'), 'end');
      await hold(page, 3.5);
    },
  },
  // Any circuit you want: one take per circuit in circuits.json, from the prompt to its schematic proposal.
  ...circuits.map(design => ({
    id: design.id, shows: `A real conversation on the landing page: "${design.prompt}" is sent to gpt-5.6-luna, GENESIS's questions are answered and its schematic proposal for the ${design.title.toLowerCase()} arrives and is approved into the workbench schematic. Model waits are cut`,
    async setup(page, base) { await landing(page, base); await hold(page, 4); await connect(page); await hold(page, 1); },
    async film(page, base, rec, evidence) {
      await hold(page, .4);
      await converse(page, rec, design, evidence);
      await hold(page, 2.5);
      await approveSchematic(page, rec, evidence);
      await hold(page, 7);
    },
  })),
  {
    id: 'S1_prompt', shows: `Landing page; the prompt "${PROMPT}" is typed`,
    async setup(page, base) { await page.goto(`${base}/`, { waitUntil: 'networkidle' }); await hold(page, 3); },
    async film(page, base, rec) {
      await hold(page, .4);
      await page.getByPlaceholder('Describe your circuit…').pressSequentially(PROMPT, { delay: 12 });
      rec.mark('typed');
      await hold(page, 2.5);
    },
  },
  {
    id: 'S2_assistant', shows: 'Circuit Assistant (gpt-5.6-luna) asked about the Maestro plan; the question is pasted, the model wait is cut; reply with tool activity',
    async setup(page, base) {
      await loadTemplate(page, base);
      await page.getByRole('button', { name: 'Circuit Assistant', exact: true }).first().click();
      await page.getByRole('button', { name: /^Use gpt/ }).first().click();
      await page.getByRole('textbox', { name: 'Message Circuit Assistant' }).waitFor();
      await hold(page, 1.5);
    },
    async film(page, base, rec) {
      await hold(page, .4);
      const box = page.getByRole('textbox', { name: 'Message Circuit Assistant' });
      await box.fill(QUESTION);
      await hold(page, .6);
      await box.press('Enter');
      await hold(page, 1);
      rec.pause();
      await page.locator('.assistant-message.assistant .assistant-reply[data-reply-phase=complete]').last().waitFor({ timeout: 240000 });
      await hold(page, .5);
      await rec.resume();
      rec.mark('reply');
      await hold(page, 5);
    },
  },
  {
    id: 'C2_design', shows: `One take: Schematic of "${TEMPLATE}" replayed part by part, then Color and Regenerate blocks & TB open the Blocks stage; the view scrolls down the circuit arrangement`,
    async setup(page, base) {
      await loadTemplate(page, base);
      await page.getByRole('button', { name: 'Hide parts catalog' }).first().click();
      await page.getByRole('button', { name: 'Fit', exact: true }).first().click();
      await hold(page, 1);
    },
    async film(page, base, rec) {
      rec.mark('schematic');
      await hold(page, .3);
      await page.getByRole('button', { name: 'Replay construction', exact: true }).click();
      await hold(page, 3.8);
      rec.mark('blocks');
      await regenerateBlocks(page);
      const grid = page.locator('.circuit-arrangement');
      await scrollTo(grid, 'start');
      await hold(page, 2);
      await scrollTo(grid, 'end');
      await hold(page, 3);
    },
  },
  {
    id: 'C3_analysis', shows: 'One take: Analyses & Variables test matrix (SP, Port 2 ON / Port 3 ON), then Optimize with the recorded run GENESIS_RECORD_RUN',
    async setup(page, base) {
      await loadTemplate(page, base);
      await regenerateBlocks(page);
      await stage(page, 'Analyses & Variables');
      await page.getByRole('button', { name: /States & simulations/ }).click();
      await hold(page, 2);
    },
    async film(page, base, rec) {
      rec.mark('analyses');
      await hold(page, 4);
      rec.mark('optimize');
      await stage(page, 'Optimize');
      await hold(page, .8);
      await page.getByLabel('Recorded optimization run', { exact: true }).selectOption(RUN ?? (() => { throw new Error('Set GENESIS_RECORD_RUN'); })());
      await page.locator('.optimize-run-status strong').first().waitFor({ timeout: 30000 });
      await hold(page, 5);
    },
  },
  {
    id: 'C4_floorplan', shows: 'One take: Physical flow of the SPDT config through Placement, Routing, Tiling and Verify, each with its layout capture from the stage record; the final layout opens full size and zooms in',
    async setup(page, base) {
      await page.goto(`${base}/?view=flow`, { waitUntil: 'networkidle' });
      await page.locator('.flow-capture img').first().waitFor({ timeout: 30000 });
      await hold(page, 1.5);
    },
    async film(page, base, rec) {
      const main = name => page.locator('.flow-rail[aria-label="Main stages"] button', { hasText: name }).click();
      rec.mark('placement');
      await hold(page, 1.8);
      await main('Routing');
      await hold(page, 1.8);
      await main('Tiling');
      await hold(page, 1.8);
      rec.mark('verify');
      await main('Verify');
      await hold(page, 1.8);
      await page.locator('.flow-capture-open').first().click();
      await hold(page, 1.2);
      const zoomIn = page.getByRole('button', { name: 'Zoom in' }).locator('visible=true').last();
      for (let i = 0; i < 3; i++) { await zoomIn.click(); await hold(page, .35); }
      await hold(page, 1.5);
    },
  },
  {
    id: 'C5_3d', shows: 'The offline 3D viewer (circuit_3d.html) the floorplan flow writes for chip C1, opened from the chip showcase; density fill hidden; orbit by mouse',
    async setup(page, base) {
      // GENESIS_VIEWER_URL films a freshly written circuit_3d.html (served statically) instead of the showcase's copy.
      await page.goto(process.env.GENESIS_VIEWER_URL ?? `${base}/api/report/chip-showcase/c1/viewer`, { waitUntil: 'load', timeout: 240000 });
      await page.locator('canvas').first().waitFor();
      await hold(page, 4);
      // Density fill off (the fill envelopes take most of the draw time without a GPU; the chip itself stays whole). The
      // viewer opens with its side panels closed.
      await page.evaluate(() => { const fill = document.querySelector('#fill-toggle'); if (fill?.getAttribute('aria-pressed') === 'true') fill.click(); });
      await hold(page, 1);
      await page.keyboard.press('f');
      await hold(page, 2);
    },
    async film(page, base, rec) {
      // The drag starts and ends on empty canvas, so no hover card opens over the chip.
      const box = await page.locator('canvas').first().boundingBox();
      const x0 = box.x + 80, y0 = box.y + box.height - 120;
      await page.mouse.move(x0, y0);
      rec.mark('orbit');
      await hold(page, .3);
      await page.mouse.down();
      for (let i = 1; i <= 16; i++) await page.mouse.move(x0 - i * 4, y0 - i * 2.5);
      await page.mouse.up();
      await hold(page, 1.5);
    },
  },
  {
    id: 'C6_signal', shows: 'The offline 3D viewer of chip C1 with Connect → MarkNet open: the signal path from rf_pad_1_1 (PORT1) lit along its saved MarkNet shapes, pad to both outputs',
    // Software WebGL draws this chip too slowly for a screencast, so the camera is stepped: one screenshot per frame.
    stepped: true,
    async setup(page, base) {
      await page.goto(process.env.GENESIS_VIEWER_URL ?? `${base}/circuit_3d.html`, { waitUntil: 'load', timeout: 240000 });
      await page.waitForFunction(() => window.viewerReady === true || window.viewerError, null, { timeout: 240000 });
      if (await page.evaluate(() => window.viewerError || null)) throw new Error('The viewer failed to load');
      await page.evaluate(() => { const fill = document.querySelector('#fill-toggle'); if (fill?.getAttribute('aria-pressed') === 'true') fill.click(); });
      await page.evaluate(() => layoutViewer.workspace.open('connections', 'marknet'));
      await page.evaluate(() => layoutViewer.nativeConnectivity.signal.start('rf_pad_1_1'));
      await page.evaluate(() => layoutViewer.nativeConnectivity.signal.at(0));
      await hold(page, 3);
    },
    async film(page, base, rec) {
      // Each step is drawn, then filmed for one frame: the path advances at an even pace on screen whatever the draw time.
      const span = await page.evaluate(() => layoutViewer.nativeConnectivity.signal.state().span_um), steps = 120;
      rec.mark('signal');
      await rec.frame(.8);
      for (let i = 1; i <= steps; i++) {
        await page.evaluate(d => layoutViewer.nativeConnectivity.signal.at(d), span * i / steps);
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        await rec.frame();
      }
      await rec.frame(2);
    },
  },
  {
    id: 'S8_finishing', shows: 'Circuit Finishing Screen: emblem, GENESIS, "Whatever you want to design."',
    async setup(page) { await page.goto('about:blank'); },
    async film(page, base) { await page.goto(`${base}/?presentation=finish`, { waitUntil: 'domcontentloaded' }); await hold(page, 6); },
  },
];
