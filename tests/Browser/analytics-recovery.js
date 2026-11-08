// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function analyticsRecovery(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    await page.context().clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    let emptyPeriodRequests = 0;
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (
            url.pathname === '/analytics' &&
            url.searchParams.get('period') === ''
        )
            emptyPeriodRequests++;
    });
    const checked = [];
    for (const failure of ['network', 'http']) {
        await page.goto(`${origin}/analytics?period=2001-01`);
        const period = page.getByLabel('Dari bulan', { exact: true });
        const endPeriod = page.getByLabel('Sampai bulan', { exact: true });
        await period.fill('');
        const source = page.locator('#analisis-sumber tbody tr').first();
        const originalRow = await source.innerText();
        if (!originalRow.includes('Walk In'))
            throw new Error('Expected the seeded lead in the source report');
        const next = failure === 'network' ? '2000-01' : '2000-02';
        let release;
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        const match = (url) =>
            url.pathname === '/analytics' &&
            url.searchParams.get('period') === next;
        await page.route(
            match,
            async (route) => {
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
        try {
            await period.fill(next);
            await endPeriod.fill(next);
            await page
                .getByRole('button', { name: 'Tampilkan', exact: true })
                .click();
            await page
                .getByRole('status')
                .filter({ hasText: 'Memuat analisis' })
                .waitFor();
            if ((await source.innerText()) !== originalRow)
                throw new Error('Loading removed the existing report');
        } finally {
            release();
        }
        await page
            .getByRole('alert')
            .filter({ hasText: 'data terakhir' })
            .waitFor();
        if (
            (await period.inputValue()) !== next ||
            (await endPeriod.inputValue()) !== next ||
            (await source.innerText()) !== originalRow
        )
            throw new Error('Failed request replaced the report');
        await page
            .getByRole('button', { name: 'Coba lagi', exact: true })
            .press('Enter');
        await page.waitForURL(match);
        await source
            .getByText('Belum ada transaksi', { exact: false })
            .waitFor();
        await page
            .getByRole('alert')
            .filter({ hasText: 'data terakhir' })
            .waitFor({ state: 'hidden' });
        if (
            !(await page
                .getByRole('heading', { name: 'Analisis', exact: true })
                .evaluate((element) => element === document.activeElement))
        ) {
            throw new Error(
                'Retry did not return focus to the Analisis heading',
            );
        }
        checked.push(failure);
    }
    if (emptyPeriodRequests)
        throw new Error('Clearing the month sent an invalid period');
    return { checked, retryReachedLaravel: true };
}
