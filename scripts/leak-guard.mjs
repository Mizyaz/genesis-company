// The guard every export passes before it writes into the repo: it refuses text that holds an absolute path, a sha256 or
// one of the private words (the server's user, host and path roots). The private words are never tracked: they come from
// .leak-words at the repo root (one per line, gitignored) or from GENESIS_LEAK_WORDS (comma separated). Without either,
// the guard fails closed and the export stops.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LIST = resolve(import.meta.dirname, '..', '.leak-words');
/** An absolute path (/x/y/...), at the start of the text or after a space, a quote, a bracket or an equals sign. */
export const ABSOLUTE_PATH = /(?:^|[\s"'(=])\/(?:[\w.-]+\/)+/;
const escape = word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The private words, from GENESIS_LEAK_WORDS or .leak-words; undefined when neither is there. */
export function privateWords() {
  const listed = process.env.GENESIS_LEAK_WORDS?.split(',') ?? (existsSync(LIST) ? readFileSync(LIST, 'utf8').split('\n') : undefined);
  return listed?.map(w => w.trim()).filter(w => w && !w.startsWith('#'));
}

/** The private words as one pattern; undefined without a list. */
export function privatePattern() {
  const words = privateWords();
  return words?.length ? new RegExp(words.map(escape).join('|'), 'i') : undefined;
}

/** Throws when `text` holds an absolute path, sha256, a private word or one of `extra` (regex sources); `what` names it. */
export function guard(text, what, extra = []) {
  const words = privatePattern();
  if (!words) throw new Error(`No private word list: create ${LIST} (one word per line: the server's user name, host name and path roots) or set GENESIS_LEAK_WORDS, then export again`);
  const hit = ABSOLUTE_PATH.exec(text) ?? new RegExp(['sha256', ...extra].join('|'), 'i').exec(text) ?? words.exec(text);
  if (hit) throw new Error(`${what} holds "${hit[0].trim()}"`);
}
