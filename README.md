# GENESIS company website

Standalone React/Vite company presentation. No design assistant, product landing
page, workspace, API server, PDK files or connection to the engineering server.
The home page offers Discover (company presentation) and Design (an explicit
link to the visitor's own installation). All runtime assets are included here.
Animations, theme and motion preferences run in the browser.

The home-page symbol expands through the shared circuit shutters into a 30-second
RF front-end film. Only a prompt appears at the start. An illustrated click sends it, then devices
assemble into amplifier circuits, not single devices labelled as amplifiers.
Each LNA/PA circuit contains two transistor stages, three pixelated matching
networks and bias/decoupling elements. These join mixers and an antenna switch to
form receive and transmit paths. Fifteen coordinated design states change pixel
patterns, physical footprints, finger count and finger length until the brand reveal
at 26 seconds. Connections follow resized ports. The camera moves from circuit detail to
the connected front end. Short bilingual captions explain the sequence. This is an illustration,
not a live LLM session, simulated circuit or measured result.

`shared/intro/timeline.ts` defines the shared 30-second editorial clock.
`frontEndScene.ts` owns the device/circuit/system hierarchy, cached binary pixel
candidates, sizing states, ports and camera shots. `frontEndFilm.ts` is a lazy-loaded
Three.js renderer with physical materials, studio reflections, shadow maps and
half-resolution contact occlusion. Instanced metal cells keep geometry bounded.
Every screen uses the same 1280×720 landscape composition and camera path.
`RequestSequence.tsx` uses
the same clock, so seeking preserves click/thinking/reveal order. `filmPalette.ts`
resolves the shared theme tokens; even a paused canvas repaints on a theme change.
The symbol, GENESIS name and expansion appear only in the last four seconds.
`score.ts` composes
an original 128 BPM, 16-bar stereo soundtrack. `scripts/render-intro-score.mjs` renders
it once at build time through Playwright and the host's existing Python/libmp3lame;
the checked-in MP3 is about 480 KB, and visitors do not synthesize it. Run the script
only when changing the composition, with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and
a writable `TMPDIR` if required. Normal builds do not require an audio encoder.

`scripts/render-intro-film.mjs` captures the actual player, frame by frame, into a
30 fps H.264/AAC review film. It streams frames into FFmpeg instead of storing raw
frames. Supply `FILM_URL` for a running preview, `FFMPEG` for an existing encoder,
and optionally `FILM_OUTPUT`, `FILM_THEME` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
This is an offline review tool, not a production runtime dependency.

The player in `CompanyIntro.tsx` expands from the clicked launcher, reusing
`SiliconGate`'s die-panel artwork. Its clock and soundtrack wait until that entrance
finishes. Reduced motion skips the entrance and leaves playback paused. The media
clock synchronizes the film; if the track is still buffering, music joins at the
current playback offset. Pause, seek,
replay, mute and close act on both media. Closing unloads the audio element.
Audio failure does not prevent silent playback. WebGL failure pauses the film and
shows an explanatory message; closing releases GPU resources. The canvas is capped at 1.8 million
pixels and 30 fps. Slow GPUs reduce sampling density and contact occlusion during
playback; paused review frames retain full quality. Hidden tabs and disabled motion pause the film and music; the
scrubber still provides still frames. Labels and accessible descriptions support
English and Turkish. Three.js is bundled locally and loads only when the film opens.
No video service, CDN, PDK or runtime server connection is required.

Design first asks whether GENESIS is installed. No leads to the team's contact
email; Yes asks which port to use. Only a port number (1 to 65535) is entered,
never a URL. The port is remembered in the visitor's browser after opening the
product. Only an explicit Open GENESIS click opens the configured local name in a new
tab, with the selected theme. No availability probe, port scan, public LLM
endpoint, prompt transfer, or backend request is made by this site. The actual
assistant, model selection and CLI execution remain in the separate product.

### One-time local name setup

`connection.json` defines the friendly name, currently `genesis.test`. On the
computer running your browser, from this checkout:

```sh
npm run connection:setup            # preview only
npm run connection:setup -- --apply # local sudo, one /etc/hosts entry
```

This helper needs Node but no npm dependencies. It appends `127.0.0.1 genesis.test`
only when missing and refuses conflicting mappings. On an SSH setup with a Mac
browser, run it on the Mac, not the remote server. Keep your port forwarding.
Open GENESIS then navigates to `http://genesis.test:<your port>`. No setup runs in
the browser or during deployment, and the public site never tries to resolve or
probe the name. The product must explicitly allow this hostname and origin while
remaining bound to loopback. The companion local company app already does so.
Remove only the `# GENESIS local connection` hosts entry to undo local setup.

## Run and build

Use Node 22 and npm:

```sh
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium # once, for the browser regression tests
npm run test:browser            # tests the built site; runs before deployment too
npm run preview
```

The deployable output is `dist/`. No runtime environment variables, credentials,
backend, private repository access or Python installation are needed. Relative
asset paths work at both a domain root and a repository subpath. Hash navigation
does not require server rewrites. The production HTML blocks API/WebSocket
connections through `connect-src 'none'`.

## Hosting

### Quick access switch

With GitHub CLI installed and logged into the repository owner's account:

```sh
npm run site:open
npm run site:close
npm run site:status
```

`open` makes this repository and its Pages site public. `close` disables the Pages
workflow, cancels any active publication, unpublishes the website and makes the
repository private without deleting source or history. Closing is not a private
website login screen. GitHub may take a minute to propagate the change, and
previously downloaded copies cannot be revoked. These commands affect only
`Mizyaz/genesis-company`; they run from any authenticated computer and are never
part of the browser bundle. No connection to an engineering server is involved.

GitHub Pages: select **GitHub Actions** as the Pages publishing source.
The included workflow builds and deploys pushes to `main` on GitHub-hosted
runners. It never contacts an engineering machine or a self-hosted runner.

Cloudflare Pages: connect this repository, production branch `main`, build
command `npm run build`, output directory `dist`, Node 22. No function, Worker,
API token in the site, or engineering-server access is required.

Link previews (Open Graph) use absolute `https://mizyaz.github.io/genesis-company/`
URLs in `index.html`. If the site moves, update them in the source project.

## Source and updates

The editable source remains in the main project's `company-web` directory.
This repository is a clean public export, not a copy of the main Git history.
To update an existing clean checkout of this repository, run from the main project:

```sh
npm --prefix company-web run publish:public -- /path/to/genesis-company
```

To prepare files without publishing, use `export:public` instead. The exporter
uses a fixed file allowlist and a public-only content JSON. It refuses conflicting
local edits and never copies `.env`, authentication files, simulation results,
CAD sources or unrelated files. Edit the source project, then publish again.

Contact uses an email link. Theme and motion preferences are stored only in the
visitor's browser. No analytics or online model is connected.

Presentation images and role profiles were supplied by the GENESIS team.
Original layout images remain unchanged; the lighter card previews, preview
cropping and theme treatment are display-only. Public repository visibility does not grant a license to
redistribute the layout images or other company materials.

## Introduction films

The original 30-second 3D film remains the default. The player also offers a
separate 2D illustration using the same transport, soundtrack, theme and clock.
Its schematic symbols become top-down geometry; transistor sizing, spiral
dimensions and pixel patterns change together. This is an editorial illustration,
not a foundry layout or a simulation result. The original music-backed MP4 is
available through **Download 3D film** at `assets/films/genesis-3d-30s.mp4`.

The 2D inductor glyph adapts Akilaa's [public-domain inductor symbol](https://commons.wikimedia.org/wiki/File:Inductor_symbol.svg),
scaled and recoloured. The remaining animated geometry is drawn in code. No
third-party PDK artwork or restrictive stock illustration is bundled.
