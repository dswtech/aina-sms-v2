// Run: playwright-cli -s=g06 run-code --filename tests/Browser/customer-history.js
// Synthetic payloads only. All writes are intercepted.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function customerHistory(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const time = '2026-11-01T01:00:00Z';
    const deal = (id, closed) => ({
        id,
        public_id: `qa-deal-${id}`,
        vehicle_model: `Model QA ${id}`,
        current_stage: closed ? 'delivery' : 'lead',
        stage_label: closed ? 'Delivery' : 'Lead',
        is_closed: closed,
        is_stagnant: false,
        estimated_value: null,
        expected_closing_month: null,
        can_comment: true,
        comments: [],
    });
    const customer = {
        public_id: 'qa-customer',
        name: 'Pelanggan QA',
        phone: '628123456789',
        email: null,
        address: null,
        notes: null,
        contact_channel_preference: null,
        opt_out: false,
        last_contact_at: null,
        assigned_sales: null,
        active_deal: deal(2, false),
        next_follow_up: null,
        stage_history: [],
        recent_activities: [],
    };
    const pager = (data, page = 1, total = data.length) => ({
        data,
        current_page: page,
        last_page: total > 20 ? 2 : 1,
        total,
    });
    let role = 'admin',
        mode = 'ok',
        screen = 'customer',
        coachingPage = 1,
        releaseHistory;
    const submissions = [],
        requests = [],
        errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const customerFixture = () => ({
        ...initial,
        component: 'customers/index',
        url: '/customers?search=QA',
        props: {
            ...initial.props,
            auth: {
                user: {
                    public_id: 'qa-user',
                    name: 'QA',
                    username: 'qa',
                    email: 'qa@example.test',
                    role,
                    is_active: true,
                },
            },
            errors: {},
            notifications: [],
            notificationsUnreadCount: 0,
            sidebarOpen: true,
            customers: {
                data: [
                    customer,
                    {
                        ...customer,
                        public_id: 'qa-customer-b',
                        name: 'Pelanggan B QA',
                        active_deal: deal(3, false),
                    },
                ],
                current_page: 1,
                last_page: 1,
                total: 1,
                from: 1,
                to: 1,
                links: [],
            },
            filters: {
                search: 'QA',
                tab: 'all',
                sort: 'updated_at',
                direction: 'desc',
            },
            counts: {
                all: 1,
                follow_up_today: 0,
                uncontacted: 1,
                active: 1,
                purchased: 0,
                inactive: 0,
                repeat_order: 0,
                referral: 0,
            },
            assignableSales: [],
        },
    });
    const fixture = () =>
        screen === 'customer'
            ? customerFixture()
            : {
                  ...customerFixture(),
                  component: 'transactions/coaching',
                  url: '/transactions/qa-deal-1/coaching',
                  props: {
                      ...customerFixture().props,
                      transaction: {
                          public_id: 'qa-deal-1',
                          vehicle_model: 'Coaching Model QA',
                          stage_label: 'Lead',
                          can_comment: true,
                      },
                      timeline: pager(
                          [
                              {
                                  key: 'comment-9',
                                  kind: 'comment',
                                  occurred_at: time,
                                  actor_name: 'Supervisor QA',
                                  body: `Coaching halaman ${coachingPage}`,
                                  label: 'Komentar',
                                  comment: {
                                      id: 9,
                                      body: `Coaching halaman ${coachingPage}`,
                                      author_name: 'Supervisor QA',
                                      created_at: time,
                                      edited_at: null,
                                      stage_at_creation_label: 'Lead',
                                      can_edit: true,
                                      parent_id: null,
                                      parent_body: null,
                                      parent_author_name: null,
                                  },
                              },
                          ],
                          coachingPage,
                          21,
                      ),
                  },
              };
    await page.route('**/*', async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (url.pathname.endsWith('/coaching'))
            coachingPage = Number(url.searchParams.get('timeline_page') || 1);
        if (request.method() !== 'GET') {
            submissions.push({
                url: url.pathname,
                data: request.postDataJSON(),
            });
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: { 'X-Inertia': 'true' },
                body: JSON.stringify(fixture()),
            });
        }
        if (url.pathname.endsWith('/history')) {
            requests.push(url.search);
            const held = mode === 'slow';
            if (held)
                await new Promise((resolve) => {
                    releaseHistory = resolve;
                });
            if (mode === 'error')
                return route.fulfill({ status: 503, body: 'Unavailable' });
            if (mode === 'denied')
                return route.fulfill({ status: 403, body: 'Forbidden' });
            const old = url.searchParams.get('transaction') === 'qa-deal-1';
            const comment = {
                id: 7,
                body: 'Komentar QA',
                author_name: 'Supervisor QA',
                created_at: time,
                edited_at: time,
                stage_at_creation: 'lead',
                stage_at_creation_label: 'Lead',
                can_edit: role === 'sales',
                parent_id: null,
                parent_body: null,
                parent_author_name: null,
                ...(role === 'admin'
                    ? {
                          revisions: [
                              {
                                  id: 1,
                                  old_body: 'Isi sebelum edit QA',
                                  edited_at: time,
                                  editor_name: 'Editor QA',
                              },
                          ],
                      }
                    : {}),
            };
            const second = url.searchParams.get('timeline_page') === '2';
            return route
                .fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        transactions: [deal(2, false), deal(1, true)],
                        selected_transaction: {
                            ...deal(old ? 1 : 2, old),
                            can_comment: role !== 'admin',
                        },
                        activities: pager(
                            [
                                {
                                    id: 1,
                                    type: 'call',
                                    type_label: 'Telepon',
                                    notes: 'Aktivitas hubungan QA',
                                    occurred_at: time,
                                    user_name: 'Sales QA',
                                },
                            ],
                            Number(url.searchParams.get('activity_page') || 1),
                            21,
                        ),
                        timeline: pager(
                            second
                                ? [
                                      {
                                          key: 'activity-22',
                                          kind: 'activity',
                                          occurred_at: time,
                                          actor_name: 'QA',
                                          label: 'Telepon',
                                          body: 'Event halaman dua QA',
                                      },
                                  ]
                                : [
                                      {
                                          key: 'stage-1',
                                          kind: 'stage',
                                          occurred_at: time,
                                          actor_name: 'QA',
                                          label: 'Lead → Prospect',
                                          body: 'Perubahan QA',
                                      },
                                      {
                                          key: 'comment-7',
                                          kind: 'comment',
                                          occurred_at: time,
                                          actor_name: 'Supervisor QA',
                                          label: 'Komentar',
                                          body: comment.body,
                                          comment,
                                      },
                                      {
                                          key: 'comment-8',
                                          kind: 'comment',
                                          occurred_at: time,
                                          actor_name: 'Sales QA',
                                          label: 'Balasan',
                                          body: 'Balasan QA',
                                          comment: {
                                              ...comment,
                                              id: 8,
                                              body: 'Balasan QA',
                                              parent_id: 7,
                                              parent_body: comment.body,
                                              parent_author_name:
                                                  'Supervisor QA',
                                              revisions: undefined,
                                          },
                                      },
                                  ],
                            second ? 2 : 1,
                            21,
                        ),
                    }),
                })
                .catch((failure) => {
                    if (!held) throw failure;
                });
        }
        if (
            url.pathname.endsWith('/coaching') &&
            request.headers()['x-inertia']
        )
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: { 'X-Inertia': 'true' },
                body: JSON.stringify(fixture()),
            });
        if (request.isNavigationRequest())
            return route.fulfill({
                contentType: 'text/html',
                body: template.replace(
                    bootstrap,
                    (_, a, _b, c) =>
                        a +
                        JSON.stringify(fixture()).replaceAll('<', '\\u003c') +
                        c,
                ),
            });
        return route.fulfill({ response: await route.fetch() });
    });
    let checked = 0;
    try {
        for (const width of [390, 768, 1440])
            for (const theme of ['light', 'dark']) {
                await page.setViewportSize({ width, height: 1000 });
                await page.addInitScript(
                    (value) => localStorage.setItem('appearance', value),
                    theme,
                );
                await page.goto(`${origin}/customers?search=QA`);
                await page.evaluate(() => window.scrollTo(0, 100));
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .first()
                    .scrollIntoViewIfNeeded();
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .first()
                    .focus();
                const listScroll = await page.evaluate(() => window.scrollY);
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .first()
                    .click();
                await page.getByLabel('Pilih transaksi').waitFor();
                await page
                    .getByLabel('Pilih transaksi')
                    .selectOption('qa-deal-1');
                await page
                    .getByText('Komentar QA', { exact: true })
                    .first()
                    .waitFor();
                assert(
                    (
                        await page
                            .locator('[data-event-key]')
                            .evaluateAll((items) =>
                                items.map((item) =>
                                    item.getAttribute('data-event-key'),
                                ),
                            )
                    ).join(',') === 'stage-1,comment-7,comment-8',
                    'Mixed events and flat reply must preserve chronological server order',
                );
                assert(
                    (await page
                        .getByRole('button', {
                            name: 'Ubah Tahap',
                            exact: true,
                        })
                        .count()) === 0,
                    'Closed selection must remove stage action',
                );
                assert(
                    (await page.locator('#history-comment-body').count()) === 0,
                    'Admin must have read-only conversation',
                );
                await page
                    .getByText('Riwayat revisi (1)', { exact: true })
                    .click();
                assert(
                    await page
                        .getByText('Isi sebelum edit QA', { exact: true })
                        .isVisible(),
                    'Admin must inspect revision body',
                );
                assert(
                    await page.getByText(/Editor QA/).isVisible(),
                    'Audit must include editor',
                );
                await page.screenshot({
                    path: `.playwright-cli/g06-${width}-${theme}.png`,
                });
                await page
                    .getByRole('button', { name: 'Timeline berikutnya' })
                    .click();
                await page
                    .getByText('Event halaman dua QA', { exact: true })
                    .waitFor();
                await page
                    .getByRole('button', { name: 'Aktivitas berikutnya' })
                    .click();
                assert(
                    requests.some((value) => value.includes('activity_page=2')),
                    'Relationship pagination must request second page',
                );
                assert(
                    await page
                        .locator('[role="dialog"]')
                        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
                    'Dialog must fit viewport',
                );
                await page.keyboard.press('Escape');
                await page.getByRole('dialog').waitFor({ state: 'hidden' });
                assert(
                    new URL(page.url()).searchParams.get('search') === 'QA',
                    'Closing detail must preserve filters',
                );
                assert(
                    Math.abs(
                        (await page.evaluate(() => window.scrollY)) -
                            listScroll,
                    ) <= 1,
                    `Closing detail must preserve list scroll position: ${listScroll} -> ${await page.evaluate(() => window.scrollY)}`,
                );
                checked++;
            }
        await page
            .getByRole('row')
            .filter({ hasText: 'Pelanggan B QA' })
            .getByRole('button', { name: 'Ubah Tahap', exact: true })
            .click();
        assert(
            await page
                .getByRole('dialog')
                .getByText('Transaksi: Model QA 3', { exact: false })
                .isVisible(),
            'Quick action for customer B must use B transaction after viewing A history',
        );
        await page
            .getByRole('button', {
                name: 'Konfirmasi Perubahan Tahap',
                exact: true,
            })
            .click();
        assert(
            submissions.at(-1).url === '/transactions/qa-deal-3/stage',
            'Quick stage write must target customer B transaction',
        );
        await page.setViewportSize({ width: 390, height: 1000 });
        await page.goto(`${origin}/customers?search=QA`);
        await page
            .getByRole('button', { name: 'Catat Aktivitas', exact: true })
            .first()
            .click();
        await page.locator('#act-notes').fill('Aktivitas cepat QA');
        await page
            .getByRole('button', { name: 'Simpan Aktivitas', exact: true })
            .click();
        assert(
            submissions.at(-1).url === '/customers/qa-customer/activities' &&
                submissions.at(-1).data.deal_transaction_id === 2,
            'Fresh quick activity must submit without opening history',
        );
        mode = 'error';
        await page.goto(`${origin}/customers?search=QA`);
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .first()
            .click();
        await page.getByRole('button', { name: 'Coba lagi' }).waitFor();
        mode = 'ok';
        await page.getByRole('button', { name: 'Coba lagi' }).click();
        await page.getByLabel('Pilih transaksi').waitFor();
        role = 'sales';
        await page.goto(`${origin}/customers?search=QA`);
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .first()
            .click();
        await page.getByLabel('Pilih transaksi').waitFor();
        assert(
            (await page.getByText(/Riwayat revisi/).count()) === 0,
            'Non Admin must not see audit revisions',
        );
        await page
            .getByLabel('Komentar baru', { exact: true })
            .fill('Draft halaman sama QA');
        await page.getByRole('button', { name: 'Timeline berikutnya' }).click();
        assert(
            (await page
                .getByLabel('Komentar baru', { exact: true })
                .inputValue()) === 'Draft halaman sama QA',
            'Same transaction timeline pagination must preserve draft',
        );
        await page
            .getByRole('button', { name: 'Aktivitas berikutnya' })
            .click();
        assert(
            (await page
                .getByLabel('Komentar baru', { exact: true })
                .inputValue()) === 'Draft halaman sama QA',
            'Same transaction relationship pagination must preserve draft',
        );
        mode = 'error';
        await page.getByRole('button', { name: 'Timeline sebelumnya' }).click();
        await page.getByRole('button', { name: 'Coba lagi' }).waitFor();
        mode = 'ok';
        await page.getByRole('button', { name: 'Coba lagi' }).click();
        assert(
            (await page
                .getByLabel('Komentar baru', { exact: true })
                .inputValue()) === 'Draft halaman sama QA',
            'Temporary pagination failure and retry must preserve draft',
        );
        await page.getByLabel('Pilih transaksi').selectOption('qa-deal-1');
        await page
            .getByLabel('Komentar baru', { exact: true })
            .fill('Draft transaksi lama QA');
        await page.getByLabel('Pilih transaksi').selectOption('qa-deal-2');
        assert(
            (await page
                .getByLabel('Komentar baru', { exact: true })
                .inputValue()) === '',
            'Switching transaction must clear draft',
        );
        await page.getByLabel('Pilih transaksi').selectOption('qa-deal-1');
        await page
            .getByLabel('Komentar baru', { exact: true })
            .fill('Komentar transaksi lama QA');
        await page
            .getByRole('button', { name: 'Kirim Komentar', exact: true })
            .click();
        assert(
            submissions.at(-1).url === '/transactions/qa-deal-1/comments',
            'Comment must target selected transaction',
        );
        await page.getByLabel('Pilih transaksi').waitFor();
        mode = 'denied';
        await page.getByRole('button', { name: 'Timeline berikutnya' }).click();
        await page
            .getByText('Akses riwayat sudah tidak tersedia.', { exact: true })
            .waitFor();
        assert(
            (await page.locator('#history-comment-body').count()) === 0,
            'Rejected server access must clear composer',
        );
        assert(
            (await page
                .getByRole('dialog')
                .getByText('Pelanggan QA', { exact: true })
                .count()) === 0,
            'Rejected access must hide stale Customer identity',
        );
        assert(
            (await page.getByText('Komentar QA', { exact: true }).count()) ===
                0,
            'Rejected server access must clear stale timeline',
        );
        assert(
            await page
                .getByRole('button', { name: 'Catat Aktivitas', exact: true })
                .isDisabled(),
            'Rejected server access must disable actions',
        );
        mode = 'ok';
        await page.getByRole('button', { name: 'Coba lagi' }).click();
        await page.getByLabel('Pilih transaksi').waitFor();
        mode = 'slow';
        await page.getByLabel('Pilih transaksi').selectOption('qa-deal-1');
        await page.getByText('Memuat riwayat…', { exact: true }).waitFor();
        assert(
            await page
                .getByRole('button', { name: 'Catat Aktivitas', exact: true })
                .isDisabled(),
            'Loading must disable stale actions',
        );
        await page.keyboard.press('Escape');
        mode = 'ok';
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .first()
            .click();
        await page.getByLabel('Pilih transaksi').waitFor();
        releaseHistory();
        assert(
            (await page.getByLabel('Pilih transaksi').inputValue()) ===
                'qa-deal-2',
            'Obsolete response must not restore old transaction',
        );
        mode = 'ok';
        screen = 'coaching';
        await page.goto(`${origin}/transactions/qa-deal-1/coaching`);
        await page.getByText('Coaching halaman 1', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Balas', exact: true }).click();
        assert(
            await page
                .getByLabel('Balas komentar', { exact: true })
                .evaluate((el) => el === document.activeElement),
            'Reply must focus coaching form',
        );
        await page.getByRole('button', { name: 'Batal', exact: true }).click();
        await page.getByRole('button', { name: 'Timeline berikutnya' }).click();
        await page.getByText('Coaching halaman 2', { exact: true }).waitFor();
        assert(errors.length === 0, errors.join('; '));
        return {
            passed: checked,
            errors,
            interceptedSubmissions: submissions.length,
            businessWrites: 0,
        };
    } finally {
        await page.unroute('**/*');
    }
}
