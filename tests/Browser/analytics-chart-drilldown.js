// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function analyticsChartDrilldown(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    await page.context().clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.admin');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.goto(`${origin}/analytics`);

    const drilldownHeading = page.getByRole('heading', {
        name: 'Drilldown',
        exact: true,
    });
    const checked = [];
    async function expectDrilldown(click, dimension, label) {
        await click();
        await page.waitForURL(
            (url) =>
                url.searchParams.get('dimension') === dimension &&
                !!url.searchParams.get('value'),
        );
        await page.waitForFunction(
            () => document.activeElement?.textContent?.trim() === 'Drilldown',
        );
        if (!(await drilldownHeading.isVisible()))
            throw new Error(`${label} did not bring Drilldown into view`);
        const rows = await page
            .locator('section')
            .filter({ has: drilldownHeading })
            .locator('tbody tr')
            .count();
        if (rows === 0) throw new Error(`${label} opened an empty drilldown`);
        checked.push(`${label}: ${rows} rows`);
        await page.evaluate(() => window.scrollTo(0, 0));
    }

    const clickableIn = (title) =>
        page
            .locator(`section[aria-labelledby="${title}"] svg g.cursor-pointer`)
            .first();
    await expectDrilldown(
        () => clickableIn('source-flow-title').click(),
        'source',
        'source flow node',
    );
    await expectDrilldown(
        () => clickableIn('source-conversion-title').click(),
        'source',
        'conversion bar',
    );
    await expectDrilldown(
        () =>
            page
                .locator('section[aria-labelledby="source-share-title"]')
                .getByRole('button', { name: /^Drilldown / })
                .first()
                .click(),
        'source',
        'donut legend button',
    );
    await expectDrilldown(
        () => clickableIn('model-stage-title').click(),
        'model',
        'model bar',
    );
    return { checked };
}
