// Run with playwright-cli run-code --filename. Documents and writes are intercepted.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function leadContactFilters(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    let fixture;
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
                    active_deal: null,
                    next_follow_up: null,
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
                    .getByRole('link', { name: 'WhatsApp', exact: true })
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
                await page.getByLabel('Lead dibuat mulai').waitFor();
                await page.getByLabel('Lead dibuat mulai').fill('2026-11-01');
                await page.getByLabel('Lead dibuat sampai').fill('2026-11-05');
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
                for (const role of ['sales', 'supervisor', 'admin']) {
                    fixture = structuredClone(customerDocument);
                    fixture.props.auth.user.role = role;
                    fixture.props.assignableSales =
                        role === 'sales'
                            ? []
                            : [
                                  {
                                      id: 7,
                                      public_id: 'qa-pic',
                                      name: 'Sales PIC QA',
                                  },
                              ];
                    await page.goto(`${origin}/customers`);
                    await page
                        .getByRole('button', {
                            name: 'Tambah Lead Baru',
                            exact: true,
                        })
                        .click();
                    if (role !== 'sales') {
                        assert(
                            await page
                                .getByRole('button', {
                                    name: 'Simpan Lead',
                                    exact: true,
                                })
                                .isDisabled(),
                            'Management must choose a Sales before saving a new customer',
                        );
                        await page.locator('#lead-sales').click();
                        await page
                            .getByRole('option', { name: 'Sales PIC QA' })
                            .click();
                    } else {
                        assert(
                            (await page.locator('#lead-sales').count()) === 0,
                            'Sales must not be offered an owner override',
                        );
                    }
                    await page.locator('#lead-name').fill('Lead Baru QA');
                    await page.locator('#lead-phone').fill('081234567899');
                    await page.locator('#lead-model').fill('Model QA');
                    await page.locator('#lead-closing-month').fill('2026-12');
                    await page
                        .locator('#lead-contact-channel')
                        .selectOption('phone');
                    await page.locator('#lead-contact-refusal').check();
                    if (role === 'supervisor')
                        await page.screenshot({
                            path: `.playwright-cli/g05-lead-${width}-${theme}.png`,
                            fullPage: true,
                            animations: 'disabled',
                        });
                    await page
                        .getByRole('button', {
                            name: 'Simpan Lead',
                            exact: true,
                        })
                        .click();
                    await page.getByRole('dialog').waitFor({ state: 'hidden' });
                    const data = writes.at(-1);
                    assert(
                        data.sales_id === (role === 'sales' ? undefined : 7),
                        'Lead PIC request must follow role',
                    );
                    assert(
                        data.opt_out === true &&
                            data.contact_channel_preference === 'phone' &&
                            data.expected_closing_month === '2026-12',
                        'Lead consent and closing-month draft must survive submission',
                    );
                }
                checked++;
            }
        }
        for (const kind of ['http', 'network']) {
            failure = kind;
            await page.goto(`${origin}/customers`);
            await page
                .getByRole('button', { name: 'Detail', exact: true })
                .filter({ visible: true })
                .first()
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
