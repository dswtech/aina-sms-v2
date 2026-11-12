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
    await page.goto(
        `${origin}/transactions?search=G11%20Report%20Model&date_from=&date_to=`,
    );
    await page
        .getByText('Lead', { exact: true })
        .filter({ visible: true })
        .first()
        .waitFor();
    await page.getByRole('button', { name: 'Ubah tahap', exact: true }).click();

    const title = page
        .getByRole('dialog')
        .getByRole('heading', { name: 'Ubah tahap', exact: true });
    const stage = page.getByLabel('Tahap baru');
    const notes = page.getByLabel('Catatan', { exact: true });
    const save = page.getByRole('button', {
        name: 'Simpan tahap',
        exact: true,
    });
    const patchStage = () =>
        page.waitForResponse(
            (response) =>
                response.request().method() === 'PATCH' &&
                /^\/transactions\/[^/]+\/stage$/.test(
                    new URL(response.url()).pathname,
                ),
        );

    // The closing-month editor sits beside the stage form and saves on its own.
    const [closing] = await Promise.all([
        page.waitForResponse(
            (response) =>
                response.request().method() === 'PATCH' &&
                /^\/transactions\/[^/]+\/closing-month$/.test(
                    new URL(response.url()).pathname,
                ),
        ),
        (async () => {
            await page
                .getByLabel('Estimasi bulan closing', { exact: true })
                .fill('2027-01');
            await page
                .getByRole('button', { name: 'Simpan estimasi closing' })
                .click();
        })(),
    ]);
    if (closing.status() >= 400)
        throw new Error('Closing month was not saved: ' + closing.status());

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
        .first()
        .waitFor();

    const confirmation = page.getByRole('checkbox', {
        name: 'Konfirmasi booking fee',
    });
    await confirmation.check();
    await page.context().setOffline(true);
    try {
        await save.click();
        await page
            .getByRole('alert')
            .filter({ hasText: 'Koneksi terputus saat menyimpan tahap.' })
            .waitFor();
        if (
            (await stage.inputValue()) !== 'spk' ||
            (await notes.inputValue()) !== 'G11 stage validation draft' ||
            !(await confirmation.isChecked())
        ) {
            throw new Error('Offline save discarded the stage draft');
        }
        await page
            .getByText('Lead', { exact: true })
            .filter({ visible: true })
            .first()
            .waitFor();
    } finally {
        await page.context().setOffline(false);
    }
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

    // Moving back is marked in the list and needs a written reason.
    await page.getByRole('button', { name: 'Ubah tahap', exact: true }).click();
    await title.waitFor();
    const options = await stage
        .locator('option')
        .evaluateAll((items) => items.map((item) => item.textContent));
    if (!options.includes('▼ Lead'))
        throw new Error('Earlier stage is not marked as mundur: ' + options);
    await stage.selectOption('lead');
    await page
        .getByText('Mundur tahap: alasan wajib diisi pada catatan.')
        .waitFor();
    if (!(await save.isDisabled()))
        throw new Error('Moving back saved without a reason');
    await page
        .getByLabel('Catatan alasan mundur', { exact: true })
        .fill('G11 pelanggan menunda');
    const [back] = await Promise.all([patchStage(), save.click()]);
    if (![302, 303].includes(back.status()))
        throw new Error('Moving back with a reason was rejected');
    await title.waitFor({ state: 'hidden' });
    await page.reload();
    await page
        .getByText('Lead', { exact: true })
        .filter({ visible: true })
        .first()
        .waitFor();

    return {
        validated: true,
        offlineDraftPreserved: true,
        persistedAfterReload: true,
    };
}
