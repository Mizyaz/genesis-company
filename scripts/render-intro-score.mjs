/** Build-time only: compose once, publish a small static soundtrack. No service or new npm dependency.
 * Needs Playwright Chromium, Python 3 and libmp3lame. Set TMPDIR to a writable scratch directory.
 */
import { chromium } from 'playwright';
import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const transpile = async file => ts.transpileModule(await readFile(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sources = await Promise.all(['../src/shared/intro/timeline.ts', '../src/shared/intro/score.ts'].map(transpile));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
let pcm;
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ([timelineSource, scoreSource]) => {
    const timeline = {}, score = {};
    new Function('exports', timelineSource)(timeline);
    new Function('exports', 'require', scoreSource)(score, () => timeline);
    const buffer = await score.renderScore();
    const bytes = new Uint8Array(buffer.length * 4), view = new DataView(bytes.buffer);
    for (let i = 0; i < buffer.length; i++) for (let channel = 0; channel < 2; channel++) {
      view.setInt16((i * 2 + channel) * 2, Math.round(buffer.getChannelData(channel)[i] * 32767), true);
    }
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(text);
  }, sources);
  pcm = Buffer.from(result, 'base64');
} finally { await browser.close(); }

// Encode the generated PCM through the host's existing LAME library. No system changes or temp datasets.
const encoder = String.raw`
import ctypes as c, ctypes.util, sys
name = ctypes.util.find_library('mp3lame')
if not name: raise RuntimeError('libmp3lame is required to rebuild the soundtrack')
lib = c.CDLL(name)
lib.lame_init.restype = c.c_void_p
state = lib.lame_init()
if not state: raise RuntimeError('LAME initialization failed')
try:
    for name, value in [('lame_set_in_samplerate',44100), ('lame_set_num_channels',2), ('lame_set_brate',128), ('lame_set_quality',2), ('lame_set_bWriteVbrTag',0)]:
        fn = getattr(lib, name); fn.argtypes = [c.c_void_p,c.c_int]; fn(state,value)
    lib.lame_init_params.argtypes = [c.c_void_p]
    if lib.lame_init_params(state) < 0: raise RuntimeError('Invalid encoder parameters')
    raw = sys.stdin.buffer.read()
    samples = (c.c_short * (len(raw)//2)).from_buffer_copy(raw)
    output = (c.c_ubyte * (len(raw)//2 + 7200))()
    lib.lame_encode_buffer_interleaved.argtypes = [c.c_void_p,c.POINTER(c.c_short),c.c_int,c.POINTER(c.c_ubyte),c.c_int]
    size = lib.lame_encode_buffer_interleaved(state,samples,len(raw)//4,output,len(output))
    if size < 0: raise RuntimeError('MP3 encoding failed')
    sys.stdout.buffer.write(bytes(output[:size]))
    lib.lame_encode_flush.argtypes = [c.c_void_p,c.POINTER(c.c_ubyte),c.c_int]
    size = lib.lame_encode_flush(state,output,len(output))
    if size < 0: raise RuntimeError('MP3 flush failed')
    sys.stdout.buffer.write(bytes(output[:size]))
finally:
    lib.lame_close.argtypes = [c.c_void_p]; lib.lame_close(state)
`;
const encoded = spawnSync(process.env.PYTHON || 'python3', ['-c', encoder], { input: pcm, maxBuffer: 4_000_000 });
if (encoded.error) throw encoded.error;
if (encoded.status !== 0) throw new Error(encoded.stderr.toString());
const destination = new URL('../public/assets/genesis-intro-score.mp3', import.meta.url);
await writeFile(destination, encoded.stdout);
console.log(`Rendered original stereo score: ${encoded.stdout.length} bytes → ${destination.pathname}`);
