# GENESIS company website

Standalone React/Vite company presentation. No design assistant, product landing
page, workspace, API server, PDK files or connection to the engineering server.
The home page offers Discover (company presentation) and Design (an explicit
link to the visitor's own installation). All runtime assets are included here.
Animations, theme and motion preferences run in the browser.

The home-page symbol opens a 30-second continuous circuit film. A signal reveals
metal traces, spiral inductors, capacitor plates and transistor fingers on one
silicon surface, finishing with the GENESIS identity. This is an illustration, not
a simulated circuit or a measured result. There are no chapter cards or game controls.

`shared/intro/circuitFilm.ts` owns the canvas geometry and camera. `score.ts` composes
and renders an original 96 BPM, 12-bar stereo soundtrack using Web Audio. The player
in `CompanyIntro.tsx` starts audio only after a user click and uses the audio clock
for synchronization. Pause, seek, replay, mute and close act on both media. Closing
releases the AudioContext; a single decoded score (<11 MB) is reused on reopening.
Audio failure does not prevent silent playback. The canvas is capped at two million
pixels and 30 fps. Hidden tabs and disabled motion pause the film and music; the
scrubber still provides still frames. Labels and accessible descriptions support
English and Turkish. No additional package, video service or server is required.

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
