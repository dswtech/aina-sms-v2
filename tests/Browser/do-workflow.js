// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function doWorkflow(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');

    const login = async (username) => {
        await page.context().clearCookies();
        await page.goto(`${origin}/login`);
        await page.getByLabel('Username').fill(username);
        await page.locator('input[name="password"]').fill('password');
        await page.locator('[data-test="login-button"]').click();
        await page.waitForURL('**/dashboard');
    };
    const visit = (scenario) =>
        page.goto(`${origin}/transactions?search=G11%20DO%20${scenario}`);
    const expectStage = (stage) =>
        page
            .getByText(stage, { exact: true })
            .filter({ visible: true })
            .waitFor();
    const recordDo = async (scenario) => {
        await visit(scenario);
        await expectStage('SPK');
        await page
            .getByRole('button', { name: 'Ubah tahap', exact: true })
            .click();
        const stage = page.getByLabel('Tahap baru');
        await stage.selectOption('do');
        if (await stage.locator('option[value="delivery"]').count())
            throw new Error('Delivery is exposed as an ordinary stage change');
        const save = page.getByRole('button', { name: 'Simpan tahap', exact: true });
        await page.getByRole('checkbox', { name: 'PO', exact: true }).check();
        await page.getByRole('checkbox', { name: 'DP', exact: true }).check();
        if (await save.isEnabled())
            throw new Error('DO can be saved without confirming Unit');
        await page.getByRole('checkbox', { name: 'Unit', exact: true }).check();
        await save.click();
        await page
            .getByRole('dialog')
            .getByRole('heading', { name: 'Ubah tahap', exact: true })
            .waitFor({ state: 'hidden' });
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await expectStage('DO');
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await login('g11.spv');
    await recordDo('Ship');
    await page
        .getByRole('button', { name: 'Konfirmasi Delivery', exact: true })
        .click();
    const delivery = page
        .getByRole('dialog')
        .getByRole('form', { name: 'Konfirmasi Delivery' });
    await delivery
        .getByRole('button', { name: 'Konfirmasi Delivery', exact: true })
        .click();
    await delivery.waitFor({ state: 'hidden' });
    await page.reload();
    await expectStage('Delivery');
    await recordDo('Cancel');

    await login('g11.admin');
    await visit('Cancel');
    await page
        .getByRole('button', { name: 'Batalkan DO', exact: true })
        .click();
    const correction = page
        .getByRole('dialog')
        .getByRole('form', { name: 'Batalkan DO' });
    await correction
        .getByRole('textbox', { name: 'Alasan pembatalan' })
        .fill('Koreksi data sintetis.');
    await correction
        .getByRole('button', { name: 'Batalkan DO', exact: true })
        .click();
    await correction.waitFor({ state: 'hidden' });
    await page.reload();
    await expectStage('SPK');
    await visit('Ship');
    await expectStage('Delivery');
    if (
        await page
            .getByRole('button', { name: 'Batalkan DO', exact: true })
            .count()
    )
        throw new Error('Cancellation is exposed after Delivery');

    return { doChecklist: true, delivery: true, cancellation: true };
}
