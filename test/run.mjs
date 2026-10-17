/**
 * Run the checks that do not need a browser:
 *
 *   node test/run.mjs
 *
 * `node build.mjs` must have run first (it produces `vendor/`).
 * The real-browser end-to-end page is `test/e2e/index.html`; serve the plugin
 * directory over HTTP and open `test/e2e/index.html?keep=1`, then read
 * `window.__E2E__` (or the document title) for the result table.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
for (const suite of ['host.test.mjs', 'host-mount.test.mjs', 'client.test.mjs']) {
	const result = spawnSync(process.execPath, [join(root, 'test', suite)], { stdio: 'inherit' });
	if (result.status !== 0) failed += 1;
}
process.exit(failed === 0 ? 0 : 1);
