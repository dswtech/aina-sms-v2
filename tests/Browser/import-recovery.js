// Failures stop before Laravel; each manual retry reaches the isolated server.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function importRecovery(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    const checked = [];
    for (const [index, failure] of ['network', 'http'].entries()) {
        await page.goto(`${origin}/imports`);
        const filename = `g11-recovery-${failure}.csv`;
        const name = `G11 Import ${failure}`;
        await page.getByLabel('File CSV').setInputFiles({
            name: filename,
            mimeType: 'text/csv',
            buffer: Buffer.from(
                `name,phone,vehicle_model,source,sales_username\n${name},0812345698${index}1,G11 Import Model,walk_in,g11.sales\n`,
            ),
        });
        let batchPath;
        for (const operation of ['preview', 'commit']) {
            const path =
                operation === 'preview' ? '/imports/preview' : batchPath;
            let requests = 0;
            const observe = (request) => {
                if (
                    request.method() === 'POST' &&
                    (operation === 'preview'
                        ? new URL(request.url()).pathname === path
                        : /^\/imports\/\d+\/commit$/.test(
                              new URL(request.url()).pathname,
                          ))
                )
                    requests++;
            };
            page.on('request', observe);
            let release;
            const pending = new Promise((resolve) => {
                release = resolve;
            });
            await page.route(
                (url) =>
                    operation === 'preview'
                        ? url.pathname === path
                        : /^\/imports\/\d+\/commit$/.test(url.pathname),
                async (route) => {
                    batchPath = new URL(route.request().url()).pathname;
                    await pending;
                    if (failure === 'network')
                        await route.abort('internetdisconnected');
                    else
                        await route.fulfill({
                            status: 503,
                            contentType: 'text/plain',
                            body: 'QA unavailable',
                        });
                },
                { times: 1 },
            );
            const button = page.getByRole('button', {
                name:
                    operation === 'preview'
                        ? 'Preview'
                        : 'Import 1 baris valid',
                exact: true,
            });
            try {
                await button.click();
                const busy = page.getByRole('button', {
                    name: operation === 'preview' ? 'Memvalidasi' : 'Mengimpor',
                    exact: true,
                });
                await busy.waitFor();
                if (
                    !(await busy.isDisabled()) ||
                    (await busy.getAttribute('aria-busy')) !== 'true' ||
                    !(await page.getByLabel('File CSV').isDisabled())
                )
                    throw new Error(
                        `${operation} did not guard its pending request`,
                    );
                await busy.evaluate((element) => {
                    element.click();
                    element.click();
                });
                if (operation === 'preview')
                    await page.locator('form').evaluate((element) =>
                        element.dispatchEvent(
                            new Event('submit', {
                                bubbles: true,
                                cancelable: true,
                            }),
                        ),
                    );
            } finally {
                release();
            }
            const alert = page.getByRole('alert').filter({
                hasText:
                    operation === 'preview'
                        ? 'Preview belum dapat dimuat'
                        : 'Hasil impor belum dapat dipastikan',
            });
            await alert.waitFor();
            if (
                (await page
                    .getByLabel('File CSV')
                    .evaluate((element) => element.files?.[0]?.name)) !==
                filename
            )
                throw new Error('Import failure lost the selected CSV');
            if (operation === 'commit') {
                await page
                    .getByRole('region', { name: 'Preview impor' })
                    .getByText(name, { exact: true })
                    .first()
                    .waitFor();
                if (!(await alert.innerText()).includes('riwayat'))
                    throw new Error(
                        'Commit failure omitted uncertain outcome guidance',
                    );
            }
            const requestPath =
                operation === 'preview' ? '/imports/preview' : batchPath;
            const [response] = await Promise.all([
                page.waitForResponse(
                    (response) =>
                        new URL(response.url()).pathname === requestPath &&
                        response.request().method() === 'POST',
                ),
                button.press('Enter'),
            ]);
            if (![200, 302, 303].includes(response.status()))
                throw new Error(`Import retry returned ${response.status()}`);
            await alert.waitFor({ state: 'hidden' });
            if (operation === 'preview') {
                await page
                    .getByRole('region', { name: 'Preview impor' })
                    .getByText(name, { exact: true })
                    .first()
                    .waitFor();
                batchPath = undefined;
            } else {
                await page
                    .getByText('1 baris berhasil diimport.', { exact: true })
                    .waitFor();
            }
            page.removeListener('request', observe);
            // Preview path is known before dispatch. Commit identity is captured by interception.
            if (requests !== 2)
                throw new Error(`Duplicate ${operation} request: ${requests}`);
        }
        await page.reload();
        const rows = page
            .getByRole('region', { name: 'Riwayat batch impor' })
            .locator('ul[aria-label="Batch impor"] > li')
            .filter({ hasText: filename });
        if (
            (await rows.count()) !== 1 ||
            !(await rows.innerText()).includes('completed')
        )
            throw new Error(
                'Retry did not persist exactly one completed batch',
            );
        await page.goto(
            `${origin}/customers?search=${encodeURIComponent(name)}`,
        );
        if (
            (await page.getByRole('heading', { name, exact: true }).count()) !==
            1
        )
            throw new Error('Retry did not persist exactly one customer');
        checked.push(failure);
    }
    // The server may commit even when its response never reaches the browser.
    await page.goto(`${origin}/imports`);
    await page.getByLabel('File CSV').setInputFiles({
        name: 'g11-response-lost.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            'name,phone,vehicle_model,source,sales_username\nG11 Import Response Lost,081234569899,G11 Import Model,walk_in,g11.sales\n',
        ),
    });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const commit = page.getByRole('button', {
        name: 'Import 1 baris valid',
        exact: true,
    });
    await commit.waitFor();
    await page.route(
        (url) => /^\/imports\/\d+\/commit$/.test(url.pathname),
        async (route) => {
            const response = await route.fetch({ maxRedirects: 0 });
            if (![302, 303].includes(response.status()))
                throw new Error(
                    'Expected Laravel to save before losing response',
                );
            await route.abort('internetdisconnected');
        },
        { times: 1 },
    );
    await commit.click();
    const uncertain = page
        .getByRole('alert')
        .filter({ hasText: 'Hasil impor belum dapat dipastikan' });
    await uncertain.waitFor();
    await page.getByRole('region', { name: 'Preview impor' }).waitFor();
    await page
        .getByRole('link', { name: 'Periksa riwayat batch' })
        .press('Enter');
    const saved = page
        .getByRole('region', { name: 'Riwayat batch impor' })
        .locator('ul[aria-label="Batch impor"] > li')
        .filter({ hasText: 'g11-response-lost.csv' });
    await saved.waitFor();
    if (
        (await saved.count()) !== 1 ||
        !(await saved.innerText()).includes('completed')
    )
        throw new Error('History did not reconcile the lost commit response');
    await page.goto(
        `${origin}/customers?search=G11%20Import%20Response%20Lost`,
    );
    if (
        (await page
            .getByRole('heading', {
                name: 'G11 Import Response Lost',
                exact: true,
            })
            .count()) !== 1
    )
        throw new Error('Lost response created duplicate customers');
    return {
        checked,
        previewAndCommitRetryReachedLaravel: true,
        persistedOnce: true,
        lostCommitResponseReconciled: true,
    };
}
