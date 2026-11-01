// The fund film speaks to investors, so the story cut it shows names no tool, rule deck or drawing step (Islam, 11-01):
// every caption, chapter and panel title the story paints passes these rewrites, as publicWords does for the public film.
// Whole texts are matched with ^…$; the words after them are a fallback for texts the list does not name.
const WHOLE: [RegExp, string][] = [
  [/^GENESIS proposes your schematic\.$/, 'GENESIS proposes your circuit.'],
  [/^GENESIS draws your schematic on your PDK\.$/, 'GENESIS draws your circuit for the chip factory.'],
  [/^GENESIS explores passive shapes and metal layers\.$/, 'GENESIS explores the shape of every part.'],
  [/^GENESIS sizes your passives and (?:switch FETs|transistors) together\.$/, 'GENESIS sizes every part together.'],
  [/^GENESIS brings your best passive designs\.$/, 'GENESIS finds the best parts.'],
  [/^Identify your trade-offs from multiple designs\.$/, 'Compare the trade-offs across many designs.'],
  [/^GENESIS splits your circuit into layout blocks\.$/, 'GENESIS splits your circuit into blocks.'],
  [/^GENESIS joins your blocks: pads, RF lines and bias nets\.$/, 'GENESIS connects your blocks.'],
  [/^GENESIS turns your blocks into a layout\.$/, 'GENESIS places your blocks on the chip.'],
  [/^GENESIS routes your RF and (?:bias|DC) lines\.$/, 'GENESIS connects the signal and power lines.'],
  [/^GENESIS tiles your ground and fill\.$/, 'GENESIS finishes the chip for manufacturing.'],
  [/^GENESIS validates your layout with DRC and LVS\.$/, 'GENESIS checks the chip against the factory\'s rules.'],
  [/^GENESIS builds your layout in 3D\.$/, 'GENESIS shows your chip in 3D.'],
  [/^Schematic$/, 'Circuit'], [/^Layout$/, 'Chip design'], [/^Floorplanner stages$/, 'Design steps'],
  [/^Essentials$/, 'Parts placed'], [/^RF lines$/, 'Signal lines'], [/^(?:Bias|DC) lines$/, 'Power lines'], [/^Ground and fill tiling$/, 'Finishing'],
];
const WORDS: [RegExp, string][] = [[/\bPDK\b/g, 'process'], [/\blayouts?\b/gi, 'design'], [/\bschematics?\b/gi, 'circuit']];

const keepCase = (found: string, word: string) => found[0] === found[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;

/** A text with the whole-text rewrite, then the word fallback. */
export function plainText(text: string) {
  let out = text;
  for (const [re, to] of WHOLE) out = out.replace(re, to);
  for (const [re, to] of WORDS) out = out.replace(re, found => keepCase(found, to));
  return out;
}

const words = (line: Element) => Array.from(line.children).map(word => word.textContent ?? '').join(' ');
/** A caption line: a div of two or more inline-block word spans, each word rising on its own (Caption). */
const isLine = (el: Element) => el.tagName === 'DIV' && el.children.length > 1 && Array.from(el.children).every(c => c.tagName === 'SPAN' && (c as HTMLElement).style.display === 'inline-block');

/** Puts a rewritten caption back into its word spans: the GENESIS span keeps its gradient, each other span takes one word,
 * the last span the rest, and spans left over go empty. Only text nodes change, never the nodes React holds. */
function rewriteLine(line: Element) {
  const now = words(line), shown = plainText(now);
  if (shown === now) return;
  const spans = Array.from(line.children), next = shown.split(' ');
  const from = spans[0].textContent === next[0] ? 1 : 0;
  spans.slice(from).forEach((span, i) => {
    const k = from + i, word = k < spans.length - 1 ? next[k] ?? '' : next.slice(k).join(' ');
    // The span's own text node takes the word, so React's next caption still lands in the node it holds.
    const text = Array.from(span.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (text && text.nodeValue !== word) text.nodeValue = word;
  });
}

function rewrite(node: Node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  if (!el) return;
  // The caption line around the change (a word span or the text in it), then every line and text under the change.
  for (let up: Element | null = el, i = 0; up && i < 4; up = up.parentElement, i++) if (isLine(up)) { rewriteLine(up); break; }
  if (node.nodeType === Node.ELEMENT_NODE) [el, ...Array.from(el.querySelectorAll('div'))].filter(isLine).forEach(rewriteLine);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text.parentElement?.parentElement && isLine(text.parentElement.parentElement)) continue;
    const now = text.nodeValue ?? '', shown = plainText(now);
    if (shown !== now) text.nodeValue = shown;
  }
}

/** Rewrites the texts under root now and whenever React paints new ones (the observer runs before the frame is taken). */
export function watchPlainWords(root: HTMLElement) {
  rewrite(root);
  const observer = new MutationObserver(changes => changes.forEach(change => change.type === 'characterData' ? rewrite(change.target) : change.addedNodes.forEach(rewrite)));
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  return () => observer.disconnect();
}
