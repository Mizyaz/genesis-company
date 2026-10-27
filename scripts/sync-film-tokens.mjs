// The film tokens of the GENESIS design library (the "film" section of content/design_library/tokens.json, the
// colours the app and the site share) into src/content/film.json, with the commit they were copied from. The tokens are
// read with git show at a ref (HEAD of the given checkout by default, or --ref, e.g. origin/main), never from the
// working file, so the recorded commit holds exactly these tokens whatever state the checkout is in. The site builds
// from the copy alone; the static test compares it with GENESIS when GENESIS_TOKENS names a GENESIS checkout.
//   node scripts/sync-film-tokens.mjs <GENESIS checkout, or its tokens.json> [--ref <git ref>]
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
export const COPY = resolve(root, 'src/content/film.json');
const TOKENS = 'content/design_library/tokens.json';

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });

/** The film section of GENESIS tokens.json at a ref, and the commit that last changed it there. `path` is a GENESIS
 * checkout (any folder in it) or its tokens.json. */
export function committedFilm(path, ref = 'HEAD') {
  const real = realpathSync(path), dir = statSync(real).isDirectory() ? real : dirname(real);
  const top = git(dir, 'rev-parse', '--show-toplevel').trim(), file = statSync(real).isDirectory() ? TOKENS : relative(top, real);
  const commit = git(top, 'log', '-1', '--format=%H', ref, '--', file).trim();
  if (!commit) throw new Error(`${file} has no commit at ${ref}`);
  const film = JSON.parse(git(top, 'show', `${commit}:${file}`)).film;
  if (!film || typeof film !== 'object') throw new Error(`no "film" section in ${file} at ${ref}`);
  return { commit, film };
}

/** The tokens the copy is missing, has extra, or holds with other values than GENESIS at the ref. */
export function staleTokens(path, ref) {
  const { film } = committedFilm(path, ref), copy = JSON.parse(readFileSync(COPY, 'utf8')).tokens;
  return [...new Set([...Object.keys(film), ...Object.keys(copy)])].sort()
    .filter(name => JSON.stringify(film[name]) !== JSON.stringify(copy[name]));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), at = args.indexOf('--ref'), ref = at >= 0 ? args.splice(at, 2)[1] : 'HEAD', [path] = args;
  if (!path || !ref) throw new Error('usage: node scripts/sync-film-tokens.mjs <GENESIS checkout, or its tokens.json> [--ref <git ref>]');
  const { commit, film } = committedFilm(path, ref);
  writeFileSync(COPY, JSON.stringify({ source: { file: TOKENS, commit }, tokens: film }, null, 2) + '\n');
  console.log(`${Object.keys(film).length} film tokens from ${commit.slice(0, 9)} (${ref})`);
}
