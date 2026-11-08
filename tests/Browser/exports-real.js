// Real downloads (Playwright download events, no mocks) from the isolated Laravel fixture (g11.* users, password "password"):
// chart PNG/CSV menus on /analytics/financing and /analytics/mapping-area, /transactions "Ekspor CSV", /analytics/export.csv,
// plus empty ranges. Checks PNG width, file names, BOM, delimiter, forbidden columns, formula safety and whole-result row counts.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function exportsReal(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(10000);
    // Earlier scripts share this browser page: drop their interceptors and offline mode.
    if (page.unrouteAll) await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.context().setOffline(false);
    await page.setViewportSize({ width: 1440, height: 900 });

    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const login = async (username) => {
        const field = page.getByLabel('Username');
        for (let attempt = 0; attempt < 2; attempt++) {
            // Leave the app first: an in-flight request from the old page could re-set the session cookie.
            await page.goto('about:blank');
            await page.context().clearCookies();
            await page.goto(`${origin}/login`, { waitUntil: 'load' });
            if (await field.waitFor({ timeout: 15000 }).then(() => true, () => false))
                break;
        }
        await field.fill(username);
        await page.locator('input[name="password"]').fill('password');
        await page.locator('[data-test="login-button"]').click();
        await page.waitForURL('**/dashboard');
    };
    const props = () =>
        page.evaluate(() => {
            const script = document.querySelector('script[data-page]');
            const raw = script ? script.textContent : document.getElementById('app')?.dataset.page;
            return JSON.parse(raw).props;
        });
    const open = async (path) => {
        const response = await page.goto(`${origin}${path}`);
        assert(response?.ok(), `${path} returned ${response?.status()}`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        return props();
    };
    const noNaN = async (state) => {
        const text = await page.locator('body').innerText();
        assert(!/\bNaN\b|undefined|Infinity/.test(text), `${state}: page text contains NaN/undefined/Infinity`);
    };
    const grab = async (trigger) => {
        const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { name: download.suggestedFilename(), buf: Buffer.concat(chunks) };
    };
    const hasBom = (buf) => buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    // RFC 4180-ish parser with a configurable delimiter; returns rows of cells.
    const parseCsv = (text, delimiter) => {
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (quoted) {
                if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (ch === '"') quoted = false;
                else cell += ch;
            } else if (ch === '"') quoted = true;
            else if (ch === delimiter) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += ch;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    };
    const decode = (buf) => buf.toString('utf8').replace(/^﻿/, '');
    const pngSize = (buf) => {
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        assert(signature.every((byte, i) => buf[i] === byte), 'Download is not a PNG');
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    };
    const forbidden = /telepon|phone|alamat|address|medsos|media sosial|social|coaching|komentar/i;
    const leaksContact = (rows) =>
        rows.flat().some((cell) => /(?:\+62|\b0)8\d{8,12}\b/.test(cell) || /@acc\.flow|@qa\./.test(cell));

    const checks = [];
    const tag = String(Date.now()).slice(-8);
    const monthNow = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }).slice(0, 7);

    // ---- seed hostile (formula-looking) data through the real create form ----
    await login('g11.sales');
    await open('/transactions/create');
    await page.locator('#name').fill(`=2+2 EXPT${tag}`);
    await page.locator('#phone').fill(`0814${tag}`);
    await page.locator('#social').fill('@qa.export');
    await page.locator('#model').fill(`+SUM EXPT${tag}`);
    await page.locator('#notes').fill(`@notes EXPT${tag}`);
    await page.getByRole('button', { name: 'Simpan transaksi' }).click();
    await page.waitForURL(/\/transactions(\?|$)/);

    // ---- chart PNG/CSV downloads from the real report pages ----
    await login('g11.admin');
    const charts = [
        {
            path: '/analytics/financing?mode=do',
            data: (p) => p.report,
            menus: [
                ['Cara pembiayaan', 'cara-pembiayaan'],
                ['Leasing tujuan', 'leasing-tujuan'],
            ],
            mode: 'realisasi-do',
        },
        {
            path: '/analytics/mapping-area',
            data: (p) => p.report,
            menus: [['Penjualan berdasarkan area', 'mapping-area']],
            mode: 'realisasi-do',
        },
    ];
    for (const chart of charts) {
        const p = await open(chart.path);
        const report = chart.data(p);
        assert(report.total > 0, `${chart.path}: fixture has no DO to export`);
        await noNaN(chart.path);
        for (const [title, slug] of chart.menus) {
            const expectedName = `${slug}-${chart.mode}-${report.from}_${report.to}`;
            for (const format of ['PNG', 'CSV']) {
                const file = await grab(async () => {
                    await page.getByRole('button', { name: `Unduh ${title}`, exact: true }).click();
                    await page.getByRole('menuitem', { name: `Unduh ${format}`, exact: true }).click();
                });
                assert(file.name === `${expectedName}.${format.toLowerCase()}`, `${title} ${format}: file name ${file.name}`);
                if (format === 'PNG') {
                    const { width, height } = pngSize(file.buf);
                    assert(width === 2400, `${title} PNG width ${width}px, expected 2400px`);
                    assert(height > 0, `${title} PNG has no height`);
                } else {
                    assert(hasBom(file.buf), `${title} CSV has no UTF-8 BOM`);
                    const rows = parseCsv(decode(file.buf), ';').filter((r) => r.length > 1 || r[0] !== '');
                    const [header, ...body] = rows;
                    assert(header.join(';') === 'periode_awal;periode_akhir;dasar_laporan;kategori;jumlah;total_acuan;persentase;status_data', `${title} CSV header ${header}`);
                    assert(body.every((r) => r[7] === 'Data laporan'), `${title} CSV carries a sample-data marker`);
                    assert(body.length > 0, `${title} CSV has no rows`);
                    const total = Number(body[0][5]);
                    assert(body.reduce((sum, r) => sum + Number(r[4]), 0) === total, `${title} CSV rows do not reconcile with total_acuan`);
                    if (slug === 'mapping-area') assert(total === report.total, `${title} CSV total ${total} != page ${report.total}`);
                    if (slug === 'cara-pembiayaan') assert(total === report.total, `${title} CSV total ${total} != page ${report.total}`);
                    if (slug === 'leasing-tujuan') assert(total === report.credit, `${title} CSV total ${total} != credit ${report.credit}`);
                    assert(!leaksContact(rows), `${title} CSV leaks contact data`);
                }
                checks.push(`${title} ${format}`);
            }
        }
    }

    // ---- /transactions "Ekspor CSV": whole filtered result, not only page 1 ----
    const exportList = async (query, state) => {
        const p = await open(`/transactions${query}`);
        const file = await grab(() => page.getByRole('link', { name: 'Ekspor CSV' }).click());
        assert(file.name === 'transaksi.csv', `${state}: file name ${file.name}`);
        assert(hasBom(file.buf), `${state}: no UTF-8 BOM`);
        const text = decode(file.buf);
        const rows = parseCsv(text, ';').filter((r) => !(r.length === 1 && r[0] === ''));
        const [header, ...body] = rows;
        assert(header.length === 12 && header[0] === 'Tanggal Progress' && header[11] === 'Keterangan', `${state}: unexpected ';' header ${header}`);
        assert(!header.some((h) => forbidden.test(h)), `${state}: header exposes a forbidden column: ${header}`);
        assert(!leaksContact(rows), `${state}: CSV leaks phone/social data`);
        assert(!/\bNaN\b|undefined/.test(text), `${state}: CSV contains NaN/undefined`);
        assert(body.every((r) => r.length === 12), `${state}: a row does not have 12 cells`);
        // Formula safety: no cell may start with a formula trigger unless neutralised with a leading quote.
        for (const cell of rows.flat())
            assert(!/^[=+\-@\t\r]/.test(cell), `${state}: unsafe cell "${cell}"`);
        return { total: p.transactions.total, shown: p.transactions.data.length, body };
    };

    let result = await exportList('?search=G11%20Pagination%20Model', 'search export');
    assert(result.total > 15 && result.shown === 15, `Expected more than one page of fixtures, got total ${result.total} shown ${result.shown}`);
    assert(result.body.length === result.total, `search export has ${result.body.length} rows, list total ${result.total}`);
    checks.push(`CSV search ${result.body.length}/${result.total}`);

    result = await exportList('', 'default export');
    assert(result.total > 15, 'Default list has no second page');
    assert(result.body.length === result.total, `default export has ${result.body.length} rows, list total ${result.total}`);
    checks.push(`CSV default ${result.body.length}/${result.total}`);

    result = await exportList('?stage=do&date_from=&date_to=', 'stage export');
    assert(result.body.length === result.total && result.total > 0, `stage export has ${result.body.length} rows, list total ${result.total}`);
    assert(result.body.every((r) => r[3] === 'DO'), 'stage export contains non-DO rows');
    checks.push(`CSV stage ${result.body.length}/${result.total}`);

    result = await exportList(`?search=EXPT${tag}&date_from=&date_to=`, 'formula export');
    assert(result.body.length === 1, `Expected one hostile row, got ${result.body.length}`);
    const [hostile] = result.body;
    assert(hostile[1] === `'=2+2 EXPT${tag}`, `customer cell not neutralised: ${hostile[1]}`);
    assert(hostile[2] === `'+SUM EXPT${tag}`, `model cell not neutralised: ${hostile[2]}`);
    assert(hostile[11] === `'@notes EXPT${tag}`, `notes cell not neutralised: ${hostile[11]}`);
    checks.push('CSV formula safe');

    // Empty range: list says so, export has only the header, no NaN anywhere.
    const emptyList = await open('/transactions?date_from=2000-01-01&date_to=2000-01-31');
    assert(emptyList.transactions.total === 0, 'Empty range still lists transactions');
    await page.getByText('Tidak ada hasil').first().waitFor();
    await noNaN('empty transactions');
    const emptyFile = await grab(() => page.getByRole('link', { name: 'Ekspor CSV' }).click());
    const emptyRows = parseCsv(decode(emptyFile.buf), ';').filter((r) => !(r.length === 1 && r[0] === ''));
    assert(hasBom(emptyFile.buf) && emptyRows.length === 1, `Empty export should be header only, got ${emptyRows.length} rows`);
    checks.push('CSV empty');

    // ---- /analytics/export.csv from the real "Unduh CSV" link ----
    const analytics = (await open(`/analytics?period=${monthNow}`)).analytics;
    const analyticsFile = await grab(() => page.getByRole('link', { name: 'Unduh CSV' }).click());
    assert(analyticsFile.name === `analisis-${monthNow}-acquisition.csv`, `analytics CSV file name ${analyticsFile.name}`);
    const analyticsRows = parseCsv(decode(analyticsFile.buf), ';');
    const at = (title) => analyticsRows.findIndex((r) => r[0] === title);
    const sourceRows = analyticsRows.slice(at('Analisis Sumber') + 2, at('Analisis Model') - 1);
    const modelRows = analyticsRows.slice(at('Analisis Model') + 2).filter((r) => !(r.length === 1 && r[0] === ''));
    assert(sourceRows.length === analytics.sources.length && sourceRows.length > 0, `analytics CSV sources ${sourceRows.length} != ${analytics.sources.length}`);
    assert(modelRows.length === analytics.models.length && modelRows.length > 15, `analytics CSV models ${modelRows.length} != ${analytics.models.length}`);
    assert(modelRows.some((r) => r[0] === `'+SUM EXPT${tag}`), 'analytics CSV model label not neutralised');
    for (const cell of analyticsRows.flat()) assert(!/^[=+\-@\t\r]/.test(cell), `analytics CSV unsafe cell "${cell}"`);
    assert(!analyticsRows.flat().some((cell) => forbidden.test(cell)) , 'analytics CSV exposes a forbidden column');
    assert(!leaksContact(analyticsRows), 'analytics CSV leaks contact data');
    const analyticsBom = hasBom(analyticsFile.buf);
    assert(analyticsBom, 'analytics CSV must start with a UTF-8 BOM');
    checks.push(`analytics CSV ${sourceRows.length}+${modelRows.length} rows, BOM ${analyticsBom}`);

    await open('/analytics?period=2000-01');
    await noNaN('empty analytics');
    const emptyAnalytics = await grab(() => page.getByRole('link', { name: 'Unduh CSV' }).click());
    assert(emptyAnalytics.name === 'analisis-2000-01-acquisition.csv', `empty analytics file name ${emptyAnalytics.name}`);
    assert(!/\bNaN\b|undefined/.test(decode(emptyAnalytics.buf)), 'empty analytics CSV contains NaN/undefined');
    checks.push('analytics CSV empty');

    // ---- empty report ranges: states, no NaN, no export menu to click ----
    for (const [path, text] of [
        ['/analytics/financing?from=2000-01&to=2000-01&mode=do', 'Belum ada transaksi pada periode ini'],
        ['/analytics/financing?from=2000-01&to=2000-01&mode=prospect', 'Belum ada transaksi pada periode ini'],
        ['/analytics/mapping-area?from=2000-01&to=2000-01', 'Belum ada DO pada rentang ini'],
    ]) {
        const p = await open(path);
        assert(p.report.total === 0, `${path}: expected an empty report`);
        await page.getByText(text).first().waitFor();
        await noNaN(path);
        checks.push(`empty ${path}`);
    }

    // ---- negative: BM has no transaction export ----
    await login('g11.bm');
    const denied = await page.goto(`${origin}/transactions/export.csv`).catch(() => null);
    assert(denied?.status() === 403, `BM transactions export returned ${denied?.status()}`);
    checks.push('BM export forbidden');

    return { checks, analyticsBom };
}
