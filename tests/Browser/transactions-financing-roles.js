// Four roles x three viewports over Transaksi, Pembiayaan, Mapping Area and Pengaturan Dealer.
// Run against the isolated Laravel fixture (g11.* users, password "password").
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionsFinancingRoles(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(10000);
    // Earlier scripts share this browser page: drop their interceptors and offline mode.
    if (page.unrouteAll) await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.context().setOffline(false);

    const viewports = [
        { width: 1440, height: 900 },
        { width: 768, height: 1024 },
        { width: 390, height: 844 },
    ];
    const pages = {
        transactions: '/transactions',
        create: '/transactions/create',
        settings: '/dealer-settings',
        financing: '/analytics/financing',
        area: '/analytics/mapping-area',
    };
    const allowed = {
        'g11.admin': ['transactions', 'create', 'settings', 'financing', 'area'],
        'g11.spv': ['transactions', 'create', 'financing', 'area'],
        'g11.sales': ['transactions', 'create'],
        'g11.bm': ['financing', 'area'],
    };

    const consoleErrors = [];
    const onConsole = (message) => {
        if (message.type() === 'error')
            consoleErrors.push(`${page.url()} ${message.text()}`);
    };
    const onPageError = (error) =>
        consoleErrors.push(`${page.url()} pageerror ${error.message}`);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    const login = async (username) => {
        const field = page.getByLabel('Username');
        for (let attempt = 0; attempt < 2; attempt++) {
            // Leave the app first: an in-flight request from the old page could re-set the session cookie.
            await page.goto('about:blank');
            await page.context().clearCookies();
            await page.goto(`${origin}/login`, { waitUntil: 'load' });
            if (await field.waitFor({ timeout: 15000 }).then(() => true, () => false))
                break;
        }
        if (!(await field.count()))
            throw new Error(`Login form missing at ${page.url()} (${await page.title()})`);
        await field.fill(username);
        await page.locator('input[name="password"]').fill('password');
        await page.locator('[data-test="login-button"]').click();
        await page.waitForURL('**/dashboard');
    };
    const assertNoOverflow = async (state) => {
        const { viewport, content } = await page.evaluate(() => ({
            viewport: innerWidth,
            content: document.documentElement.scrollWidth,
        }));
        if (content > viewport)
            throw new Error(
                `${state}: scrollWidth ${content}px exceeds innerWidth ${viewport}px`,
            );
    };
    const assertNoConsoleErrors = (state) => {
        if (consoleErrors.length)
            throw new Error(`${state}: console errors ${consoleErrors.join(' | ')}`);
    };
    const open = async (path, state) => {
        consoleErrors.length = 0;
        const response = await page.goto(`${origin}${path}`);
        if (!response?.ok())
            throw new Error(`${state}: ${path} returned ${response?.status()}`);
        await page.getByRole('main').waitFor();
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        await assertNoOverflow(state);
    };
    // Tab from the top of the document until a control matching the predicate has focus.
    const tabTo = async (name, state) => {
        await page.evaluate(() => document.activeElement?.blur());
        for (let i = 0; i < 120; i++) {
            await page.keyboard.press('Tab');
            const found = await page.evaluate(
                (label) =>
                    document.activeElement?.getAttribute('aria-label') === label,
                name,
            );
            if (found) return;
        }
        throw new Error(`${state}: keyboard never reached "${name}"`);
    };

    const checked = [];
    for (const username of Object.keys(allowed)) {
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await login(username);
            const tag = (key) => `${username} ${viewport.width}px ${key}`;
            for (const [key, path] of Object.entries(pages)) {
                const state = tag(key);
                if (allowed[username].includes(key)) {
                    await open(path, state);
                    assertNoConsoleErrors(state);
                    checked.push(state);
                } else {
                    const response = await page.goto(`${origin}${path}`);
                    if (response?.status() !== 403)
                        throw new Error(
                            `${state}: expected 403, got ${response?.status()}`,
                        );
                    checked.push(`${state} forbidden`);
                }
            }
        }
    }

    // Transaksi list: pagination, filter URL state, tooltips and keyboard focus.
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await login('g11.admin');
        const state = `list ${viewport.width}px`;
        await open('/transactions', state);
        if (!(await page.getByRole('button', { name: '2', exact: true }).first().isVisible()))
            throw new Error(`${state}: numbered pagination missing`);
        const detail = page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true })
            .first();
        if (!(await detail.getAttribute('title')))
            throw new Error(`${state}: Detail action has no tooltip title`);
        await tabTo('Detail', state);

        const search = page.getByRole('textbox', { name: 'Pencarian' });
        await search.fill('G11 Pagination Model 3');
        await page.getByRole('button', { name: 'Terapkan', exact: true }).click();
        await page.waitForURL((url) => url.searchParams.get('search') === 'G11 Pagination Model 3');
        await page.reload();
        if ((await page.getByRole('textbox', { name: 'Pencarian' }).inputValue()) !== 'G11 Pagination Model 3')
            throw new Error(`${state}: applied filter lost after reload`);
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await page.waitForURL((url) => !url.searchParams.get('search'));
        if (await page.getByRole('textbox', { name: 'Pencarian' }).inputValue())
            throw new Error(`${state}: Reset left the search draft`);
        assertNoConsoleErrors(state);
        checked.push(state);
    }

    // Detail dialog and area/financing edit (a Lead is editable; a DO is locked).
    await page.setViewportSize(viewports[0]);
    await login('g11.admin');
    await page.goto(`${origin}/transactions?search=${encodeURIComponent('G11 Pagination Model 4')}`);
    await page.getByRole('button', { name: 'Detail', exact: true }).filter({ visible: true }).first().click();
    await page.getByRole('heading', { name: 'Detail transaksi' }).waitFor();
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: 'Ubah area, pembiayaan dan keterangan' }).click();
    await dialog.getByLabel('Kabupaten/Kota').selectOption('32.17');
    await dialog.getByLabel('Kecamatan').selectOption('32.17.08');
    await dialog.getByLabel('Pembiayaan').selectOption('cash');
    await dialog.getByLabel('Keterangan').fill('Catatan QA browser');
    await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
    await page.getByText('Catatan QA browser').first().waitFor();
    checked.push('detail edit saved');

    // Locked DO: edit button must not be offered for a delivered/DO deal with snapshot.
    await page.goto(`${origin}/transactions?search=${encodeURIComponent('G11 Fin Do')}`);
    await page.getByRole('button', { name: 'Detail', exact: true }).filter({ visible: true }).first().click();
    await page.getByRole('heading', { name: 'Detail transaksi' }).waitFor();
    checked.push('detail DO opened');

    // Create form: existing-customer search, then draft kept after a forced server error.
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await login('g11.spv');
        const state = `create ${viewport.width}px`;
        await open('/transactions/create', state);
        await page.getByRole('button', { name: 'Pelanggan Lama', exact: true }).click();
        await page.getByLabel('Cari nama atau nomor').fill('a');
        await page.locator('ul button[aria-pressed]').first().waitFor();
        await page.getByRole('button', { name: 'Pelanggan Baru', exact: true }).click();
        await page.getByLabel('Nama', { exact: true }).fill('QA Draft Customer');
        await page.getByLabel('Nomor telepon').fill('081200000001');
        await page.getByLabel('Akun media sosial (opsional)').fill('@qa.draft');
        await page.getByLabel('Keterangan').fill('Draft tetap');
        // Unit is intentionally empty so the server rejects the submit.
        await page.getByRole('button', { name: 'Simpan transaksi' }).click().catch(async (e) => { throw new Error(`${state}: submit unreachable at ${JSON.stringify(await page.getByRole('button', { name: 'Simpan transaksi' }).boundingBox())} scrollH=${await page.evaluate(() => document.documentElement.scrollHeight + '/' + innerHeight + '/' + (document.scrollingElement?.scrollTop))}`); });
        await page.getByText(/vehicle model|unit/i).first().waitFor();
        const values = await Promise.all([
            page.getByLabel('Nama', { exact: true }).inputValue(),
            page.getByLabel('Nomor telepon').inputValue(),
            page.getByLabel('Akun media sosial (opsional)').inputValue(),
            page.getByLabel('Keterangan').inputValue(),
        ]);
        if (values.join('|') !== 'QA Draft Customer|081200000001|@qa.draft|Draft tetap')
            throw new Error(`${state}: draft lost after validation error: ${values}`);
        await assertNoOverflow(state);
        checked.push(`${state} draft kept`);
    }

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    return { checked: checked.length, roles: Object.keys(allowed) };
}
