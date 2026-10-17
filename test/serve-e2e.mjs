/**
 * Static server for the real-browser end-to-end page.
 *
 *   node test/serve-e2e.mjs [port]      # default 8732
 *
 * Then open http://127.0.0.1:8732/ — the page prints a PASS/FAIL table into the
 * console and into `window.__E2E__`; add `?keep=1` to leave the diagrams mounted
 * for a screenshot.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('./e2e/', import.meta.url));
/** The real vendored runtime, served under the same route the Host uses. */
const vendorDir = fileURLToPath(new URL('../vendor/', import.meta.url));
/** The shipped browser bundle, served at the path the page imports. */
const clientFile = fileURLToPath(new URL('../client.js', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.map': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
	const path = new URL(req.url ?? '/', 'http://x').pathname;
	// Mirror the Host's own route so the page loads the runtime exactly as the app does.
	const vendor = path.startsWith('/x-dsh-mermaid-plus/') ? path.slice('/x-dsh-mermaid-plus/'.length) : null;
	const target = vendor !== null
		? join(vendorDir, normalize(vendor))
		: path === '/client.js'
			? clientFile
			: join(rootDir, normalize(path === '/' ? '/index.html' : path));
	try {
		const info = await stat(target);
		if (!info.isFile()) throw new Error('not a file');
		res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
		res.end(await readFile(target));
	} catch {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('not found');
	}
});
const port = Number(process.argv[2] ?? 8732);
server.listen(port, '127.0.0.1', () => console.log(`e2e server on http://127.0.0.1:${port}/`));
