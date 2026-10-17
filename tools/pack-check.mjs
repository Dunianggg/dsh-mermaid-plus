/**
 * Assert what `npm publish` would actually ship.
 *
 *   node tools/pack-check.mjs
 *
 * Guards the `files` whitelist: the tarball must contain the runtime package and
 * nothing from the repository's tooling, tests or logs.
 */
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every file the published package must contain, and nothing else. */
const EXPECTED = [
	'LICENSE',
	'README.md',
	'client.js',
	'cordis.patch.yml',
	'icon.svg',
	'index.js',
	'locale/zh.json',
	'package.json',
	'vendor/mermaid.LICENSE',
	'vendor/mermaid.esm.min.mjs',
];

/** Paths that must never be published, whatever `files` says. */
const FORBIDDEN = [/^test\//, /^tools\//, /^docs\//, /^build\.mjs$/, /diagnostics\.json$/, /\.tgz$/, /node_modules\//];

const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
const [report] = JSON.parse(raw);
const files = report.files.map((file) => file.path).sort();

const problems = [];
for (const expected of EXPECTED) {
	if (!files.includes(expected)) problems.push(`missing: ${expected}`);
}
for (const file of files) {
	if (EXPECTED.includes(file)) continue;
	const forbidden = FORBIDDEN.find((pattern) => pattern.test(file));
	problems.push(forbidden === undefined ? `unexpected: ${file}` : `forbidden: ${file}`);
}
const vendor = report.files.find((file) => file.path === 'vendor/mermaid.esm.min.mjs');
if (vendor === undefined || vendor.size < 1_000_000) {
	problems.push(`vendored runtime looks wrong: ${vendor?.size ?? 0} bytes`);
}

if (problems.length > 0) {
	console.error(`pack check failed (${files.length} files, ${report.files.length} entries):`);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}
console.log(`pack check: ${files.length} files, ${(report.size / 1024).toFixed(0)} kB packed — as expected`);
