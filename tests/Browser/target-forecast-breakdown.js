// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function targetForecastBreakdown(page) {
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
    await page.goto(`${origin}/targets`);

    const card = page.getByRole('region', { name: 'Asal forecast' });
    for (const stage of ['Lead', 'Prospect', 'Hot Prospect', 'SPK'])
        await card
            .getByRole('rowheader', { name: stage, exact: true })
            .waitFor();
    await card.getByText('+ Pipeline berbobot').waitFor();

    const toggle = page.getByRole('button', {
        name: /G11 Synthetic Sales.*rincian forecast per tahap/,
    });
    if ((await toggle.getAttribute('aria-expanded')) !== 'false')
        throw new Error('Sales breakdown should start collapsed');
    await toggle.click();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true')
        throw new Error('Sales breakdown did not expand');
    const detail = page.locator(
        `#${await toggle.getAttribute('aria-controls')}`,
    );
    await detail.getByText(/Lead \d+ × 10% =/).waitFor();
    await toggle.click();
    if (await detail.count())
        throw new Error('Sales breakdown did not collapse');

    await page.setViewportSize({ width: 390, height: 844 });
    const summary = page.getByText('Rincian forecast per tahap').first();
    await summary.click();
    await page
        .locator('details[open]')
        .getByText(/SPK \d+ × 75% =/)
        .waitFor();
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error('Target page scrolls horizontally on mobile');

    return { card: true, desktopToggle: true, mobileDetails: true };
}
