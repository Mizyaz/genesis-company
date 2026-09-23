# GENESIS company website

Standalone React/Vite company presentation. No design assistant, product landing
page, workspace, API server, PDK files or connection to the engineering server.
The home page offers Discover (company presentation) and Design (an explicit
link to the visitor's own installation). All runtime assets are included here.
Animations, theme and motion preferences run in the browser.

Design first asks whether GENESIS is installed. No leads to the team's contact
email; Yes asks which port to use. Only a port number (1 to 65535) is entered,
never a URL. The port is remembered in the visitor's browser after opening the
product. Only an explicit Open GENESIS click opens the loopback address in a new
tab, with the selected theme. No availability probe, port scan, public LLM
endpoint, prompt transfer, or backend request is made by this site. The actual
assistant, model selection and CLI execution remain in the separate product.

## Run and build

Use Node 22 and npm:

```sh
npm ci
npm run dev
npm run build
npm test
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
Original layout images remain unchanged; preview cropping and theme treatment
are display-only. Public repository visibility does not grant a license to
redistribute the layout images or other company materials.
