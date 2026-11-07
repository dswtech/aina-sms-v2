import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monitorProduction } from '../../deploy/vercel/monitor.mjs';

function healthy(url) {
    return new Response(url.endsWith('/up') ? '<html>Application up</html>' : '<div data-page="{&quot;component&quot;:&quot;auth/login&quot;}"></div>', { headers: { 'content-type': 'text/html' } });
}

test('checks production health and login without credentials or redirect following', async () => {
    const calls = [];
    const results = await monitorProduction({ request: async (url, options) => { calls.push({ url, options }); return healthy(url); } });
    assert.equal(results.every((result) => result.ok), true);
    assert.deepEqual(calls.map((call) => call.url), ['https://aiia.toyotabandung.web.id/up', 'https://aiia.toyotabandung.web.id/login']);
    assert.equal(calls.every((call) => call.options.redirect === 'error' && !call.options.headers.Authorization), true);
});

test('retries only failed paths and accepts recovery', async () => {
    const paths = [];
    const waits = [];
    const results = await monitorProduction({
        request: async (url) => { paths.push(url); return url.endsWith('/up') && paths.length === 1 ? new Response('failed', { status: 503 }) : healthy(url); },
        pause: async (ms) => { waits.push(ms); },
    });
    assert.equal(results.every((result) => result.ok), true);
    assert.deepEqual(waits, [10000]);
    assert.equal(paths.filter((path) => path.endsWith('/up')).length, 2);
    assert.equal(paths.filter((path) => path.endsWith('/login')).length, 1);
});

test('persistent HTTP errors, redirects and unexpected pages remain unhealthy', async () => {
    for (const status of [301, 403, 404, 500, 503]) {
        const results = await monitorProduction({ request: async () => new Response('sensitive response must not appear', { status }), pause: async () => {} });
        assert.equal(results.every((result) => !result.ok && result.status === status), true);
        assert.equal(JSON.stringify(results).includes('sensitive'), false);
    }
    const results = await monitorProduction({ request: async () => new Response('Generic login/protection page', { headers: { 'content-type': 'text/html' } }), pause: async () => {} });
    assert.equal(results.every((result) => !result.ok && result.reason === 'UNEXPECTED_CONTENT'), true);
});

test('timeouts and TLS/network failures expose no exception details', async () => {
    for (const name of ['TimeoutError', 'AbortError', 'TypeError']) {
        const results = await monitorProduction({ request: async () => { const error = new Error('credential=secret'); error.name = name; throw error; }, pause: async () => {} });
        assert.equal(results.every((result) => !result.ok), true);
        assert.equal(JSON.stringify(results).includes('secret'), false);
        assert.equal(results[0].reason, name === 'TypeError' ? 'NETWORK_OR_TLS' : 'TIMEOUT');
    }
});
