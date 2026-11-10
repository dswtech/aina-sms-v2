// Tahap 4 acceptance flow over the real UI and the isolated Laravel fixture (g11.* users, password "password").
// No mocks: Pelanggan Baru + transaksi -> Prospect -> SPK -> DO -> reports -> master changes -> cancel -> edit -> redo -> Delivery,
// then progress-vs-activity and the repeat-customer path. Assertions use before/after deltas because the fixture has seeded data.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function acceptanceFlow(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(10000);
    // Earlier scripts share this browser page: drop their interceptors and offline mode.
    if (page.unrouteAll) await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.context().setOffline(false);
    await page.setViewportSize({ width: 1440, height: 900 });

    const pageErrors = [];
    const onPageError = (error) => pageErrors.push(`${page.url()} ${error.message}`);
    page.on('pageerror', onPageError);

    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const same = (a, b, message) =>
        assert(
            JSON.stringify(a) === JSON.stringify(b),
            `${message}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`,
        );
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
        await field.fill(username);
        await page.locator('input[name="password"]').fill('password');
        await page.locator('[data-test="login-button"]').click();
        await page.waitForURL('**/dashboard');
    };
    // Inertia bootstrap props of a freshly loaded page.
    const props = () =>
        page.evaluate(() => {
            const script = document.querySelector('script[data-page]');
            const raw = script ? script.textContent : document.getElementById('app')?.dataset.page;
            return JSON.parse(raw).props;
        });
    const open = async (path) => {
        const response = await page.goto(`${origin}${path}`);
        assert(response?.ok(), `${path} returned ${response?.status()}`);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        return props();
    };
    const json = (path) =>
        page.evaluate(
            async (p) => (await fetch(p, { headers: { Accept: 'application/json' } })).json(),
            path,
        );

    const tag = String(Date.now()).slice(-8);
    const custName = `ACC Flow Cust ${tag}`;
    const phone = `0813${tag}`;
    const social = `@acc.flow.${tag}`;
    const model = 'ACC Flow Unit';
    const repeatModel = 'ACC Flow Repeat';
    const noteText = `Catatan progress ${tag}`;

    // ---- report helpers (always read as admin so deltas share one scope) ----
    const mapping = async () => {
        const { report } = await open('/analytics/mapping-area');
        const summary = page.getByRole('region', { name: 'Ringkasan Mapping Area' });
        assert(
            new RegExp(`Total DO\\s+${report.total}\\b`).test(await summary.innerText()),
            `Mapping Area summary does not show total ${report.total}`,
        );
        assert(report.foa + report.other === report.total, 'Mapping Area: FOA + Area lain != total');
        assert(
            report.rows.reduce((sum, row) => sum + row.count, 0) === report.total,
            'Mapping Area: rows do not reconcile with total',
        );
        assert(report.rows.at(-1).id === 'other', 'Mapping Area: Area lain is not last');
        return report;
    };
    const financing = async (mode) => {
        const { report } = await open(`/analytics/financing?mode=${mode}`);
        assert(
            report.cash + report.credit + report.unknown === report.total,
            `Financing ${mode}: cash+credit+unknown != total`,
        );
        assert(
            report.leasing.reduce((sum, row) => sum + row.count, 0) === report.credit,
            `Financing ${mode}: leasing bars do not reconcile with credit`,
        );
        assert(
            report.leasing.at(-1).id === 'unselected' && report.leasing.at(-2).id === 'other',
            `Financing ${mode}: Kredit Lain / Leasing belum dipilih are not the last two`,
        );
        const summary = page.getByRole('region', { name: 'Ringkasan pembiayaan' });
        assert(
            new RegExp(`Total transaksi\\s+${report.total}\\b`).test(await summary.innerText()),
            `Financing ${mode} summary does not show total ${report.total}`,
        );
        return report;
    };
    const countOf = (rows, id) => rows.find((row) => row.id === id)?.count ?? 0;
    const areaSig = (r) => ({
        total: r.total, foa: r.foa, other: r.other, unverified: r.unverified,
        rows: Object.fromEntries(r.rows.filter((row) => row.count).map((row) => [row.id, row.count])),
    });
    const finSig = (r) => ({
        total: r.total, cash: r.cash, credit: r.credit, unknown: r.unknown,
        leasing: Object.fromEntries(r.leasing.filter((row) => row.count).map((row) => [row.id, row.count])),
    });

    // ---- list / dialogs ----
    const findRow = async (search) => {
        const p = await open(`/transactions?search=${encodeURIComponent(search)}&date_from=&date_to=`);
        assert(p.transactions.data.length === 1, `Expected one row for "${search}", got ${p.transactions.data.length}`);
        return p.transactions.data[0];
    };
    const rowButton = (name) =>
        page.getByRole('button', { name, exact: true }).filter({ visible: true });
    const changeStage = async (stage, extra = async () => {}) => {
        await findRow(model);
        await rowButton('Ubah tahap').click();
        await page.getByRole('heading', { name: 'Ubah tahap transaksi' }).waitFor();
        await page.locator('#to_stage').selectOption(stage);
        await extra();
        await page.getByRole('button', { name: 'Simpan', exact: true }).click();
        await page.getByRole('heading', { name: 'Ubah tahap transaksi' }).waitFor({ state: 'hidden' });
        const row = await findRow(model);
        assert(row.current_stage === stage, `Stage is ${row.current_stage}, expected ${stage}`);
        return row;
    };
    const recordDo = () =>
        changeStage('do', async () => {
            await page.getByRole('checkbox', { name: 'PO', exact: true }).check();
            await page.getByRole('checkbox', { name: 'DP', exact: true }).check();
            await page.getByRole('checkbox', { name: 'Unit', exact: true }).check();
        });
    const fulfil = async (button, reason) => {
        await findRow(model);
        await rowButton(button).click();
        const dialog = page.getByRole('dialog', { name: button });
        if (reason) await dialog.getByRole('textbox', { name: 'Alasan pembatalan' }).fill(reason);
        await dialog.getByRole('button', { name: button, exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
    };
    const openDetail = async () => {
        await findRow(model);
        await rowButton('Detail').click();
        await page.getByRole('heading', { name: 'Detail transaksi' }).waitFor();
        return page.getByRole('dialog');
    };

    // ---- master helpers (admin) ----
    const settings = () => open('/dealer-settings');
    const setFoa = async (changes) => {
        const p = await settings();
        const regionName = (code) => p.regions.find((r) => r.code === p.districts.find((d) => d.code === code).region_code).name;
        const districtName = (code) => p.districts.find((d) => d.code === code).name;
        for (const [code, on] of Object.entries(changes))
            await page
                .getByRole('checkbox', { name: `${districtName(code)}, ${regionName(code)}`, exact: true })
                .setChecked(on);
        const save = page.getByRole('button', { name: 'Simpan FOA', exact: true });
        if (await save.isEnabled())
            await Promise.all([
                page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes('/dealer-settings/area-foa')),
                save.click(),
            ]);
        const after = await settings();
        for (const [code, on] of Object.entries(changes))
            assert(after.foa.includes(code) === on, `FOA ${code} expected ${on} after save`);
    };
    const setMonitored = async (leasing, on) => {
        await settings();
        const row = page.locator('li').filter({ has: page.locator(`#leasing-${leasing.id}`) });
        await row.getByLabel('Pantauan').setChecked(on);
        await Promise.all([
            page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/dealer-settings/leasing/${leasing.id}`)),
            row.getByRole('button', { name: `Simpan ${leasing.name}`, exact: true }).click(),
        ]);
        const after = await settings();
        assert(
            after.leasings.find((l) => l.id === leasing.id).is_monitored === on,
            `Leasing ${leasing.name} monitored expected ${on} after save`,
        );
    };

    const checks = [];
    // Master state is restored in `finally`, whatever happens.
    const restore = {};
    try {
        // ---- 0. admin: choose FOA districts D/E in Kab. Bandung Barat (32.17) and a monitored leasing ----
        await login('g11.admin');
        const master = await settings();
        const bb = master.districts.filter((d) => d.region_code === '32.17').map((d) => d.code);
        assert(bb.length >= 2, 'Expected Kabupaten Bandung Barat districts in the master');
        const foaBb = master.foa.filter((code) => bb.includes(code));
        const D = foaBb[0] ?? bb[0];
        const E = foaBb.find((code) => code !== D) ?? bb.find((code) => code !== D);
        restore.foa = { [D]: master.foa.includes(D), [E]: master.foa.includes(E) };
        await setFoa({ [D]: true, [E]: true });
        const leasing = master.leasings.find((l) => l.is_active && l.is_monitored)
            ?? master.leasings.find((l) => l.is_active);
        assert(leasing, 'No active leasing in the master');
        restore.leasing = { leasing, monitored: leasing.is_monitored };
        if (!leasing.is_monitored) await setMonitored(leasing, true);
        const districtLabel = (code) => master.districts.find((d) => d.code === code).name;

        const M0 = await mapping();
        const FDo0 = await financing('do');
        const FP0 = await financing('prospect');

        // ---- 1. sales: Pelanggan Baru + transaksi on the shared form ----
        await login('g11.sales');
        await open('/transactions/create');
        await page.locator('#name').fill(custName);
        await page.locator('#phone').fill(phone);
        await page.locator('#gender').selectOption('L');
        await page.locator('#social').fill(social);
        await page.locator('#model').selectOption(model);
        await page.locator('#source').selectOption('digital_ad');
        await page.locator('#channel').selectOption('instagram');
        await page.locator('#region').selectOption('32.17');
        await page.locator('#district').selectOption(D);
        await page.locator('#financing').selectOption('credit');
        await page.locator('#leasing').selectOption(String(leasing.id));
        await page.locator('#tenor').selectOption('36');
        await page.locator('#insurance').selectOption('all_risk');
        await page.locator('#notes').fill('Catatan awal acceptance');
        await page.getByRole('button', { name: 'Simpan transaksi' }).click();
        await page.waitForURL(/\/transactions(\?|$)/);

        let row = await findRow(model);
        same(
            [row.current_stage, row.area.district_code, row.financing.type, row.financing.leasing_id, row.source, row.source_channel],
            ['lead', D, 'credit', leasing.id, 'digital_ad', 'instagram'],
            'Created transaction fields',
        );
        assert(row.progress_at && row.created_at, 'Row has no progress_at/created_at');
        checks.push('created');

        // ---- 2. progress vs activity: comment / follow-up / activity / note edit keep Tanggal Progress ----
        const publicId = row.public_id;
        const P0 = (await json(`/transactions/${publicId}`)).progress_at;
        await page.waitForTimeout(1500);

        await open(`/customers?search=${encodeURIComponent(custName)}`);
        // Quick actions live on the card layout (mobile); the desktop table only has Detail/Ubah Tahap.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('button', { name: 'Catat Aktivitas', exact: true }).filter({ visible: true }).first().click();
        await page.locator('#act-notes').fill('Aktivitas acceptance');
        await page.getByRole('button', { name: 'Simpan Aktivitas' }).click();
        await page.getByRole('heading', { name: 'Catat Aktivitas Lapangan' }).waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Follow-Up', exact: true }).filter({ visible: true }).first().click();
        await page.locator('#fu-date').fill('2030-01-01T10:00');
        await page.locator('#fu-notes').fill('Follow-up acceptance');
        await page.getByRole('button', { name: 'Jadwalkan Tindak Lanjut' }).click();
        await page.getByRole('heading', { name: 'Jadwalkan Tindak Lanjut Berikutnya' }).waitFor({ state: 'hidden' });
        await page.setViewportSize({ width: 1440, height: 900 });

        await open(`/transactions/${publicId}/coaching`);
        await page.locator('#coaching-body').fill('Komentar acceptance');
        await page.getByRole('button', { name: 'Kirim Komentar' }).click();
        await page.getByText('Komentar acceptance').first().waitFor();

        let detail = await json(`/transactions/${publicId}`);
        assert(detail.progress_at === P0, `Comment/follow-up/activity changed progress_at: ${P0} -> ${detail.progress_at}`);
        checks.push('progress unchanged by activity');

        // Metadata/note edit in Detail does not move progress either.
        let dialog = await openDetail();
        await dialog.getByLabel('Keterangan').fill(noteText);
        await dialog.getByLabel('Keterangan').blur();
        await dialog.getByRole('status').filter({ hasText: 'Tersimpan' }).waitFor();
        detail = await json(`/transactions/${publicId}`);
        assert(detail.progress_at === P0, `Note edit changed progress_at: ${P0} -> ${detail.progress_at}`);
        assert(detail.notes === noteText, 'Note edit was not saved');

        // ---- 3. sales: Prospect (stage change moves progress), then SPK ----
        await page.waitForTimeout(1500);
        row = await changeStage('prospect', () => page.locator('#stage-address').fill('Jl. Acceptance No. 1'));
        assert(Date.parse(row.progress_at) > Date.parse(P0), `Stage change did not move progress_at (${P0} -> ${row.progress_at})`);
        checks.push('progress moved by stage');
        row = await changeStage('spk', async () => {
            await page.locator('#stage-occupation').selectOption('employee');
            await page.locator('#stage-customer-region').selectOption('32.17');
            await page.locator('#stage-customer-district').selectOption(D);
            await page.getByLabel('Konfirmasi booking fee').check();
        });

        // ---- 4. supervisor: DO with PO/DP/Unit ----
        await login('g11.spv');
        await recordDo();

        // ---- 5. admin: reports include it (mode do) and reconcile ----
        await login('g11.admin');
        const FP1 = await financing('prospect');
        same(
            [FP1.total - FP0.total, FP1.credit - FP0.credit, countOf(FP1.leasing, String(leasing.id)) - countOf(FP0.leasing, String(leasing.id))],
            [1, 1, 1],
            'Prospect report delta (total, credit, monitored leasing bar)',
        );
        const M1 = await mapping();
        const FDo1 = await financing('do');
        same(
            [M1.total - M0.total, M1.foa - M0.foa, M1.other - M0.other, countOf(M1.rows, D) - countOf(M0.rows, D)],
            [1, 1, 0, 1],
            `Mapping Area delta after DO (${districtLabel(D)})`,
        );
        same(
            [FDo1.total - FDo0.total, FDo1.credit - FDo0.credit, FDo1.cash - FDo0.cash, countOf(FDo1.leasing, String(leasing.id)) - countOf(FDo0.leasing, String(leasing.id))],
            [1, 1, 0, 1],
            'Financing DO delta after DO',
        );
        checks.push('reports include DO');

        // ---- 6. admin changes FOA and leasing master: recorded DO must not change ----
        await setFoa({ [D]: false });
        await setMonitored(leasing, false);
        same(areaSig(await mapping()), areaSig(M1), 'Mapping Area changed after FOA edit');
        same(finSig(await financing('do')), finSig(FDo1), 'Financing DO changed after leasing master edit');
        const FP2 = await financing('prospect');
        assert(FP2.total === FP1.total, 'Prospect total changed after master edit');
        checks.push('snapshot immune to master edits');

        // ---- 7. admin cancels DO: reports drop by one ----
        await fulfil('Batalkan DO', 'Koreksi acceptance flow.');
        row = await findRow(model);
        assert(row.current_stage === 'spk', `Cancel DO left stage ${row.current_stage}`);
        same(areaSig(await mapping()), areaSig(M0), 'Mapping Area after cancel');
        same(finSig(await financing('do')), finSig(FDo0), 'Financing DO after cancel');

        // ---- 8. edit area and financing in Detail (editable again), then redo DO ----
        dialog = await openDetail();
        await dialog.getByRole('button', { name: /^Area:/ }).click();
        await dialog.getByRole('option', { name: 'Kabupaten Bandung Barat', exact: true }).click();
        await dialog.getByRole('option', { name: districtLabel(E), exact: true }).click();
        await dialog.getByRole('status').filter({ hasText: 'Tersimpan' }).waitFor();
        await dialog.getByRole('button', { name: /^Pembiayaan:/ }).click();
        await dialog.getByRole('option', { name: 'Cash', exact: true }).click();
        await page.waitForFunction(
            async (id) => {
                const r = await (await fetch(`/transactions/${id}`, { headers: { Accept: 'application/json' } })).json();
                return r.financing.type === 'cash';
            },
            publicId,
        );
        row = await findRow(model);
        same([row.area.district_code, row.financing.type, row.financing.leasing_id], [E, 'cash', null], 'Edited metadata after cancel');

        await login('g11.spv');
        await recordDo();
        await login('g11.admin');
        const M2 = await mapping();
        const FDo2 = await financing('do');
        same(
            [M2.total - M0.total, countOf(M2.rows, E) - countOf(M0.rows, E), countOf(M2.rows, D) - countOf(M0.rows, D)],
            [1, 1, 0],
            'Mapping Area carries the NEW snapshot after redo',
        );
        same(
            [FDo2.total - FDo0.total, FDo2.cash - FDo0.cash, FDo2.credit - FDo0.credit, countOf(FDo2.leasing, String(leasing.id)) - countOf(FDo0.leasing, String(leasing.id))],
            [1, 1, 0, 0],
            'Financing DO carries the NEW snapshot after redo',
        );
        checks.push('redo uses new snapshot');

        // ---- 9. Delivery does not change totals ----
        await login('g11.spv');
        await fulfil('Konfirmasi Delivery');
        row = await findRow(model);
        assert(row.current_stage === 'delivery', `Delivery left stage ${row.current_stage}`);
        await login('g11.admin');
        same(areaSig(await mapping()), areaSig(M2), 'Mapping Area changed after Delivery');
        same(finSig(await financing('do')), finSig(FDo2), 'Financing DO changed after Delivery');
        checks.push('delivery keeps totals');

        // ---- 10. repeat customer: preselected, identity untouched ----
        await login('g11.sales');
        await open('/transactions');
        const before = (await json(`/transactions/customer-search?q=${encodeURIComponent(phone)}`)).data;
        same(before.length, 1, 'Customer search by phone');
        const customer = before[0];
        await open(`/transactions/create?customer=${customer.public_id}`);
        assert(
            (await page.getByRole('button', { name: 'Pelanggan Lama', exact: true }).getAttribute('aria-pressed')) === 'true',
            '?customer= did not select Pelanggan Lama',
        );
        assert(await page.getByText(custName).first().isVisible(), '?customer= card does not show the customer');
        await page.locator('#model').selectOption(repeatModel);
        await page.getByRole('button', { name: 'Simpan transaksi' }).click();
        await page.waitForURL(/\/transactions(\?|$)/);
        const after = (await json(`/transactions/customer-search?q=${encodeURIComponent(phone)}`)).data;
        same(after, before, 'Customer identity/assignment changed by the repeat transaction');
        const repeat = await open(`/transactions?search=${encodeURIComponent(custName)}&date_from=&date_to=`);
        same(repeat.transactions.data.map((t) => t.vehicle_model).sort(), [model, repeatModel].sort(), 'Customer transactions after repeat');
        checks.push('repeat customer');
    } finally {
        // Put master data back so later scripts see the fixture defaults.
        try {
            await login('g11.admin');
            if (restore.foa) await setFoa(restore.foa);
            if (restore.leasing) await setMonitored(restore.leasing.leasing, restore.leasing.monitored);
        } catch (error) {
            checks.push(`restore failed: ${error.message}`);
        }
        page.off('pageerror', onPageError);
    }
    assert(pageErrors.length === 0, `Uncaught page errors: ${pageErrors.join(' | ')}`);
    return { checks };
}
