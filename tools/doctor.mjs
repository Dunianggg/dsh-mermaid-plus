/**
 * Print what the plugin knows about its last activation and the browser's
 * lifecycle events, plus whether an installed copy matches this checkout.
 *
 *   node tools/doctor.mjs                 # desktop profile
 *   node tools/doctor.mjs --profile web
 *
 * Everything read here is local: `<os tmp>/dsh-mermaid-plus/activation.json` and
 * `report.json`. The log holds event names and counts only — no diagram source,
 * no file contents.
 */
import { lstat, readFile, realpath } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const profile = args.find((arg) => arg.startsWith('--profile='))?.slice('--profile='.length)
	?? (args.indexOf('--profile') >= 0 ? args[args.indexOf('--profile') + 1] : undefined)
	?? process.env.DSH_PROFILE
	?? 'desktop';
const profileDir = process.env.DSH_PROFILE_DIR && (process.env.DSH_PROFILE ?? '') === profile
	? process.env.DSH_PROFILE_DIR
	: join(homedir(), '.dsh', 'profiles', profile);

const dir = join(tmpdir(), 'dsh-mermaid-plus');
const readJson = async (path) => {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch {
		return undefined;
	}
};

const pkg = await readJson(join(root, 'package.json'));
console.log(`checkout      ${pkg?.name ?? '?'}@${pkg?.version ?? '?'}`);

// Installed copy: a pnpm `link:` target and this checkout are the same tree.
const installed = join(profileDir, 'node_modules', pkg.name);
try {
	const info = await lstat(installed);
	const installedPkg = await readJson(join(installed, 'package.json'));
	const linked = info.isSymbolicLink() || (await realpath(installed).catch(() => installed)) === (await realpath(root).catch(() => root));
	console.log(`profile "${profile}"  ${installedPkg?.name ?? '?'}@${installedPkg?.version ?? '?'} (${linked ? 'link' : 'copied'})`);
	if (!linked) {
		if (installedPkg?.version !== pkg?.version) console.log('  ! installed version differs from this checkout; run node tools/dev-sync.mjs');
		else console.log('  a copied install is not updated by edits; run node tools/dev-sync.mjs after changing files');
	}
} catch {
	console.log(`profile "${profile}"  not installed`);
}

const activation = await readJson(join(dir, 'activation.json'));
if (activation === undefined) {
	console.log('\nactivation    none yet — the Host half has not started since the log was cleared');
} else {
	console.log(`\nactivation    ${activation.at}  package=${activation.package}  route=${activation.runtimePath}`);
	console.log(`              clientPath=${activation.clientPath ?? '(unknown)'}`);
	const graph = activation.graphEntries;
	console.log(`              own entry in client graph: ${graph === null || graph === undefined ? 'unknown (read before composition)' : graph.includes(activation.package)}`);
}

const report = await readJson(join(dir, 'report.json'));
if (report === undefined) {
	console.log('\nreport        none yet — open the app so the browser half can report');
} else {
	const entries = Array.isArray(report) ? report : [report];
	const counts = new Map();
	for (const entry of entries) counts.set(entry.event, (counts.get(entry.event) ?? 0) + 1);
	console.log(`\nreport        ${entries.length} event(s)  ${[...counts].map(([k, v]) => `${k}×${v}`).join('  ')}`);
	for (const entry of entries.slice(-6)) {
		console.log(`  ${String(entry.receivedAt ?? '').slice(11, 19)}  ${entry.event}  ${JSON.stringify(entry.detail ?? null)}`);
	}
	if (counts.get('render-error')) {
		console.log('\n  render errors are also printed to the browser console; open developer tools there.');
	}
}

console.log(`\nfiles         ${dir}`);
