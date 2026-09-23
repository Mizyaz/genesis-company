// Account-side administration only. Never imported by, or bundled into, the site.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const repository = 'Mizyaz/genesis-company';
const endpoint = `repos/${repository}`;

function github(args, allowMissing = false) {
  try {
    return execFileSync(process.env.GH_BIN || 'gh', args, { encoding: 'utf8', timeout: 25000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowMissing && /HTTP 404/.test(String(error.stderr))) return null;
    throw new Error(String(error.stderr || error.message).trim());
  }
}

/** Injected command function lets tests check transitions without changing GitHub. */
export function siteAccess(action, run = github) {
  if (!['open', 'close', 'status'].includes(action)) throw new Error('Usage: node scripts/site-access.mjs open|close|status');
  const query = (path, missing = false) => {
    const response = run(['api', `${endpoint}${path}`], missing);
    return response === null ? null : JSON.parse(response);
  };
  const repo = query('');
  if (repo.full_name !== repository) throw new Error('Unexpected repository; no changes made.');
  const pages = query('/pages', true);
  const workflow = query('/actions/workflows/pages.yml');
  if (action !== 'status' && !repo.permissions?.admin) throw new Error('Repository admin access is required.');
  if (action === 'open') {
    if (repo.private) run(['repo', 'edit', repository, '--visibility', 'public', '--accept-visibility-change-consequences']);
    if (!pages) run(['api', '--method', 'POST', `${endpoint}/pages`, '-f', 'build_type=workflow']);
    if (workflow.state !== 'active') run(['workflow', 'enable', 'pages.yml', '--repo', repository]);
    if (!pages || repo.private || workflow.state !== 'active') {
      const runs = query('/actions/workflows/pages.yml/runs?per_page=100').workflow_runs;
      if (!runs.some(job => job.status !== 'completed')) run(['workflow', 'run', 'pages.yml', '--repo', repository, '--ref', 'main']);
    }
    return { repository, visibility: 'public', site: 'https://mizyaz.github.io/genesis-company/', note: 'Opening may take a minute while GitHub deploys. Repeating open does not duplicate an active deployment.' };
  }
  if (action === 'close') {
    if (workflow.state !== 'disabled_manually') run(['workflow', 'disable', 'pages.yml', '--repo', repository]);
    const runs = query('/actions/workflows/pages.yml/runs?per_page=100').workflow_runs;
    for (const job of runs.filter(job => job.status !== 'completed')) run(['run', 'cancel', String(job.id), '--repo', repository]);
    if (pages) run(['api', '--method', 'DELETE', `${endpoint}/pages`]);
    if (!repo.private) run(['repo', 'edit', repository, '--visibility', 'private', '--accept-visibility-change-consequences']);
    if (query('/pages', true)) throw new Error('Pages still exists; check GitHub before assuming the site is closed.');
    return { repository, visibility: 'private', site: 'unpublished', note: 'Source and history are preserved. Previously downloaded copies cannot be revoked.' };
  }
  return { repository, visibility: repo.private ? 'private' : 'public', pagesConfigured: Boolean(pages), site: pages?.html_url || null, publishing: workflow.state };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(siteAccess(process.argv[2] || 'status'), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
