// Run: playwright-cli open http://127.0.0.1:8000/login
// Then: playwright-cli run-code --filename tests/Browser/sales-calendar.js
// Synthetic Inertia documents; plan completion and cancel writes are intercepted.
async (page) => {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const users = {
        supervisor: { public_id: 'qa-spv', name: 'Supervisor QA', username: 'qa-spv', email: 'spv@example.test', email_verified_at: '2026-11-01T00:00:00Z', role: 'supervisor', is_active: true },
        sales: { public_id: 'qa-sales', name: 'Rina Kartika', username: 'qa-sales', email: 'sales@example.test', email_verified_at: '2026-11-01T00:00:00Z', role: 'sales', is_active: true },
    };
    const types = [['call', 'Telepon'], ['whatsapp', 'WhatsApp'], ['visit', 'Kunjungan'], ['meeting', 'Pertemuan / Showroom'], ['note', 'Catatan Tambahan']];
    const rows = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Sales Fiktif ${i + 1}`, team: i < 4 ? 'Tim A' : 'Tim B' }));
    let n = 0;
    const item = (userId, date, time, plan, overdue = false) => {
        const [type, label] = plan ? ['plan', 'Rencana'] : types[n % types.length];
        n++;
        return { id: `${plan ? 'plan' : 'done'}-${n}`, kind: plan ? 'plan' : 'done', type, type_label: label, user_id: userId, date, time, customer: `Pelanggan ${n}`, customer_id: `cust-${n}`, notes: `Catatan kegiatan nomor ${n} untuk uji tooltip kalender.`, overdue, status: plan ? 'pending' : 'completed', follow_up_id: plan ? n : null };
    };
    const monthItems = [];
    for (const row of rows) {
        for (const day of [3, 10, 14, 21]) {
            const date = `2026-11-${String(day).padStart(2, '0')}`;
            monthItems.push(item(row.id, date, '09:00', day >= 14), item(row.id, date, '13:30', false));
        }
    }
    // A busy day for row 2: six items with an overdue plan.
    for (const time of ['08:00', '09:00', '10:30', '11:00', '15:00', '16:00']) monthItems.push(item(2, '2026-11-10', time, time === '09:00', time === '09:00'));
    const dayItems = monthItems.filter((i) => i.date === '2026-11-14').concat([item(1, '2026-11-14', '06:30', false), item(1, '2026-11-14', '22:00', true)]);
    let role = 'supervisor';
    let requests = [];
    const writes = [];
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    const fixture = (url) => {
        const view = url.searchParams.get('view') === 'day' ? 'day' : 'month';
        const date = url.searchParams.get('date') ?? '2026-11-14';
        const own = (list) => (role === 'sales' ? list.filter((i) => i.user_id === 1) : list);
        return { ...initial, component: 'calendar/index', url: url.pathname + url.search, props: { ...initial.props, auth: { user: users[role] }, errors: {}, sidebarOpen: true, notifications: [], notificationsUnreadCount: 0,
            view, date, today: '2026-11-14', now: '11:20',
            teams: role === 'supervisor' ? [{ id: 'team-a', name: 'Tim A', count: 4 }, { id: 'team-b', name: 'Tim B', count: 4 }] : [],
            team: null, rows: role === 'supervisor' ? rows : null,
            items: own(view === 'day' ? dayItems.filter((i) => i.date === date) : monthItems) } };
    };
    await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin) return route.continue();
        if (request.method() !== 'GET') {
            if (!/^\/customers\/cust-\d+\/(activities|follow-ups\/\d+\/cancel)$/.test(url.pathname)) throw new Error(`Unexpected write ${url.pathname}`);
            writes.push({ path: url.pathname, data: request.postDataJSON() });
            const back = new URL(`${origin}/kalender?view=day&date=2026-11-14`);
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Inertia': 'true' }, body: JSON.stringify(fixture(back)) });
        }
        if (url.pathname === '/kalender') {
            requests.push(url.search);
            const data = fixture(url);
            if (request.headers()['x-inertia']) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Inertia': 'true' }, body: JSON.stringify(data) });
            return route.fulfill({ status: 200, contentType: 'text/html', body: template.replace(bootstrap, (_, a, _b, c) => a + JSON.stringify(data).replaceAll('<', '\\u003c') + c) });
        }
        return route.continue();
    });
    const assert = (value, message) => { if (!value) throw new Error(message); };
    const noOverflow = async (label) => assert(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), `Page overflow ${label}`);
    let checked = 0;
    for (const width of [390, 768, 1440]) {
        for (const theme of ['light', 'dark']) {
            const label = `${width}/${theme}`;
            await page.setViewportSize({ width, height: 1000 });
            role = 'supervisor';
            await page.goto(`${origin}/kalender`);
            await page.getByRole('heading', { name: 'November 2026', level: 2 }).waitFor();
            await page.getByRole('button', { name: 'Buka kontrol panel pengguna' }).click();
            await page.getByRole('menuitemradio', { name: theme === 'dark' ? 'Gelap' : 'Terang', exact: true }).click();
            await page.keyboard.press('Escape');
            await page.getByRole('button', { name: 'Tim B · 4' }).waitFor();
            await noOverflow(`supervisor month ${label}`);
            const busy = page.getByRole('button', { name: /^Sales Fiktif 2, Selasa, 10 November: 8 kegiatan, ada yang terlambat$/ });
            if (width < 768) {
                await busy.click();
                const sheet = page.getByRole('dialog');
                await sheet.getByText('Terlambat').first().waitFor();
                await sheet.getByRole('button', { name: 'Buka Harian' }).click();
            } else {
                await busy.hover();
                const tip = page.getByRole('tooltip');
                await tip.getByText('+4 lainnya').waitFor();
                assert((await tip.textContent()).includes('Terlambat'), `Overdue item must lead the tooltip ${label}`);
                await busy.click();
            }
            await page.getByRole('heading', { name: 'Selasa, 10 November 2026', level: 2 }).waitFor();
            assert(requests.at(-1).includes('view=day') && requests.at(-1).includes('date=2026-11-10'), `Busy cell must open the day ${label}`);
            await noOverflow(`supervisor day ${label}`);
            await page.screenshot({ path: `.playwright-cli/calendar-spv-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });

            role = 'sales';
            await page.goto(`${origin}/kalender`);
            await page.getByRole('heading', { name: 'November 2026', level: 2 }).waitFor();
            assert(!(await page.getByRole('group', { name: 'Filter tim' }).count()), `Sales must not see team filter ${label}`);
            await noOverflow(`sales month ${label}`);
            if (width >= 768) {
                const line = page.getByRole('button', { name: /^09:00, Rencana, Pelanggan/ }).first();
                await line.hover();
                await page.getByRole('tooltip').getByText('Rencana · 09:00').waitFor();
            } else {
                await page.getByRole('region', { name: 'Agenda hari ini' }).waitFor();
            }
            await page.getByRole('button', { name: /^Sabtu, 14 November 2026 \(hari ini\)/ }).first().click();
            await page.getByRole('heading', { name: 'Sabtu, 14 November 2026', level: 2 }).waitFor();
            await page.getByRole('note').filter({ hasText: 'Sekarang · 11:20' }).waitFor();
            await page.getByRole('button', { name: 'Catat hasil / batalkan' }).first().click();
            const dialog = page.getByRole('dialog');
            await dialog.getByLabel('Hasil komunikasi').fill('Pelanggan setuju test drive');
            await dialog.getByRole('button', { name: 'Simpan & selesaikan' }).click();
            await dialog.waitFor({ state: 'hidden' });
            assert(writes.at(-1).path.endsWith('/activities') && writes.at(-1).data.follow_up_id && writes.at(-1).data.notes === 'Pelanggan setuju test drive', `Completion must post the activity with its follow-up ${label}`);
            await page.getByRole('button', { name: 'Catat hasil / batalkan' }).first().click();
            await dialog.getByRole('button', { name: 'Batalkan follow-up ini' }).click();
            await dialog.getByLabel('Alasan pembatalan').fill('Pelanggan menunda');
            await dialog.getByRole('button', { name: 'Batalkan follow-up', exact: true }).click();
            await dialog.waitFor({ state: 'hidden' });
            assert(writes.at(-1).path.endsWith('/cancel') && writes.at(-1).data.reason === 'Pelanggan menunda', `Cancel must send the reason ${label}`);
            assert(await page.getByRole('article').count() === 4, `Sales day must list own items only ${label}`);
            await noOverflow(`sales day ${label}`);
            if (width === 390) {
                const small = await page.locator('main button:not([data-sidebar])').evaluateAll((elements) => elements.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.getAttribute('aria-label') || el.textContent));
                assert(small.length === 0, `Small touch targets ${small}`);
            }
            await page.screenshot({ path: `.playwright-cli/calendar-sales-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
            checked++;
        }
    }
    assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join('; ')}`);
    await page.unrouteAll({ behavior: 'wait' });
    await page.goto(`${origin}/login`);
    return { checked, requests: requests.length, interceptedWrites: writes.length, businessWrites: 0, browserErrors };
}
