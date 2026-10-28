// Exports the product film's take into the site: node scripts/export-film-take.mjs <take directory>.
// The directory is the recorder's (take_<theme>.mp4 and raw_<theme>/leaks.json for dark and light). A take goes in only
// when the recorder's on-screen text scan found none of host, user, email, paths, names, vendors or models in either
// theme; a record without one of those counts is refused too. Each take is re-encoded to 1080p H.264 with the index at
// the front (it plays while it loads), without sound. Blank frames the recorder caught before the page painted (plain
// white or black, at most the first second) are cut, and the poster is the first frame after them.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const LEAK_KINDS = ['host', 'user', 'email', 'paths', 'names', 'vendors', 'models'];
const root = resolve(import.meta.dirname, '..');
const BLANK = ['negate,blackdetect=d=0:pix_th=0.04:pic_th=0.98', 'blackdetect=d=0:pix_th=0.10:pic_th=0.98'];

/** Seconds of blank (white or black) frames at the start of a video, at most one: the runs that start at 0 or where
 * the previous one ended, joined. */
function blankLead(ffmpeg, video) {
  const runs = BLANK.flatMap(filter => [...spawnSync(ffmpeg, ['-t', '1', '-i', video, '-vf', filter, '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    .matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => [+m[1], +m[2]])).sort((a, b) => a[0] - b[0]);
  let end = 0;
  for (const [start, stop] of runs) if (start <= end + .04) end = Math.max(end, stop);
  return Math.min(end, 1);
}

/** The kinds a take's on-screen scan did not clear (missing or above zero); empty when the take may go in. */
export function uncleared(leaks) {
  const seen = leaks?.on_screen_counts ?? {};
  return LEAK_KINDS.filter(kind => seen[kind] !== 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2], ffmpeg = process.env.FFMPEG || 'ffmpeg';
  if (!dir) throw new Error('Usage: node scripts/export-film-take.mjs <take directory>');
  const takes = {};
  for (const theme of ['dark', 'light']) {
    const video = join(dir, `take_${theme}.mp4`), leaks = join(dir, `raw_${theme}`, 'leaks.json');
    if (!existsSync(video) || !existsSync(leaks)) throw new Error(`The ${theme} take or its leak record is missing`);
    const open = uncleared(JSON.parse(readFileSync(leaks, 'utf8')));
    if (open.length) throw new Error(`The ${theme} take is refused: its on-screen scan did not clear ${open.join(', ')}`);
    takes[theme] = { video: `/assets/film/take-${theme}.mp4`, poster: `/assets/film/take-${theme}.jpg` };
  }
  mkdirSync(join(root, 'public/assets/film'), { recursive: true });
  for (const theme of ['dark', 'light']) {
    const src = join(dir, `take_${theme}.mp4`), out = join(root, 'public', takes[theme].video), lead = blankLead(ffmpeg, src);
    console.log(`${theme}: cut ${lead.toFixed(2)} s of blank frames`);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', lead.toFixed(3), '-i', src, '-map_metadata', '-1', '-vf', 'scale=1920:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28',
      '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out], { stdio: 'inherit' });
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', out, '-frames:v', '1', '-q:v', '3', join(root, 'public', takes[theme].poster)], { stdio: 'inherit' });
  }
  writeFileSync(join(root, 'src/content/film-take.json'), `${JSON.stringify({ takes, width: 1920, height: 1080 }, null, 2)}\n`);
  console.log('Wrote the dark and light takes and src/content/film-take.json');
}
