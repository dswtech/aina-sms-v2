// Run: playwright-cli run-code --filename tests/Browser/customer-duplicate.js
// Synthetic documents use real application assets; every write is intercepted.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function customerDuplicate(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    let fixture;
    let mode = 'visible';
    const submissions = [];
    const candidateId = '00000000-0000-4000-8000-000000000001';
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET') {
            if (new URL(request.url()).pathname !== '/customers')
                throw new Error('Unexpected mutation');
            const data = request.postDataJSON();
            submissions.push(data);
            if (mode === 'network') return route.abort('failed');
            if (mode === 'http')
                return route.fulfill({
                    status: 503,
                    contentType: 'text/plain',
                    body: 'QA unavailable',
                });
            fixture.props.errors = {};
            fixture.props.duplicateLead = null;
            if (data.existing_customer_id && mode === 'stale') {
                fixture.props.errors = {
                    existing_customer_id:
                        'Pelanggan tidak cocok dengan nomor ini. Periksa kembali.',
                };
            } else if (!data.existing_customer_id && mode !== 'new') {
                fixture.props.errors = {
                    duplicate_customer:
                        'Nomor telepon sudah terdaftar. Periksa pelanggan sebelum menyimpan.',
                };
                fixture.props.duplicateLead = {
                    phone: data.phone.trim(),
                    customers:
                        mode === 'hidden'
                            ? []
                            : [
                                  {
                                      public_id: candidateId,
                                      name: 'Pelanggan Lama QA',
                                  },
                              ],
                };
            }
            return route.fulfill({
                status: 200,
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
    const reset = async (role = 'sales') => {
        fixture = {
            ...initial,
            component: 'customers/index',
            url: '/customers',
            props: {
                ...initial.props,
                errors: {},
                duplicateLead: null,
                auth: {
                    user: {
                        public_id: `qa-${role}`,
                        name: 'Pengguna QA',
                        username: 'qa',
                        email: 'qa@example.test',
                        email_verified_at: '2026-11-01T00:00:00Z',
                        role,
                        is_active: true,
                    },
                },
                notifications: [],
                notificationsUnreadCount: 0,
                sidebarOpen: true,
                customers: {
                    data: [],
                    current_page: 1,
                    last_page: 1,
                    total: 0,
                    from: null,
                    to: null,
                    links: [],
                },
                filters: {
                    search: '',
                    tab: 'all',
                    sort: 'updated_at',
                    direction: 'desc',
                },
                counts: {
                    all: 0,
                    follow_up_today: 0,
                    uncontacted: 0,
                    active: 0,
                    purchased: 0,
                    inactive: 0,
                    repeat_order: 0,
                    referral: 0,
                },
                assignableSales:
                    role === 'sales'
                        ? []
                        : [
                              {
                                  id: 7,
                                  public_id: 'qa-pic',
                                  name: 'Sales PIC QA',
                              },
                          ],
            },
        };
        await page.goto(`${origin}/customers`);
        await page
            .getByRole('button', { name: 'Tambah Lead Baru', exact: true })
            .click();
        await page.locator('#lead-name').fill('Nama Draft QA');
        await page.locator('#lead-phone').fill('081299887766');
        await page.locator('#lead-model').fill('Model Draft QA');
        await page.locator('#lead-closing-month').fill('2026-12');
        await page.locator('#lead-notes').fill('Catatan peluang QA');
        if (role !== 'sales') {
            await page.locator('#lead-sales').click();
            await page.getByRole('option', { name: 'Sales PIC QA' }).click();
        }
    };
    const probe = async () => {
        await page
            .getByRole('button', { name: 'Simpan Lead', exact: true })
            .click();
        await page
            .getByRole('region', { name: 'Konfirmasi pelanggan' })
            .waitFor();
    };
    const candidate = () =>
        page.getByRole('button', { name: /Pelanggan Lama QA/ });
    let checked = 0;
    try {
        await reset();
        await page.locator('#lead-phone').fill(' 081299887766 ');
        await probe();
        assert(
            await candidate().isVisible(),
            'Trimmed server response must match the preserved phone draft',
        );
        for (const role of ['sales', 'supervisor', 'admin']) {
            for (const width of [390, 768, 1440]) {
                for (const theme of ['light', 'dark']) {
                    await page.setViewportSize({ width, height: 1000 });
                    await page.addInitScript(
                        (appearance) =>
                            localStorage.setItem('appearance', appearance),
                        theme,
                    );
                    mode = 'visible';
                    await reset(role);
                    await probe();
                    assert(
                        await candidate().evaluate(
                            (button) =>
                                button.scrollHeight <= button.clientHeight,
                        ),
                        'Customer choice must contain both text lines without clipping',
                    );
                    assert(
                        (await page.locator('#lead-model').inputValue()) ===
                            'Model Draft QA',
                        'Warning must preserve draft',
                    );
                    assert(
                        await page
                            .getByRole('region', {
                                name: 'Konfirmasi pelanggan',
                            })
                            .evaluate(
                                (element) => element === document.activeElement,
                            ),
                        'Confirmation must receive keyboard focus',
                    );
                    assert(
                        (await page
                            .getByRole('button', {
                                name: 'Simpan Lead',
                                exact: true,
                            })
                            .count()) === 0,
                        'Unconfirmed duplicate must not offer normal save',
                    );
                    const beforeCancel = submissions.length;
                    await page
                        .getByRole('button', { name: 'Batal menyimpan' })
                        .click();
                    assert(
                        submissions.length === beforeCancel,
                        'Cancel must not submit',
                    );
                    await page
                        .getByRole('button', {
                            name: 'Tambah Lead Baru',
                            exact: true,
                        })
                        .click();
                    assert(
                        (await page.locator('#lead-phone').inputValue()) ===
                            '081299887766',
                        'Cancel must preserve phone draft',
                    );
                    await probe();
                    assert(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth,
                        ),
                        'Page must not overflow',
                    );
                    assert(
                        await page
                            .getByRole('dialog')
                            .evaluate(
                                (element) =>
                                    element.scrollWidth <= element.clientWidth,
                            ),
                        'Dialog must not overflow horizontally',
                    );
                    await page.screenshot({
                        path: `.playwright-cli/g04-${role}-${width}-${theme}.png`,
                        fullPage: true,
                        animations: 'disabled',
                    });
                    await candidate().click();
                    await page.getByRole('dialog').waitFor({ state: 'hidden' });
                    const saved = submissions.at(-1);
                    assert(
                        saved.existing_customer_id === candidateId &&
                            saved.vehicle_model === 'Model Draft QA' &&
                            saved.notes === 'Catatan peluang QA' &&
                            saved.expected_closing_month === '2026-12',
                        'Confirmation must submit selected identity and original opportunity draft',
                    );
                    checked++;
                }
            }
        }
        mode = 'hidden';
        await reset();
        await probe();
        assert(
            (await candidate().count()) === 0,
            'Restricted identity must not appear',
        );
        await page.getByText(/Hubungi SPV\/Admin/).waitFor();
        await page.screenshot({
            path: '.playwright-cli/g04-hidden.png',
            fullPage: true,
            animations: 'disabled',
        });
        await page.locator('#lead-phone').fill('081234567899');
        assert(
            (await page
                .getByRole('region', { name: 'Konfirmasi pelanggan' })
                .count()) === 0,
            'Changed phone must hide stale choices',
        );
        mode = 'new';
        await page
            .getByRole('button', { name: 'Simpan Lead', exact: true })
            .click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });

        mode = 'stale';
        await reset();
        await probe();
        await candidate().click();
        await page
            .getByText(
                'Pelanggan tidak cocok dengan nomor ini. Periksa kembali.',
            )
            .waitFor();
        assert(
            (await page.locator('#lead-model').inputValue()) ===
                'Model Draft QA',
            'Stale identity must preserve draft',
        );
        for (const failure of ['http', 'network']) {
            mode = failure;
            await reset();
            await page
                .getByRole('button', { name: 'Simpan Lead', exact: true })
                .click();
            await page
                .getByText(
                    failure === 'http'
                        ? /Lead belum dapat dikonfirmasi tersimpan/
                        : /Koneksi terputus/,
                )
                .waitFor();
            assert(
                (await page.locator('#lead-notes').inputValue()) ===
                    'Catatan peluang QA',
                'Request failure must preserve draft',
            );
            assert(
                await page
                    .getByRole('button', { name: 'Simpan Lead', exact: true })
                    .isEnabled(),
                'Request failure must unlock the form',
            );
        }
        assert(browserErrors.length === 0, browserErrors.join('; '));
        return {
            checked,
            restrictedAndChangedPhone: true,
            staleIdentity: true,
            requestFailures: true,
            interceptedSubmissions: submissions.length,
            businessWrites: 0,
            browserErrors,
        };
    } finally {
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto(`${origin}/login`);
    }
}
