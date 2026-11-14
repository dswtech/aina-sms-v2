import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const repository = 'dswtech/aina-sms-v2';
const project = 'prj_HvkLDtbkmCDdbqNWKZi4RCYTqoHc';
const team = 'team_evHp8qu0HLXo67HctrKv8BfE';
const production = 'https://aiia.toyotabandung.web.id';
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

export async function deployRelease({ sha, tag, request, sleep: pause = sleep, beforePromote = async () => {} }) {
    const settings = await request(`/v9/projects/${project}`);
    if (settings.autoAssignCustomDomains !== false) {
        throw new ReleaseError('Disable automatic production domain assignment before releasing.');
    }
    const deployment = await request('/v13/deployments', {
        name: 'aina-sms', project, target: 'production',
        // app:prepare-production requires VERCEL_GIT_COMMIT_REF=main; sha still pins the build.
        gitSource: { type: 'github', repoId: '1437177802', ref: 'main', sha },
        projectSettings: { framework: 'container' },
        meta: { releaseTag: tag, releaseCommit: sha },
    });
    if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id)) throw new ReleaseError('No valid deployment ID returned; reconcile before retrying.');
    console.log(`Release ${tag}: build ${deployment.id} created.`);
    for (let attempt = 0; attempt < 120; attempt++) {
        const state = await request(`/v13/deployments/${deployment.id}`);
        if (['ERROR', 'CANCELED', 'BLOCKED'].includes(state.readyState)) throw new ReleaseError('Production build did not succeed; no promotion attempted.');
        if (state.readyState === 'READY') {
            if (state.target !== 'production' || state.meta?.githubCommitSha !== sha) {
                throw new ReleaseError('Deployment target or commit mismatch; no promotion attempted.');
            }
            await beforePromote();
            try {
                await request(`/v10/projects/${project}/promote/${deployment.id}`, {});
            } finally {
                // Vercel promotion may re-enable auto-assignment; retain the release gate.
                await request(`/v9/projects/${project}`, { autoAssignCustomDomains: false }, 'PATCH');
            }
            return deployment.id;
        }
        await pause(10000);
    }
    throw new ReleaseError('Production build timed out; inspect the deployment before retrying.');
}

export async function checkProduction({ id, request, probe = fetch, sleep: pause = sleep }) {
    for (let attempt = 0; attempt < 12; attempt++) {
        // A deployment's alias list holds only Git aliases, never the custom domain (v1.1.0 and v1.2.0
        // were promoted yet failed here); ask which deployment the domain serves instead.
        try {
            const serving = await request(`/v13/deployments/${new URL(production).hostname}`);
            if (serving.id === id) {
                const responses = await Promise.all(['/up', '/login'].map((path) => probe(`${production}${path}`, { redirect: 'error', signal: AbortSignal.timeout(15000) })));
                if (responses.every((response) => response.status === 200)) return;
            }
        } catch {
            // The release is already promoted; a transient API error, timeout or redirect gets another attempt.
        }
        await pause(5000);
    }
    throw new ReleaseError('Production domain or health verification failed; inspect and roll back through Vercel if needed.');
}

export function api(origin, token) {
    if (!token) throw new ReleaseError('Required deployment credential is missing.');
    return async (path, body, method = body === undefined ? 'GET' : 'POST') => {
        const url = new URL(path, origin);
        if (origin === 'https://api.vercel.com') url.searchParams.set('teamId', team);
        const response = await fetch(url, {
            method, redirect: 'error',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new ReleaseError(`Release API request failed (HTTP ${response.status}); inspect the service before retrying.`);
        // Vercel promote answers 202 without a body; v1.1.0 stopped after promoting on response.json().
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
    const github = api('https://api.github.com', process.env.GH_TOKEN);
    const { sha, tag } = await verify(event, github);
    if (process.argv[2] === 'verify') {
        appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\ntag=${tag}\n`);
        console.log(`Verified ${tag} at ${sha}.`);
        return;
    }
    if (process.argv[2] !== 'deploy' || sha !== process.env.RELEASE_SHA) throw new ReleaseError('Release commit changed after verification.');
    const vercel = api('https://api.vercel.com', process.env.VERCEL_TOKEN);
    const id = await deployRelease({
        sha, tag, request: vercel,
        beforePromote: async () => { await verify(event, github); },
    });
    await checkProduction({ id, request: vercel });
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Released **${tag}** (${sha}) through ${id}.\n\n${production}\n\nHTTPS /up and /login returned 200. Owner verification remains required.\n`);
    console.log(`Release ${tag} promoted; public health endpoints returned 200.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        // Only the class name for unexpected errors: their messages may echo URLs or response bodies.
        console.error(error instanceof ReleaseError ? error.message : `Unexpected ${error?.name ?? 'error'} in the release script.`);
        console.error('Release stopped. Inspect GitHub CI and Vercel deployment status; no automatic retry, migration or rollback was performed.');
        process.exitCode = 1;
    });
}
