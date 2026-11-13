import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, validateRelease, deployRelease, checkProduction } from '../../deploy/vercel/release.mjs';

const sha = 'a'.repeat(40);
const release = { action: 'published', release: { draft: false, prerelease: false, tag_name: 'v1.2.3' } };
const runs = [{ head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }];

test('accepts a stable release only for the exact tested main commit', () => {
    assert.equal(validateRelease(release, sha, true, runs), 'v1.2.3');
    for (const invalid of [
        { ...release, action: 'edited' },
        { ...release, release: { ...release.release, draft: true } },
        { ...release, release: { ...release.release, prerelease: true } },
        { ...release, release: { ...release.release, tag_name: 'v1.2.3-rc.1' } },
        { ...release, release: { ...release.release, tag_name: 'v01.2.3' } },
    ]) assert.throws(() => validateRelease(invalid, sha, true, runs));
    assert.throws(() => validateRelease(release, sha, false, runs));
    for (const ci of [[], [{ ...runs[0], conclusion: 'failure' }], [{ ...runs[0], status: 'in_progress' }], [{ ...runs[0], event: 'pull_request' }], [{ ...runs[0], head_sha: 'b'.repeat(40) }]]) {
        assert.throws(() => validateRelease(release, sha, true, ci));
    }
    assert.throws(() => validateRelease(release, sha, true, [{ ...runs[0], conclusion: 'failure' }, ...runs]));
});

function server(states, overrides = {}) {
    const calls = [];
    return {
        calls,
        request: async (path, body, method) => {
            calls.push({ path, body, method });
            if (path.startsWith('/v9/projects/')) return { autoAssignCustomDomains: false, ...overrides };
            if (path === '/v13/deployments') return { id: 'dpl_test' };
            if (path.startsWith('/v13/deployments/')) return { id: 'dpl_test', target: 'production', readyState: states.shift(), meta: { githubCommitSha: sha } };
            if (path.includes('/promote/')) return {};
            throw new Error('Unexpected test request');
        },
    };
}

test('waits for the pinned production build before promoting', async () => {
    const api = server(['BUILDING', 'READY']);
    await deployRelease({ sha, tag: 'v1.2.3', request: api.request, sleep: async () => {} });
    const create = api.calls.find(({ path }) => path === '/v13/deployments');
    assert.equal(create.body.gitSource.sha, sha);
    assert.equal(create.body.gitSource.ref, 'main');
    assert.equal(create.body.meta.releaseTag, 'v1.2.3');
    assert.equal(api.calls.some(({ path }) => path.includes('/promote/dpl_test')), true);
    assert.deepEqual(api.calls.at(-1), {
        path: '/v9/projects/prj_HvkLDtbkmCDdbqNWKZi4RCYTqoHc',
        body: { autoAssignCustomDomains: false }, method: 'PATCH',
    });
});

test('failed builds and unsafe automatic domain settings never promote', async () => {
    for (const state of ['ERROR', 'CANCELED', 'BLOCKED']) {
        const api = server([state]);
        await assert.rejects(deployRelease({ sha, tag: 'v1.2.3', request: api.request, sleep: async () => {} }));
        assert.equal(api.calls.some(({ path }) => path.includes('/promote/')), false);
    }
    const api = server([], { autoAssignCustomDomains: true });
    await assert.rejects(deployRelease({ sha, tag: 'v1.2.3', request: api.request }));
    assert.equal(api.calls.some(({ path }) => path === '/v13/deployments'), false);
});

test('a build from a different commit never promotes', async () => {
    const api = server(['READY']);
    await assert.rejects(deployRelease({ sha: 'b'.repeat(40), tag: 'v1.2.3', request: api.request }));
    assert.equal(api.calls.some(({ path }) => path.includes('/promote/')), false);
});

test('a moved release stops before promotion even after a successful build', async () => {
    const api = server(['READY']);
    await assert.rejects(deployRelease({ sha, tag: 'v1.2.3', request: api.request, beforePromote: async () => { throw new Error('Tag moved'); } }));
    assert.equal(api.calls.some(({ path }) => path.includes('/promote/')), false);
});

test('health verification waits for the domain to point to this deployment', async () => {
    let reads = 0;
    let checks = 0;
    await checkProduction({
        id: 'dpl_test',
        request: async () => ({ alias: ++reads === 1 ? [] : ['aiia.toyotabandung.web.id'] }),
        probe: async () => { checks++; return { status: 200 }; },
        sleep: async () => {},
    });
    assert.equal(reads, 2);
    assert.equal(checks, 2);
    await assert.rejects(checkProduction({ id: 'dpl_test', request: async () => ({ alias: [] }), sleep: async () => {} }));
    await assert.rejects(checkProduction({ id: 'dpl_test', request: async () => ({ alias: ['aiia.toyotabandung.web.id'] }), probe: async () => ({ status: 500 }), sleep: async () => {} }));
});

test('API responses without a body resolve to an empty object', async (t) => {
    const responses = [new Response(null, { status: 202 }), new Response('', { status: 200 }), Response.json({ id: 'dpl_x' })];
    t.mock.method(globalThis, 'fetch', async () => responses.shift());
    const request = api('https://api.vercel.com', 'test-token');

    assert.deepEqual(await request('/v10/projects/p/promote/dpl_x', {}), {});
    assert.deepEqual(await request('/v9/projects/p'), {});
    assert.deepEqual(await request('/v13/deployments/dpl_x'), { id: 'dpl_x' });
});
