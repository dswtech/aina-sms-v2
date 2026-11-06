// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionPagination(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');

    const query = 'G11 Pagination Model';
    await page.goto(
        `${origin}/transactions?search=${encodeURIComponent(query)}&tab=active`,
    );
    const firstPageRow = page
        .getByText(/^G11 Pagination Model 16 ·/)
        .filter({ visible: true });
    const secondPageRow = page
        .getByText(/^G11 Pagination Model 1 ·/)
        .filter({ visible: true });
    await firstPageRow.waitFor();
    const draft = page.getByRole('textbox', { name: 'Pencarian' });
    await draft.fill('Unapplied draft');
    const pageTwo = (url) =>
        url.pathname === '/transactions' &&
        url.searchParams.get('page') === '2' &&
        url.searchParams.get('search') === query &&
        url.searchParams.get('tab') === 'active';
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    await page.route(
        pageTwo,
        async (route) => {
            await pending;
            await route.fulfill({
                status: 503,
                contentType: 'text/plain',
                body: 'QA unavailable',
            });
        },
        { times: 1 },
    );
    try {
        await page.getByRole('button', { name: '2', exact: true }).click();
        await page
            .getByRole('status')
            .filter({ hasText: 'Memuat transaksi' })
            .waitFor();
        if (!(await firstPageRow.isVisible()))
            throw new Error('Loading hid the first page');
    } finally {
        release();
    }

    const alert = page.getByRole('alert').filter({ hasText: 'data terakhir' });
    await alert.waitFor();
    if (
        new URL(page.url()).searchParams.has('page') ||
        !(await firstPageRow.isVisible())
    )
        throw new Error('Failed pagination replaced the current page');
    await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
    await page.waitForURL(pageTwo);
    await secondPageRow.waitFor();
    await firstPageRow.waitFor({ state: 'hidden' });
    await alert.waitFor({ state: 'hidden' });
    if ((await draft.inputValue()) !== 'Unapplied draft')
        throw new Error('Pagination discarded the unapplied draft');

    return { pageTwoLoaded: true, appliedFiltersPreserved: true };
}
