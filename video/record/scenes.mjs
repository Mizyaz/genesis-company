// The promo's recorded scenes. setup() brings the workbench to the scene's starting state off camera; film() is the
// on-camera action and marks where each shot starts; shows names what the frames contain, for the manifest and the
// scene table. Typing is quick and model waits are cut, so the clips hold only what the app does.
const TEMPLATE = 'SPDT · Series–shunt · no input capacitor';
const PROMPT = 'I want a broadband RF switch with low loss and high isolation.';
const QUESTION = 'What analyses and bias states are configured in my current circuit? Check its actual Maestro plan and explain the setup briefly.';
const RUN = '736ce548eab37b97cc4ffe65206c2cb1558c8d810be65f9c93e8ea8ac88bb25d'; // spdt_halfturn_qa_cma_20261020/run_r6_manager
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
const scrollTo = (locator, block) => locator.evaluate((e, b) => e.scrollIntoView({ block: b, behavior: 'smooth' }), block);

export const recordedScenes = [
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
    id: 'C2_design', shows: `One take: Schematic of "${TEMPLATE}" on GF22FDX replayed part by part, then Color and Regenerate blocks & TB open the Blocks stage; the view scrolls down the circuit arrangement`,
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
    id: 'C3_analysis', shows: 'One take: Analyses & Variables test matrix (SP, Port 2 ON / Port 3 ON), then Optimize with recorded run spdt_halfturn_qa_cma_20261020/run_r6_manager',
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
      await page.getByLabel('Recorded optimization run', { exact: true }).selectOption(RUN);
      await page.locator('.optimize-run-status strong').first().waitFor({ timeout: 30000 });
      await hold(page, 5);
    },
  },
  {
    id: 'C4_floorplan', shows: 'One take: Physical flow of the C4.1 r1 config through Placement, Routing, Tiling and Verify, each with its layout capture from the stage record; the final layout opens full size and zooms in',
    async setup(page, base) {
      await page.goto(`${base}/?view=flow`, { waitUntil: 'networkidle' });
      await page.locator('.flow-capture img').first().waitFor({ timeout: 30000 });
      await hold(page, 1.5);
    },
    async film(page, base, rec) {
      const main = name => page.locator('.flow-rail[aria-label="Main stages"] button', { hasText: name }).click();
      rec.mark('placement');
      await hold(page, 2.4);
      await main('Routing');
      await hold(page, 2.4);
      await main('Tiling');
      await hold(page, 2.4);
      rec.mark('verify');
      await main('Verify');
      await hold(page, 2);
      await page.locator('.flow-capture-open').first().click();
      await hold(page, 1.8);
      const zoomIn = page.getByRole('button', { name: 'Zoom in' }).locator('visible=true').last();
      for (let i = 0; i < 3; i++) { await zoomIn.click(); await hold(page, .45); }
      await hold(page, 2.5);
    },
  },
  {
    id: 'S8_finishing', shows: 'Circuit Finishing Screen: emblem, GENESIS, "Whatever you want to design."',
    async setup(page) { await page.goto('about:blank'); },
    async film(page, base) { await page.goto(`${base}/?presentation=finish`, { waitUntil: 'domcontentloaded' }); await hold(page, 6); },
  },
];
