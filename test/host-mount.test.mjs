/**
 * Host-half integration check: mount the plugin on a real cordis Context with the
 * real `dsh-host-webserver`, then fetch the route over real HTTP. This is what the
 * isolated handler test cannot prove — that `inject: ['webServer']` and
 * `ctx.effect(() => ctx.webServer.register(...))` actually publish the route.
 *
 * Run from the plugin root: `node test/host-mount.test.mjs`.
 */
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import WebServer from '@deepseek-ai/dsh-host-webserver';
import { inject, apply, RUNTIME_PATH } from '../bundle/index.js';

/** Build one context with the webserver mounted under the plugin's own inject list. */
async function mount(port) {
	const ctx = new Context();
	const mounted = [ctx.plugin(WebServer, { host: '127.0.0.1', port })];
	assert.deepEqual(inject, ['webServer'], 'the plugin must declare the service it uses');
	// `ctx.plugin` resolves once the mounted fiber has settled, which is when the
	// webserver is listening and our injected plugin has mounted.
	await mounted[0];
	mounted.push(ctx.plugin({ inject, apply }));
	await mounted[1];
	return { ctx, mounted };
}

const { ctx, mounted } = await mount(0);
const port = ctx.webServer.port;
assert.equal(typeof port, 'number', 'the webserver must report its port');
const origin = `http://127.0.0.1:${port}`;

const runtime = await fetch(`${origin}${RUNTIME_PATH}/mermaid.esm.min.mjs`);
const runtimeBody = await runtime.text();
assert.equal(runtime.status, 200, `${RUNTIME_PATH}/mermaid.esm.min.mjs must be served`);
assert.match(runtime.headers.get('content-type') ?? '', /text\/javascript/, 'the runtime must be served as JavaScript');
assert.ok(runtimeBody.length > 1_000_000, 'the runtime body must be the bundled Mermaid release');
assert.ok(!/^\s*(?:import|export)\s/m.test(runtimeBody), 'the served runtime must have no bare imports left');
console.log(`ok   runtime          200, ${runtimeBody.length} bytes, text/javascript`);

// The browser half imports the runtime from exactly this URL; a version query
// must not affect resolution.
const versioned = await fetch(`${origin}${RUNTIME_PATH}/mermaid.esm.min.mjs?v=11.17.0`);
assert.equal(versioned.status, 200, 'a versioned runtime URL must serve the module');
assert.match(versioned.headers.get('content-type') ?? '', /text\/javascript/, 'the runtime must be JavaScript');
console.log('ok   versioned URL    200, text/javascript');

const missing = await fetch(`${origin}${RUNTIME_PATH}/../package.json`);
assert.equal(missing.status, 404, 'traversal must not escape the vendor directory');
console.log('ok   traversal        404');

const unrelated = await fetch(`${origin}/plugins/other/client.js`);
assert.equal(unrelated.status, 404, 'the route must not shadow other prefixes');
console.log('ok   scope            404 outside the prefix');

// Disposal: removing the plugin must take the route down with it.
await mounted[1].dispose();
const afterPlugin = await fetch(`${origin}${RUNTIME_PATH}/mermaid.esm.min.mjs`).catch(() => undefined);
assert.ok(afterPlugin === undefined || afterPlugin.status !== 200, 'disposing the plugin must unpublish its route');
console.log('ok   disposal         disposing the plugin removes its route');

// The webserver itself is untouched by that disposal.
await mounted[0].dispose();
const afterServer = await fetch(`${origin}${RUNTIME_PATH}/mermaid.esm.min.mjs`).catch(() => undefined);
assert.ok(afterServer === undefined || afterServer.status !== 200, 'disposing the webserver must close the listener');
console.log('ok   disposal         disposing the webserver closes the listener');

console.log('host mount: all cases passed');
process.exit(0);
