// Run with playwright-cli run-code --filename. Documents and writes are intercepted.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function leadContactFilters(page) {
    page.setDefaultTimeout(5000);
    // Steps the shadcn calendar popover to the month holding iso, then picks that day.
    const pickDay = async (iso) => {
        for (let step = 0; step < 48; step++) {
            const day = page.locator(`[data-slot="popover-content"] button[data-day="${iso}"]`);
            if (await day.count()) {
                await day.first().click();
                return;
            }
            const shown = await page
                .locator('[data-slot="popover-content"] button[data-day]')
                .first()
                .getAttribute('data-day');
            await page
                .locator(`[data-slot="popover-content"] .rdp-button_${iso < shown ? 'previous' : 'next'}`)
                .click();
        }
        throw new Error(`Calendar never showed ${iso}`);
    };
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    let fixture;
    let customersFixture;
    let customer;
    let failure = null;
    const writes = [];
    const queries = [];
    await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() !== 'GET') {
            const newLead =
                request.method() === 'POST' && url.pathname === '/customers';
            if (
                !newLead &&
                (request.method() !== 'PATCH' ||
                    !url.pathname.endsWith('/contact-preferences'))
            )
                throw new Error('Unexpected mutation');
            const data = request.postDataJSON();
            writes.push(data);
            if (failure === 'network') return route.abort('failed');
            if (failure === 'http')
                return route.fulfill({
                    status: 503,
                    contentType: 'text/plain',
                    body: 'QA unavailable',
                });
            if (!newLead) {
                customer.opt_out = data.opt_out;
                customer.contact_channel_preference =
                    data.contact_channel_preference;
                fixture.props.customers.data = [{ ...customer }];
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: { 'X-Inertia': 'true' },
                body: JSON.stringify(fixture),
            });
        }
        if (
            url.pathname === '/transactions/qa-deal' &&
            (request.headers().accept ?? '').includes('application/json')
        ) {
            const page1 = (data) => ({ data, current_page: 1, last_page: 1, total: data.length });
            const area = { region_code: null, region_name: null, district_code: null, district_name: null, other_city: null };
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    public_id: 'qa-deal', vehicle_model: 'Model QA', vehicle_color: null, vehicle_ownership: null,
                    source: 'walk_in', source_channel: null, notes: null,
                    current_stage: 'lead', stage_label: 'Lead', estimated_value: null, expected_closing_month: null,
                    customer: {
                        public_id: customer.public_id, name: customer.name, phone: customer.phone,
                        email: null, social_media_account: null, address: null, gender: null, birth_date: null, occupation: null,
                        contact_channel_preference: customer.contact_channel_preference, opt_out: customer.opt_out,
                        last_contact_at: null, assigned_sales: { id: 1, name: 'Sales QA' },
                        next_follow_up: null, follow_up_history: [], area,
                    },
                    sales: { name: 'Sales QA', username: 'qa-sales' }, supervisors: [], area,
                    financing: { type: null, leasing_id: null, other_name: null },
                    deal_id: 1, progress_at: null, customer_profile: null,
                    can_edit_metadata: false, can_edit_customer: true, can_assign_customer: false,
                    can_update: false, can_record_do: false, can_cancel_do: false,
                    do_event_id: null, stage_event_id: null, can_comment: false, days_in_stage: 1,
                    stages: page1([]), comments: page1([]),
                }),
            });
        }
        if (url.pathname.endsWith('/history')) {
            if (!customer || !url.pathname.includes(customer.public_id))
                throw new Error('Missing synthetic customer history');
            const emptyPage = {
                data: [],
                current_page: 1,
                last_page: 1,
                total: 0,
            };
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    transactions: [],
                    selected_transaction: null,
                    activities: emptyPage,
                    timeline: emptyPage,
                }),
            });
        }
        if (request.headers()['x-inertia']) {
            queries.push(Object.fromEntries(url.searchParams));
            fixture.url = url.pathname + url.search;
            fixture.props.filters = {
                ...fixture.props.filters,
                ...Object.fromEntries(url.searchParams),
            };
            return route.fulfill({
                contentType: 'application/json',
                headers: { 'X-Inertia': 'true' },
                body: JSON.stringify(fixture),
            });
        }
        if (request.isNavigationRequest()) {
            const json = JSON.stringify(fixture).replaceAll('<', '\\u003c');
            return route.fulfill({
                contentType: 'text/html',
                body: template.replace(
                    bootstrap,
                    (_, a, _b, c) => a + json + c,
                ),
            });
        }
        return route.fulfill({ response: await route.fetch() });
    });
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const base = () => ({
        ...initial.props,
        errors: {},
        notifications: [],
        notificationsUnreadCount: 0,
        sidebarOpen: true,
        auth: {
            user: {
                public_id: 'qa-sales',
                name: 'Sales QA',
                username: 'qa-sales',
                email: 'qa@example.test',
                email_verified_at: '2026-11-01T00:00:00Z',
                role: 'sales',
                is_active: true,
            },
        },
    });
    let checked = 0;
    try {
        for (const width of [390, 768, 1440]) {
            for (const theme of ['light', 'dark']) {
                await page.setViewportSize({ width, height: 1000 });
                await page.addInitScript(
                    (appearance) =>
                        localStorage.setItem('appearance', appearance),
                    theme,
                );
                customer = {
                    public_id: 'qa-customer',
                    name: 'Pelanggan QA',
                    phone: '+6281234567890',
                    email: null,
                    address: null,
                    contact_channel_preference: 'any',
                    opt_out: true,
                    last_contact_at: null,
                    notes: null,
                    assigned_sales: {
                        public_id: 'qa-sales',
                        name: 'Sales QA',
                        username: 'qa-sales',
                    },
                    active_deal: {
                        id: 1,
                        public_id: 'qa-deal',
                        vehicle_model: 'Model QA',
                        current_stage: 'lead',
                        stage_label: 'Lead',
                        is_closed: false,
                        is_stagnant: false,
                        estimated_value: null,
                    },
                    next_follow_up: null, follow_up_history: [],
                    stage_history: [],
                    recent_activities: [],
                };
                fixture = {
                    ...initial,
                    component: 'customers/index',
                    url: '/customers',
                    props: {
                        ...base(),
                        customers: {
                            data: [customer],
                            current_page: 1,
                            last_page: 1,
                            total: 1,
                            from: 1,
                            to: 1,
                            links: [],
                        },
                        filters: {
                            search: '',
                            tab: 'all',
                            sort: 'updated_at',
                            direction: 'desc',
                        },
                        counts: {
                            all: 1,
                            follow_up_today: 0,
                            uncontacted: 1,
                            active: 0,
                            purchased: 0,
                            inactive: 0,
                            repeat_order: 0,
                            referral: 0,
                        },
                        assignableSales: [],
                    },
                };
                customersFixture = fixture;
                await page.goto(`${origin}/customers`);
                assert(
                    (await page
                        .locator('a[href^="tel:"],a[href^="https://wa.me/"]')
                        .count()) === 0,
                    'Refusal must remove all quick-contact links',
                );
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .filter({ visible: true })
                    .first()
                    .click();
                // Contact preferences live in the transaction modal's customer panel.
                await page
                    .getByRole('dialog')
                    .getByRole('button', { name: 'Pelanggan', exact: true })
                    .click();
                const form = page.getByRole('region', {
                    name: 'Preferensi kontak pelanggan',
                });
                await form.waitFor();
                await form
                    .getByLabel('Kanal pilihan', { exact: true })
                    .selectOption('whatsapp');
                await form.getByRole('checkbox').uncheck();
                await form
                    .getByRole('button', { name: 'Simpan preferensi kontak' })
                    .click();
                await page
                    .getByRole('dialog')
                    .getByRole('link', { name: 'WhatsApp Pelanggan QA', exact: true })
                    .waitFor();
                assert(
                    (await page.locator('a[href^="tel:"]').count()) === 0,
                    'WhatsApp-only preference must remove phone links',
                );
                assert(
                    writes.at(-1).opt_out === false &&
                        writes.at(-1).contact_channel_preference === 'whatsapp',
                    'Contact update payload',
                );
                await form.getByRole('checkbox').check();
                await form
                    .getByRole('button', { name: 'Simpan preferensi kontak' })
                    .click();
                await form
                    .getByText(
                        'Pelanggan menolak dihubungi pada semua kanal.',
                        { exact: true },
                    )
                    .waitFor();
                assert(
                    (await page
                        .locator('a[href^="tel:"],a[href^="https://wa.me/"]')
                        .count()) === 0,
                    'Saved refusal must remove all links immediately',
                );
                assert(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                    'Customer page overflow',
                );
                await page.screenshot({
                    path: `.playwright-cli/g05-contact-${width}-${theme}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
                const customerDocument = structuredClone(fixture);
                fixture = {
                    ...initial,
                    component: 'transactions/index',
                    url: '/transactions',
                    props: {
                        ...base(),
                        transactions: { data: [], links: [] },
                        filters: {
                            search: '',
                            stage: '',
                            tab: 'all',
                            sales_id: null,
                            source: null,
                            date_from: null,
                            date_to: null,
                        },
                        assignableSales: [],
                        sourceOptions: ['walk_in', 'referral'],
                        stages: [],
                        lostReasons: [],
                    },
                };
                await page.goto(`${origin}/transactions`);
                await page.locator('#transaction-date').click();
                await pickDay('2026-11-01');
                await pickDay('2026-11-05');
                await page.keyboard.press('Escape');
                await page
                    .getByLabel('Sumber lead', { exact: true })
                    .selectOption('referral');
                await page
                    .getByRole('button', { name: 'Terapkan', exact: true })
                    .click();
                await page.waitForURL(/source=referral/);
                const query = queries.at(-1);
                assert(
                    query.date_from === '2026-11-01' &&
                        query.date_to === '2026-11-05' &&
                        query.source === 'referral',
                    'Applied filter query must retain dates and source',
                );
                await page
                    .getByRole('button', { name: 'Aktif', exact: true })
                    .click();
                await page.waitForURL(/tab=active/);
                assert(
                    queries.at(-1).source === 'referral' &&
                        queries.at(-1).date_from === '2026-11-01',
                    'Tab change must retain date and source filters',
                );
                assert(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <= innerWidth,
                    ),
                    'Transaction filters overflow',
                );
                await page.screenshot({
                    path: `.playwright-cli/g05-filters-${width}-${theme}.png`,
                    fullPage: true,
                    animations: 'disabled',
                });
                // Lead creation now lives on /transactions/create (covered by lead-server-save.js).
                checked++;
            }
        }
        for (const kind of ['http', 'network']) {
            failure = kind;
            fixture = customersFixture;
            await page.goto(`${origin}/customers`);
            await page
                .getByRole('button', { name: 'Detail', exact: true })
                .filter({ visible: true })
                .first()
                .click();
            await page
                .getByRole('dialog')
                .getByRole('button', { name: 'Pelanggan', exact: true })
                .click();
            const form = page.getByRole('region', {
                name: 'Preferensi kontak pelanggan',
            });
            await form.getByRole('checkbox').uncheck();
            await form
                .getByRole('button', { name: 'Simpan preferensi kontak' })
                .click();
            await form
                .getByText(
                    kind === 'http'
                        ? /Preferensi belum dapat dikonfirmasi tersimpan/
                        : /Koneksi terputus/,
                )
                .waitFor();
            assert(
                (await form.getByRole('checkbox').isChecked()) === false,
                'Contact error must preserve the draft',
            );
            assert(
                (await page
                    .locator('a[href^="tel:"],a[href^="https://wa.me/"]')
                    .count()) === 0,
                'Unsaved consent must not enable contact actions',
            );
        }
        assert(browserErrors.length === 0, browserErrors.join('; '));
        return {
            checked,
            contactRequestFailures: true,
            interceptedWrites: writes.length,
            businessWrites: 0,
            browserErrors,
        };
    } finally {
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto(`${origin}/login`);
    }
}
