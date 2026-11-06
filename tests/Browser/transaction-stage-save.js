// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionStageSave(page) {
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
    await page.goto(`${origin}/transactions?search=G11%20Report%20Model`);
    await page
        .getByText('Lead', { exact: true })
        .filter({ visible: true })
        .waitFor();
    await page.getByRole('button', { name: 'Ubah tahap', exact: true }).click();

    const title = page.getByRole('heading', { name: 'Ubah tahap transaksi' });
    const stage = page.getByLabel('Tahap baru');
    const notes = page.getByLabel('Catatan', { exact: true });
    const save = page.getByRole('button', { name: 'Simpan', exact: true });
    const patchStage = () =>
        page.waitForResponse(
            (response) =>
                response.request().method() === 'PATCH' &&
                /^\/transactions\/[^/]+\/stage$/.test(
                    new URL(response.url()).pathname,
                ),
        );

    await stage.selectOption('spk');
    await notes.fill('G11 stage validation draft');
    const [rejected] = await Promise.all([patchStage(), save.click()]);
    await page
        .getByText('Konfirmasi booking fee diperlukan untuk tahap SPK.')
        .waitFor();
    if (
        (await stage.inputValue()) !== 'spk' ||
        (await notes.inputValue()) !== 'G11 stage validation draft'
    ) {
        throw new Error('Stage validation discarded the draft');
    }
    await page
        .getByText('Lead', { exact: true })
        .filter({ visible: true })
        .waitFor();

    await page
        .getByRole('checkbox', { name: 'Konfirmasi booking fee' })
        .check();
    const [saved] = await Promise.all([patchStage(), save.click()]);
    if (
        ![302, 303].includes(saved.status()) ||
        saved.url() !== rejected.url()
    ) {
        throw new Error('Stage retry did not reach the same transaction');
    }
    await title.waitFor({ state: 'hidden' });
    await page.reload();
    await page
        .getByText('SPK', { exact: true })
        .filter({ visible: true })
        .waitFor();

    return { validated: true, persistedAfterReload: true };
}
