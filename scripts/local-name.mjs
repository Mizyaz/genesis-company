// Client-side setup only. Never run --apply on the SSH server for a Mac browser.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function hostsEntry(contents, hostname) {
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+test$/.test(hostname)) {
    throw new Error('Use a local .test hostname, for example genesis.test.');
  }
  let present = false;
  for (const line of contents.split(/\r?\n/)) {
    const [address, ...aliases] = line.split('#')[0].trim().split(/\s+/);
    if (!aliases.some(alias => alias.toLowerCase() === hostname)) continue;
    if (address !== '127.0.0.1') throw new Error(`${hostname} already points to ${address}. Resolve that entry manually; nothing was changed.`);
    present = true;
  }
  return present ? '' : `\n127.0.0.1 ${hostname} # GENESIS local connection\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) throw new Error('Usage: npm run connection:setup -- [--apply]');
    if (!['darwin', 'linux'].includes(process.platform)) throw new Error('This helper supports macOS and Linux. Add the alias manually on other systems.');
    const { hostname } = JSON.parse(readFileSync(new URL('../connection.json', import.meta.url), 'utf8'));
    const entry = hostsEntry(readFileSync('/etc/hosts', 'utf8'), hostname);
    console.log('Run this on the computer running your browser, not the remote SSH server.');
    if (!entry) console.log(`${hostname} is already configured. No changes needed.`);
    else if (!args.includes('--apply')) {
      console.log(`Preview only. Would append to /etc/hosts:${entry}`);
      console.log('On the browser computer: npm run connection:setup -- --apply');
    } else {
      // Append one validated alias only. sudo prompts locally; no shell or DNS edits.
      execFileSync('sudo', ['tee', '-a', '/etc/hosts'], { input: entry, stdio: ['pipe', 'ignore', 'inherit'] });
      if (hostsEntry(readFileSync('/etc/hosts', 'utf8'), hostname)) throw new Error('The alias was not saved. Check /etc/hosts.');
      console.log(`Configured ${hostname}. Keep your existing SSH port forwarding.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
