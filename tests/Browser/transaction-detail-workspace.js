// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionDetailWorkspace(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };

    await page.context().clearCookies();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.goto(`${origin}/transactions?search=G11%20Workspace%20Model&date_from=&date_to=`);
    await page.getByRole('button', { name: 'Detail', exact: true }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('region', { name: 'Properti transaksi' }).waitFor();
    const checked = [];

    // Header: stage action and contact actions are reachable from any mode.
    await dialog.getByRole('button', { name: 'Ubah tahap', exact: true }).first().waitFor();
    assert(
        (await dialog.getByRole('button', { name: /^(Telepon|WhatsApp)/ }).count()) +
            (await dialog.getByRole('link', { name: /^(Telepon|WhatsApp)/ }).count()) >=
            2,
        'Header lacks the Telepon and WhatsApp actions',
    );
    checked.push('header actions');

    // Customer data is editable before the stage that requires it.
    await dialog.getByRole('button', { name: /^Gender:/ }).click();
    await page.getByRole('option', { name: 'Perempuan', exact: true }).click();
    await dialog.getByRole('status').filter({ hasText: 'Tersimpan' }).waitFor();
    await dialog.getByRole('button', { name: /^Kendaraan:/ }).waitFor();
    checked.push('profile and vehicle editable');

    // Rail modes from the customer detail.
    for (const [rail, heading] of [
        ['Pelanggan', 'Pelanggan'],
        ['Follow-up', 'Follow-up'],
        ['Riwayat', 'Riwayat pelanggan'],
        ['Aktivitas', 'Aktivitas pelanggan'],
    ]) {
        await dialog.getByRole('button', { name: rail, exact: true }).click();
        await dialog.getByRole('heading', { name: heading, exact: true }).waitFor();
    }
    await dialog.getByRole('form', { name: 'Catat aktivitas' }).waitFor();
    await dialog.getByRole('button', { name: 'Pelanggan', exact: true }).click();
    await dialog.getByRole('region', { name: 'Preferensi kontak pelanggan' }).waitFor();
    checked.push('customer, follow-up, history and activity modes');

    // Stage form lives in the panel and points at the profile data the stage still needs.
    await dialog.getByRole('button', { name: 'Ubah tahap', exact: true }).first().click();
    await dialog.getByRole('heading', { name: 'Ubah tahap', exact: true }).waitFor();
    await dialog.getByLabel('Tahap baru').selectOption('spk');
    await dialog.getByText('Lengkapi data pelanggan untuk tahap ini', { exact: false }).waitFor();
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Komentar coaching', exact: true }).waitFor();
    checked.push('stage form in the panel');

    return { checked };
}
