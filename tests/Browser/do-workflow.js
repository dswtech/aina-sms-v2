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
        // Ownership is asked only while the transaction has none (a redo after cancel keeps it).
        const ownership = page.locator('#stage-ownership');
        if (await ownership.count()) await ownership.selectOption('first_buyer');
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
    // DO is the final stage: nothing after it, Delivery included.
    if (await page.getByRole('button', { name: /Delivery/ }).count())
        throw new Error('Delivery is still offered after DO');
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
    await expectStage('DO');
    // A DO recorded this Jakarta month stays reversible for Admin.
    if (
        !(await page
            .getByRole('button', { name: 'Batalkan DO', exact: true })
            .count())
    )
        throw new Error('Same-month DO cannot be cancelled');

    // Deleting a duplicate, whatever its stage: SPK by Admin on a phone, DO by the Supervisor on desktop.
    const remove = async (scenario) => {
        await visit(scenario);
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true })
            .click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
        const form = dialog.getByRole('form', { name: 'Hapus transaksi' });
        const confirm = form.getByRole('button', {
            name: 'Hapus transaksi',
            exact: true,
        });
        if (await confirm.isEnabled())
            throw new Error('A transaction can be deleted without a reason');
        await form
            .getByRole('textbox', { name: 'Alasan penghapusan' })
            .fill('Double input sintetis.');
        const overflow = await dialog.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
        );
        if (overflow > 1)
            throw new Error(`Delete form overflows by ${overflow}px`);
        await confirm.click();
        await dialog.waitFor({ state: 'hidden' });
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true })
            .waitFor({ state: 'hidden' });
        // The row and its button are gone, so focus must land on the page heading.
        await page.waitForFunction(
            () =>
                document.activeElement?.tagName === 'H1' &&
                document.activeElement.textContent === 'Transaksi',
        );
        await page.reload();
        if (await page.getByText(`G11 DO ${scenario}`).count())
            throw new Error('A deleted transaction is still listed');
    };
    await remove('Cancel');
    await page.setViewportSize({ width: 1440, height: 900 });
    await login('g11.spv');
    await remove('Ship');

    return {
        doChecklist: true,
        noDelivery: true,
        cancellation: true,
        deletion: true,
    };
}
