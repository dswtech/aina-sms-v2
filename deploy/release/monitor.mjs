import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const origin = 'https://aiia.toyotabandung.web.id';

async function probe(path, request) {
    try {
        const response = await request(`${origin}${path}`, {
            redirect: 'error', signal: AbortSignal.timeout(30000),
            headers: { 'User-Agent': 'AINA-Production-Monitor/1.0' },
        });
        if (response.status !== 200) return { path, ok: false, status: response.status, reason: 'HTTP_ERROR' };
        const html = await response.text();
        const expected = path === '/up'
            ? html.includes('Application up')
            : html.includes('auth/login') || html.includes('auth\\/login');
        const ok = Boolean(expected && response.headers.get('content-type')?.includes('text/html'));
        return { path, ok, status: 200, reason: ok ? 'OK' : 'UNEXPECTED_CONTENT' };
    } catch (error) {
        return { path, ok: false, status: null, reason: ['TimeoutError', 'AbortError'].includes(error?.name) ? 'TIMEOUT' : 'NETWORK_OR_TLS' };
    }
}

export async function monitorProduction({ request = fetch, pause = sleep } = {}) {
    let results = await Promise.all(['/up', '/login'].map((path) => probe(path, request)));
    if (results.some((result) => !result.ok)) {
        await pause(10000);
        results = await Promise.all(results.map((result) => result.ok ? result : probe(result.path, request)));
    }
    return results;
}

async function main() {
    const results = await monitorProduction();
    const lines = results.map(({ path, ok, status, reason }) => `${path}: ${ok ? 'OK' : 'FAILED'} | HTTP ${status ?? 'unavailable'} | ${reason}`);
    console.log(lines.join('\n'));
    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY,
            `## Production access check\n\n${new Date().toISOString()}\n\n${lines.join('\n\n')}\n\nGET-only HTTPS check; no login or business-data mutation. Laravel may create a temporary anonymous session. Other application routes require Vercel log review.\n`);
    }
    if (results.some((result) => !result.ok)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(() => {
        console.error('Monitoring could not complete; inspect this workflow without publishing application responses or credentials.');
        process.exitCode = 1;
    });
}
