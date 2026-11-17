import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, validateRelease } from '../../deploy/release/release.mjs';

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

test('API responses without a body resolve to an empty object', async (t) => {
    const responses = [new Response(null, { status: 202 }), new Response('', { status: 200 }), Response.json({ id: 1 })];
    t.mock.method(globalThis, 'fetch', async () => responses.shift());
    const request = api('https://api.github.com', 'test-token');

    assert.deepEqual(await request('/a', {}), {});
    assert.deepEqual(await request('/b'), {});
    assert.deepEqual(await request('/c'), { id: 1 });
});
