/**
 * Copy this checkout over an npm-installed copy in a DSH profile.
 *
 * The plugin has no build step: `index.js` and `client.js` run as they are, and
 * `vendor/` is prebuilt. So iterating on a *published* install only needs the
 * files replaced, not a release.
 *
 *   node tools/dev-sync.mjs                 # desktop profile, default path
 *   node tools/dev-sync.mjs --profile web   # another profile
 *   node tools/dev-sync.mjs --dry-run       # show what would change
 *
 * Restart DSH Desktop afterwards (a page reload is not enough for the Host half,
 * and does not reload client bundles reliably in the desktop shell).
 */
import { cp, readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const profile = args.find((arg) => arg.startsWith('--profile='))?.slice('--profile='.length)
	?? (args.indexOf('--profile') >= 0 ? args[args.indexOf('--profile') + 1] : undefined)
	?? process.env.DSH_PROFILE
	?? 'desktop';
const dryRun = args.includes('--dry-run');

/** Files and directories the installed package needs, relative to the repo. */
const entries = ['package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'LICENSE', 'README.md', 'vendor', 'locale'];

const profileDir = process.env.DSH_PROFILE_DIR && (process.env.DSH_PROFILE ?? '') === profile
	? process.env.DSH_PROFILE_DIR
	: join(homedir(), '.dsh', 'profiles', profile);

const target = join(profileDir, 'node_modules', 'dsh-mermaid-plus');
const name = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).name ?? 'dsh-mermaid-plus';

let info;
try {
	info = await stat(target);
} catch {
	console.error(`✗ ${name} is not installed in profile "${profile}" (${target}).`);
	console.error('  Install it first, either from the market or with:');
	console.error(`    dsh plugin --profile ${profile} add ${name}`);
	process.exit(1);
}

// A pnpm `link:` install is already this checkout; copying onto it would copy a
// directory into itself.
const { realpath } = await import('node:fs/promises');
const resolved = await realpath(target).catch(() => target);
const resolvedRoot = await realpath(root).catch(() => root);
if (resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${process.platform === 'win32' ? '\\' : '/'}`)) {
	console.log(`✓ ${name} in profile "${profile}" is a link to this checkout.`);
	console.log('  Edits apply directly; there is nothing to sync. Restart DSH to reload.');
	process.exit(0);
}

console.log(`${dryRun ? 'would sync' : 'syncing'} ${name} -> ${target}`);
let copied = 0;
for (const entry of entries) {
	const from = join(root, entry);
	const to = join(target, entry);
	try {
		await stat(from);
	} catch {
		continue;
	}
	if (!dryRun) {
		await cp(from, to, { recursive: true, force: true });
	}
	copied += 1;
	console.log(`  ${dryRun ? '·' : '✓'} ${entry}`);
}
void readdir;
console.log(`\n${copied} entries ${dryRun ? 'would be' : ''} copied.`);
if (!dryRun) console.log('Restart DSH Desktop to load the new Host half and client bundle.');
