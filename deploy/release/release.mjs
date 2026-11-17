import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const repository = 'dswtech/aina-sms-v2';
class ReleaseError extends Error {}

function releaseVersion(event) {
    const release = event.release;
    if (event.action !== 'published' || !release || release.draft !== false || release.prerelease !== false
        || !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.tag_name)) {
        throw new ReleaseError('Only a published stable vMAJOR.MINOR.PATCH release can deploy.');
    }
    return release.tag_name;
}

export function validateRelease(event, sha, onMain, runs) {
    const tag = releaseVersion(event);
    const latest = runs.find((run) => run.head_sha === sha && run.head_branch === 'main' && run.event === 'push');
    if (!/^[a-f0-9]{40}$/.test(sha) || !onMain || latest?.status !== 'completed' || latest.conclusion !== 'success') {
        throw new ReleaseError('The exact release commit must belong to main and pass its latest main CI run.');
    }
    return tag;
}

export function api(origin, token) {
    if (!token) throw new ReleaseError('Required deployment credential is missing.');
    return async (path, body, method = body === undefined ? 'GET' : 'POST') => {
        const url = new URL(path, origin);
        const response = await fetch(url, {
            method, redirect: 'error',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new ReleaseError(`Release API request failed (HTTP ${response.status}); inspect the service before retrying.`);
        const text = await response.text();
        return text === '' ? {} : JSON.parse(text);
    };
}

async function verify(event, github) {
    if (process.env.GITHUB_REPOSITORY !== repository || process.env.GITHUB_EVENT_NAME !== 'release') {
        throw new ReleaseError('Unexpected release source.');
    }
    const tag = releaseVersion(event);
    if (!Number.isSafeInteger(event.release.id)) throw new ReleaseError('Invalid release identifier.');
    const current = await github(`/repos/${repository}/releases/${event.release.id}`);
    if (current.tag_name !== tag || current.draft || current.prerelease) throw new ReleaseError('Release was changed or withdrawn.');
    const sha = execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const remote = await github(`/repos/${repository}/commits/${tag}`);
    if (sha !== remote.sha || sha !== process.env.GITHUB_SHA) throw new ReleaseError('Release tag moved; no deployment attempted.');
    const onMain = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main']).status === 0;
    const ci = await github(`/repos/${repository}/actions/workflows/tests.yml/runs?head_sha=${sha}&event=push&branch=main&per_page=100`);
    validateRelease(event, sha, onMain, ci.workflow_runs);
    return { sha, tag };
}

async function main() {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const { sha, tag } = await verify(event, api('https://api.github.com', process.env.GH_TOKEN));
    if (process.argv[2] !== 'verify') throw new ReleaseError('Unknown release command.');
    appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}
tag=${tag}
`);
    console.log(`Verified ${tag} at ${sha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        // Only the class name for unexpected errors: their messages may echo URLs or response bodies.
        console.error(error instanceof ReleaseError ? error.message : `Unexpected ${error?.name ?? 'error'} in the release script.`);
        console.error('Release stopped. Inspect GitHub CI and the release; no automatic retry, migration or rollback was performed.');
        process.exitCode = 1;
    });
}
