// Run only on the isolated G11 server. Requests reach Laravel without interception.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function leadServerSave(page) {
    page.setDefaultTimeout(8000);
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        throw new Error('Expected the isolated loopback test server');
    }

    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.sales');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.goto(`${origin}/customers`);
    await page
        .getByText('G11 Synthetic Sales', { exact: true })
        .first()
        .waitFor();
    // Pelanggan -> the shared create form (no second storage path).
    await page.getByRole('link', { name: 'Tambah Lead Baru' }).click();
    await page.waitForURL('**/transactions/create');
    await page.locator('#name').fill('G11 Lead Persisted');
    await page.locator('#phone').fill('081234567899');
    await page.locator('#model').selectOption('G11 Test Model');
    const save = page.getByRole('button', {
        name: 'Simpan transaksi',
        exact: true,
    });
    await page.context().setOffline(true);
    try {
        await save.click();
        await page
            .getByRole('alert')
            .filter({ hasText: 'Koneksi terputus.' })
            .waitFor();
        assert(
            (await page.locator('#name').inputValue()) ===
                'G11 Lead Persisted',
            'Offline attempt lost the draft',
        );
    } finally {
        await page.context().setOffline(false);
    }
    const [saved] = await Promise.all([
        page.waitForResponse(
            (response) =>
                new URL(response.url()).pathname === '/transactions' &&
                response.request().method() === 'POST',
        ),
        save.click(),
    ]);
    assert(
        [302, 303].includes(saved.status()),
        `Lead write returned ${saved.status()}`,
    );
    await page.waitForURL(/\/transactions(\?|$)/);

    // Same number again: the form keeps the draft, explains, and offers the existing-customer path.
    await page.goto(`${origin}/transactions/create`);
    await page.locator('#name').fill('G11 Duplicate Name');
    await page.locator('#phone').fill('081234567899');
    await page.locator('#model').selectOption('G11 Test Model');
    await save.click();
    await page.getByText('Nomor telepon sudah terdaftar', { exact: false }).waitFor();
    assert(
        (await page.locator('#name').inputValue()) === 'G11 Duplicate Name',
        'Duplicate error lost the draft',
    );
    await page
        .getByRole('button', { name: 'Cari sebagai Pelanggan Lama' })
        .click();
    await page
        .getByRole('button', { name: /G11 Lead Persisted/ })
        .first()
        .click();
    await Promise.all([
        page.waitForURL(/\/transactions(\?|$)/),
        save.click(),
    ]);
    await page.goto(`${origin}/customers`);
    await page.reload();
    await page
        .getByText('G11 Lead Persisted', { exact: true })
        .first()
        .waitFor();
    const filter = page.getByRole('region', { name: 'Filter pelanggan' });
    const showFilter = filter.getByRole('button', { name: 'Tampilkan filter' });
    await showFilter.waitFor();
    const lead = page
        .getByRole('heading', { name: 'G11 Lead Persisted' })
        .first();
    assert(
        await lead.evaluate(
            (element) => element.getBoundingClientRect().bottom <= innerHeight,
        ),
        'The first customer is below the initial mobile viewport',
    );
    await showFilter.press('Enter');
    const search = filter.getByRole('textbox', { name: 'Pencarian pelanggan' });
    await search.fill('G11 Lead Persisted');
    await search.press('Enter');
    await page.waitForURL(
        (url) => url.searchParams.get('search') === 'G11 Lead Persisted',
    );
    await filter
        .getByRole('button', { name: 'Sembunyikan filter' })
        .press('Enter');
    assert(
        new URL(page.url()).searchParams.get('search') === 'G11 Lead Persisted',
        'Collapsing the mobile filter cleared its URL',
    );
    const viewports = [
        { width: 390, height: 844, forcedColors: 'none' },
        { width: 768, height: 360, forcedColors: 'active' },
        { width: 1440, height: 900, forcedColors: 'none' },
    ];
    for (const { width, height, forcedColors } of viewports) {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ forcedColors });
        assert(
            await page.evaluate(
                () => document.documentElement.scrollWidth === innerWidth,
            ),
            `Customer list overflows at ${width}x${height}`,
        );
        const detail = page
            .getByRole('button', { name: 'Detail', exact: true })
            .first();
        await detail.focus();
        await page.keyboard.press('Enter');
        const customerDetail = page.getByRole('dialog');
        await customerDetail.waitFor();
        await page.keyboard.press('Escape');
        await customerDetail.waitFor({ state: 'hidden' });
        assert(
            await detail.evaluate(
                (element) => element === document.activeElement,
            ),
            'Detail did not restore keyboard focus',
        );
    }

    return { persistedAfterReload: true, viewports, status: saved.status() };
}
