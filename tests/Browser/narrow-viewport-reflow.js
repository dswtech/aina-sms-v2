// Check both narrow viewports and Chrome's native page zoom.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function narrowViewportReflow(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    await page.context().clearCookies();
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');

    const assertReflow = async (state) => {
        const { viewport, content } = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
        }));
        if (content > viewport)
            throw new Error(
                `${state}: content ${content}px exceeds viewport ${viewport}px`,
            );
    };
    const checkPages = async () => {
        for (const path of [
            '/dashboard',
            '/customers',
            '/analytics?period=2001-01',
            '/transactions?search=G11%20Report%20Model&date_from=&date_to=',
        ]) {
            const url = `${origin}${path}`;
            const response = await page.goto(url);
            if (!response?.ok() || page.url() !== url)
                throw new Error(`Could not load ${path}`);
            await page.getByRole('main').waitFor();
            await assertReflow(path);
        }
        await page
            .getByRole('button', { name: 'Ubah tahap', exact: true })
            .click();
        await page
            .getByRole('heading', { name: 'Ubah tahap transaksi' })
            .waitFor();
        const save = page.getByRole('button', { name: 'Simpan', exact: true });
        await save.scrollIntoViewIfNeeded();
        const bounds = await save.boundingBox();
        const width = await page.evaluate(() => innerWidth);
        if (!bounds || bounds.x < 0 || bounds.x + bounds.width > width)
            throw new Error('Stage save action is horizontally clipped');
        await assertReflow('stage form');
        await page.getByRole('button', { name: 'Batal', exact: true }).click();
    };
    const checked = [
        { width: 320, height: 400 },
        { width: 720, height: 450 },
    ];
    for (const viewport of checked) {
        await page.setViewportSize(viewport);
        await checkPages();
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const before = await page.evaluate(() => ({
        width: innerWidth,
        scale: devicePixelRatio,
    }));
    const appearance = await page.context().newPage();
    try {
        await appearance.goto('chrome://settings/appearance');
        await appearance
            .getByRole('combobox', { name: 'Page zoom' })
            .selectOption({ label: '200%' });
        await page.waitForFunction(
            ({ width, scale }) =>
                innerWidth === width / 2 && devicePixelRatio === scale * 2,
            before,
        );
        await checkPages();
    } finally {
        await appearance.close();
    }

    return { checked, chromeZoom: '200%' };
}
