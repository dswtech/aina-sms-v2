// Run: playwright-cli open http://127.0.0.1:8000/login
// Then: playwright-cli run-code --filename tests/Browser/target-plan.js
// Synthetic Inertia documents and all target writes are intercepted.
async (page) => {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const user = { public_id: 'qa-spv', name: 'Supervisor QA', username: 'qa-spv', email: 'qa@example.test', email_verified_at: '2026-11-01T00:00:00Z', role: 'supervisor', is_active: true };
    const members = Array.from({ length: 7 }, (_, i) => ({ user_id: i + 1, name: `Sales ${i + 1}`, username: `sales${i + 1}`, active: true, target_units: null, allocated: false, remaining_workdays: 8, period_workdays: 24 }));
    const freshPlan = () => ({ team_id: 'qa-team', name: 'Tim QA', period: '2026-11', version: 0, legacy: false, target_units: null, markup_percent: 0, benchmark_units: null, members: structuredClone(members) });
    let plan = freshPlan();
    let errors = {};
    let conflict = false;
    let writes = [];
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    await page.addInitScript(() => { window.confirm = () => true; });
    const metrics = { target_units: 100, benchmark_units: 120, sales_target_units: 120, allocation_percent: 100, active_allocation_units: 120, realization_units: 24, achievement_percent: 24, benchmark_achievement_percent: 20, forecast_units: 80, gap_units: 76, forecast_gap_units: 20, benchmark_gap_units: 96, benchmark_forecast_gap_units: 40 };
    const fixture = () => ({ ...initial, component: 'targets/plans', url: '/targets/plans', props: { ...initial.props, auth: { user }, errors, sidebarOpen: true, notifications: [], notificationsUnreadCount: 0, targetPlans: [plan], targetableUsers: [], targetableTeams: [], dashboard: { period: '2026-11-01', targetUnits: 100, realizationUnits: 24, forecastUnits: 80, forecastApproved: false, teams: [{ id: 'qa-team', name: 'Tim QA', ...metrics }], performance: [] } } });
    await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== origin) return route.continue();
        if (request.method() !== 'GET') {
            if (url.pathname !== '/target-plans') throw new Error(`Unexpected write ${url.pathname}`);
            const data = request.postDataJSON();
            writes.push(data);
            errors = conflict ? { version: 'Target sudah berubah. Muat ulang halaman sebelum menyimpan.' } : {};
            if (!conflict) {
                plan = { ...plan, version: plan.version + 1, target_units: Number(data.target_units), markup_percent: Number(data.markup_percent), benchmark_units: 125, members: plan.members.map((m) => {
                    const row = data.allocations.find((r) => r.user_id === m.user_id);
                    return row ? { ...m, target_units: Number(row.target_units), allocated: true } : m;
                }) };
            }
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Inertia': 'true' }, body: JSON.stringify(fixture()) });
        }
        if (url.pathname === '/targets/plans') {
            const data = fixture();
            if (request.headers()['x-inertia']) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'X-Inertia': 'true' }, body: JSON.stringify(data) });
            return route.fulfill({ status: 200, contentType: 'text/html', body: template.replace(bootstrap, (_, a, _b, c) => a + JSON.stringify(data).replaceAll('<', '\\u003c') + c) });
        }
        return route.continue();
    });
    const assert = (value, message) => { if (!value) throw new Error(message); };
    const save = () => page.getByRole('button', { name: 'Simpan rencana target', exact: true });
    let checked = 0;
    for (const width of [390, 768, 1440]) {
        for (const theme of ['light', 'dark']) {
            plan = freshPlan(); errors = {};
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(`${origin}/targets/plans`);
            await page.getByRole('heading', { name: 'Rencana target bulanan', level: 2 }).waitFor();
            await page.getByRole('button', { name: 'Buka kontrol panel pengguna' }).click();
            await page.getByRole('menuitemradio', { name: theme === 'dark' ? 'Gelap' : 'Terang', exact: true }).click();
            await page.keyboard.press('Escape');
            await page.getByLabel('Target management (unit)').fill('100');
            await page.getByLabel('Markup SPV (%)').fill('20');
            assert(await page.getByLabel('Sales 1', { exact: true }).inputValue() === '17.1429', 'Initial equal division must retain decimals');
            await page.getByLabel('Sales 1', { exact: true }).fill('17');
            assert(await save().isDisabled(), 'Under allocation must disable save');
            assert((await page.getByTestId('allocation-summary').textContent()).includes('Kurang'), 'Shortage must be explicit');
            await page.getByLabel('Sales 1', { exact: true }).fill('18');
            assert(await save().isEnabled(), 'Over allocation must be accepted');
            await page.getByLabel('Markup SPV (%)').fill('25');
            assert(await page.getByLabel('Sales 1', { exact: true }).inputValue() === '18', 'Markup must preserve manual allocation');
            assert(await save().isDisabled(), 'A higher benchmark must revalidate allocation');
            await page.getByRole('button', { name: 'Bagi rata', exact: true }).click();
            assert(await page.getByLabel('Sales 1', { exact: true }).inputValue() === '17.8572', 'Explicit redistribution must use new benchmark');
            assert(await save().isEnabled(), 'Rounded equal shares must cover benchmark');
            await page.getByLabel('Sales 1', { exact: true }).fill('17,8572');
            await save().click();
            await page.getByRole('status').filter({ hasText: 'Rencana target tersimpan.' }).waitFor();
            assert(writes.at(-1).allocations[0].target_units === '17.8572', 'Wire decimal must normalize comma');
            const teamReport = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Target dan kinerja tim', exact: true }) });
            assert(await teamReport.locator('div').filter({ has: page.locator('dt', { hasText: /^Gap benchmark ke realisasi$/ }) }).last().locator('dd').textContent() === '96', 'Team report must render the benchmark realization gap');
            assert(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), `Page overflow ${width}/${theme}`);
            if (width === 390) {
                const small = await page.locator('input:not([type=hidden]), fieldset button').evaluateAll((elements) => elements.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.id || el.textContent));
                assert(small.length === 0, `Small touch targets ${small}`);
            }
            await page.screenshot({ path: `.playwright-cli/targets-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
            checked++;
        }
    }
    plan = { ...freshPlan(), target_units: 100, markup_percent: 20, benchmark_units: 120, version: 1, members: [
        { ...members[0], active: false, allocated: true, target_units: 60 },
        { ...members[1], allocated: true, target_units: 60 },
        { ...members[2], allocated: false, target_units: null },
    ] };
    await page.goto(`${origin}/targets/plans`);
    assert(await page.getByLabel('Sales 1', { exact: true }).getAttribute('readonly') !== null, 'Former member target must stay read only');
    assert((await page.getByTestId('allocation-summary').textContent()).includes('Risiko kapasitas'), 'Former members must show capacity risk');
    await page.getByRole('button', { name: /Pakai saran 20 unit/ }).click();
    assert(await page.getByLabel('Sales 2', { exact: true }).inputValue() === '60', 'Newcomer must not reduce an existing target');
    assert(await page.getByLabel('Sales 3', { exact: true }).inputValue() === '20', 'Prorata suggestion should be applied explicitly');
    conflict = true;
    await save().click();
    await page.getByRole('button', { name: 'Muat ulang target' }).waitFor();
    assert(browserErrors.length === 0, `Browser errors: ${browserErrors.join('; ')}`);
    await page.unrouteAll({ behavior: 'wait' });
    await page.goto(`${origin}/login`);
    return { checked, membershipAndConflict: true, interceptedWrites: writes.length, businessWrites: 0, browserErrors };
}
