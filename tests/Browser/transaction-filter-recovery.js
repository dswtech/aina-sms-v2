// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionFilterRecovery(page) {
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
    for (const failure of ['network', 'http']) {
        await page.goto(`${origin}/transactions?search=G11%20Report%20Model&date_from=&date_to=`);
        const panel = page.getByRole('region', { name: 'Filter transaksi' });
        const search = panel.getByRole('textbox', { name: 'Pencarian' });
        const previous = page
            .getByText(/^G11 Report Model ·/)
            .filter({ visible: true });
        await previous.waitFor();
        const next = `No matching G11 ${failure}`;
        const matches = (url) =>
            url.pathname === '/transactions' &&
            url.searchParams.get('search') === next &&
            url.searchParams.get('tab') === 'active';
        let release;
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        await page.route(
            matches,
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
            await search.fill(next);
            await panel
                .getByRole('button', { name: 'Aktif', exact: true })
                .click();
            await page
                .getByRole('status')
                .filter({ hasText: 'Memuat transaksi' })
                .waitFor();
            if (!(await previous.isVisible()))
                throw new Error('Loading hid the existing transactions');
        } finally {
            release();
        }
        const alert = page
            .getByRole('alert')
            .filter({ hasText: 'data terakhir' });
        await alert.waitFor();
        if (
            (await search.inputValue()) !== next ||
            !(await previous.isVisible()) ||
            new URL(page.url()).searchParams.get('search') !==
                'G11 Report Model'
        ) {
            throw new Error(
                'Failed filter lost the draft, results or applied URL',
            );
        }
        const retry = page.getByRole('button', {
            name: 'Coba lagi',
            exact: true,
        });
        if (failure === 'http') {
            await search.fill('Edited G11 draft');
            if (await retry.count())
                throw new Error(
                    'Editing a failed filter still offers to retry its old query',
                );
            if (
                !(await alert.innerText()).includes(
                    'Terapkan filter yang telah diubah.',
                )
            )
                throw new Error('Changed filter draft lacks guidance');
            await search.fill(next);
        }
        await retry.press('Enter');
        await page.waitForURL(matches);
        await page
            .getByText('Tidak ada transaksi sesuai filter.', { exact: true })
            .waitFor();
        await alert.waitFor({ state: 'hidden' });
        if (
            !(await page
                .getByRole('heading', { name: 'Transaksi', exact: true })
                .evaluate((element) => element === document.activeElement))
        ) {
            throw new Error('Retry did not restore keyboard focus');
        }
        checked.push(failure);
    }
    await page.goto(`${origin}/transactions?search=G11%20Report%20Model&date_from=&date_to=`);
    await page
        .getByText(/^G11 Report Model ·/)
        .filter({ visible: true })
        .waitFor();
    // Picking an earlier day after the start reorders the range instead of saving a reversed one.
    await page.goto(`${origin}/transactions?search=G11%20Report%20Model&date_from=2001-02-10&date_to=`);
    const range = page.locator('#transaction-date');
    await range.click();
    await page.locator('[data-slot="popover-content"] button[data-day="2001-02-03"]').click();
    await page.keyboard.press('Escape');
    if (
        !/^03 Feb 2001 – 10 Feb 2001$/.test((await range.innerText()).trim()) ||
        (await page
            .getByRole('button', { name: 'Coba lagi', exact: true })
            .count())
    ) {
        throw new Error('An earlier pick did not reorder the date range');
    }
    // On phones a stage link opens on the results; the panel stays one tap away. Other visits start open.
    await page.setViewportSize({ width: 390, height: 844 });
    const searchField = page.locator('#search');
    await page.goto(`${origin}/transactions?tab=active&stage=spk&date_from=&date_to=`);
    await page.getByRole('button', { name: 'Tampilkan filter' }).waitFor();
    if (await searchField.isVisible())
        throw new Error('A stage link did not collapse the phone filters');
    await page.getByRole('button', { name: 'Tampilkan filter' }).click();
    await searchField.waitFor();
    // A closing-month link collapses too, counts as a filter and survives a tab change; Reset clears it.
    await page.goto(`${origin}/transactions?closing_month=2026-11&date_from=&date_to=`);
    const closingNote = page.getByText(/^Hanya peluang closing/);
    await closingNote.waitFor();
    if (await searchField.isVisible())
        throw new Error('A closing link did not collapse the phone filters');
    await page.getByText('1 filter aktif', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Tampilkan filter' }).click();
    await page.getByRole('button', { name: 'Aktif', exact: true }).click();
    await page.waitForURL(/tab=active/);
    await page.getByText('2 filter aktif', { exact: true }).waitFor();
    if (!page.url().includes('closing_month=2026-11') || !(await closingNote.isVisible()))
        throw new Error('A tab change dropped the closing-month filter');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await closingNote.waitFor({ state: 'hidden' });
    await page.goto(`${origin}/transactions?date_from=&date_to=`);
    await searchField.waitFor();
    return {
        checked,
        transactionRetryReachedLaravel: true,
        reversedPickReordered: true,
    };
}
