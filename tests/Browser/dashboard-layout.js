// Run: playwright-cli run-code --filename tests/Browser/dashboard-layout.js
// Synthetic, labelled data with real built assets. All mutations are blocked.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function dashboardLayout(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const errors = [];
    let writes = 0;
    let fixture;
    page.on('pageerror', (error) => errors.push(error.message));
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const metrics = (id, name, realization, forecast, target) => ({
        id,
        name,
        realization_units: realization,
        forecast_units: forecast,
        target_units: target,
        gap_units: target === null ? null : target - realization,
        forecast_gap_units:
            target === null || forecast === null ? null : target - forecast,
        benchmark_units: 24,
        sales_target_units: 24,
        allocation_percent: 100,
        active_allocation_units: 24,
        achievement_percent: target ? (realization / target) * 100 : null,
        benchmark_achievement_percent: (realization / 24) * 100,
        benchmark_gap_units: 24 - realization,
        benchmark_forecast_gap_units: forecast === null ? null : 24 - forecast,
    });
    const sales = [
        metrics(1, 'Ayu Prameswari — Data contoh', 3, 4.5, 6),
        metrics(2, 'Bima Saputra — Data contoh', 5, 6.25, 4),
        metrics(3, 'Citra Maharani — Data contoh', 3, 5.25, 6),
        metrics(4, 'Dimas Pratama — Data contoh', 2, 3.25, 4),
        metrics(5, 'Eka Wulandari — Data contoh', 0, 0, 0),
        metrics(
            6,
            'Farhan Ramadhan dengan nama panjang — Data contoh',
            0,
            null,
            null,
        ),
    ];
    const load = async (role, empty = false, historical = false) => {
        const canViewManagement = ['supervisor', 'branch_manager'].includes(
            role,
        );
        const teams = [
            metrics(
                'a',
                'Tim Showroom — Data contoh',
                8,
                historical ? null : 10.75,
                canViewManagement ? 12 : null,
            ),
            metrics(
                'b',
                'Tim Digital dan Penjualan Wilayah dengan nama panjang — Data contoh',
                5,
                historical ? null : 8.5,
                canViewManagement ? 4 : null,
            ),
            metrics(
                'c',
                'Tim Pengembangan — Data contoh',
                0,
                historical ? null : 0,
                null,
            ),
        ];
        teams[2].is_active = false;
        const personal = (role === 'sales' ? sales.slice(0, 1) : sales).map(
            (row) =>
                historical
                    ? { ...row, forecast_units: null, forecast_gap_units: null }
                    : row,
        );
        fixture = {
            ...initial,
            component: 'dashboard',
            url: '/dashboard',
            props: {
                ...initial.props,
                errors: {},
                sidebarOpen: true,
                auth: {
                    user: {
                        public_id: `qa-${role}`,
                        name: 'Pengguna Data contoh',
                        username: `qa-${role}`,
                        email: 'qa@example.test',
                        email_verified_at: '2026-11-01T00:00:00Z',
                        role,
                        is_active: true,
                    },
                },
                notifications: [],
                notificationsUnreadCount: 0,
                targetPlans: [],
                targetableUsers: [],
                targetableTeams: [],
                dashboard: {
                    period: historical ? '2026-10-01' : '2026-11-01',
                    targetUnits:
                        role === 'sales' ? 6 : canViewManagement ? 16 : null,
                    realizationUnits: empty ? 0 : role === 'sales' ? 3 : 13,
                    forecastUnits: historical
                        ? null
                        : empty
                          ? 0
                          : role === 'sales'
                            ? 4.5
                            : 19.25,
                    forecastApproved: false,
                    gapUnits:
                        role === 'sales'
                            ? empty
                                ? 6
                                : 3
                            : canViewManagement
                              ? empty
                                  ? 16
                                  : 3
                              : null,
                    forecastGapUnits:
                        historical || (!canViewManagement && role !== 'sales')
                            ? null
                            : role === 'sales'
                              ? empty
                                  ? 6
                                  : 1.5
                              : empty
                                ? 16
                                : -3.25,
                    salesTargetUnits: role === 'sales' ? 6 : 20,
                    salesTargetsMissing: role === 'sales' ? 0 : 1,
                    teamTargetsMissing: 1,
                    targetAllocationDifference: canViewManagement ? -4 : null,
                    missingClosingMonthCount: 1,
                    missingDoHistoryCount: 0,
                    stageCounts: empty
                        ? {}
                        : role === 'sales'
                          ? {
                                lead: 2,
                                prospect: 1,
                                hot_prospect: 1,
                                spk: 1,
                                do: 1,
                                delivery: 3,
                                lost: 0,
                            }
                          : {
                                lead: 12,
                                prospect: 8,
                                hot_prospect: 6,
                                spk: 4,
                                do: 3,
                                delivery: 13,
                                lost: 2,
                            },
                    stagnantCount: 2,
                    teams: empty || role === 'sales' ? [] : teams,
                    performance: empty ? [] : personal,
                    unassignedTeam:
                        role !== 'sales' && !empty
                            ? {
                                  realization_units: 0,
                                  forecast_units: historical ? null : 0,
                              }
                            : null,
                    contributors:
                        historical || empty
                            ? []
                            : role === 'sales'
                              ? [
                                    {
                                        public_id: 'qa-three',
                                        vehicle_model:
                                            'Hyundai Ioniq 5 — Data contoh',
                                        stage_label: 'DO',
                                        sales_name: 'Ayu Prameswari',
                                        weighted_value: 500000000,
                                    },
                                ]
                              : [
                                    {
                                        public_id: 'qa-three',
                                        vehicle_model:
                                            'Hyundai Ioniq 5 — Data contoh',
                                        stage_label: 'DO',
                                        sales_name: 'Ayu Prameswari',
                                        weighted_value: 500000000,
                                    },
                                    {
                                        public_id: 'qa-one',
                                        vehicle_model:
                                            'Hyundai Creta — Data contoh',
                                        stage_label: 'SPK',
                                        sales_name: 'Bima Saputra',
                                        weighted_value: 240000000,
                                    },
                                    {
                                        public_id: 'qa-two',
                                        vehicle_model:
                                            'Hyundai Stargazer — Data contoh',
                                        stage_label: 'Hot Prospect',
                                        sales_name: 'Citra Maharani',
                                        weighted_value: 168000000,
                                    },
                                ],
                    priorities:
                        role === 'branch_manager' || empty
                            ? { stagnant: [], closing: [], unread: [] }
                            : {
                                  stagnant: [
                                      {
                                          id: 'qa-stagnant',
                                          title: 'Follow-up pelanggan — Data contoh',
                                          stage: 'prospect',
                                          url: '/customers?customer=qa-customer',
                                      },
                                  ],
                                  closing: [
                                      {
                                          id: 'qa-closing',
                                          vehicle_model:
                                              'Konfirmasi penyerahan — Data contoh',
                                          stage: 'do',
                                          url: '/transactions?transaction=qa-closing',
                                      },
                                  ],
                                  unread: [],
                              },
                },
            },
        };
        await page.goto(`${origin}/dashboard`);
        await page
            .getByRole('heading', { name: 'Dashboard penjualan', exact: true })
            .waitFor();
        await page.evaluate(() => document.fonts.ready);
    };
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET') {
            writes++;
            return route.abort();
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
    let checked = 0;
    const geometry = async () => {
        const invalid = await page.evaluate(() => {
            const bad = [];
            const tracks = [
                ...document.querySelectorAll(
                    '#dashboard-sales-rows dl > div > [aria-hidden="true"]',
                ),
            ].map((el) => el.getBoundingClientRect().width);
            if (tracks.length && Math.max(...tracks) - Math.min(...tracks) > 1)
                bad.push('inconsistent chart track lengths');
            if (document.documentElement.scrollWidth > innerWidth)
                bad.push('page overflow');
            for (const el of document.querySelectorAll(
                'main summary, main button[aria-controls="dashboard-sales-rows"]',
            )) {
                const box = el.getBoundingClientRect();
                if (box.width > 0 && (box.width < 44 || box.height < 44))
                    bad.push('small target: ' + el.textContent);
            }
            for (const el of document.querySelectorAll(
                'main [aria-hidden="true"] > span[style]',
            )) {
                if (
                    !Number.isFinite(
                        parseFloat(el.style.width || el.style.left),
                    )
                )
                    bad.push('invalid chart geometry');
            }
            return bad;
        });
        assert(!invalid.length, invalid.join('; '));
    };
    try {
        for (const role of ['supervisor', 'branch_manager', 'admin', 'sales']) {
            for (const width of [390, 768, 1440]) {
                for (const theme of ['light', 'dark']) {
                    await page.setViewportSize({ width, height: 1000 });
                    await page.addInitScript(
                        (appearance) =>
                            localStorage.setItem('appearance', appearance),
                        theme,
                    );
                    await load(role);
                    const team = page.getByRole('region', {
                        name: 'Kinerja per tim',
                        exact: true,
                    });
                    const ranking = page.getByRole('region', {
                        name: 'Kinerja per Sales',
                        exact: true,
                    });
                    assert(
                        (await team.count()) === (role === 'sales' ? 0 : 1),
                        'Team visibility: ' + role,
                    );
                    assert(
                        (await page
                            .getByRole('region', {
                                name: 'Prioritas tindak lanjut',
                            })
                            .count()) === (role === 'branch_manager' ? 0 : 1),
                        'Priority visibility: ' + role,
                    );
                    assert(
                        (await page
                            .getByRole('main')
                            .getByText('Target management', { exact: true })
                            .count()) >
                            0 ===
                            ['supervisor', 'branch_manager'].includes(role),
                        'Management target visibility: ' + role,
                    );
                    assert(
                        (await ranking
                            .locator('#dashboard-sales-rows > li')
                            .count()) === (role === 'sales' ? 1 : 5),
                        'Initial ranking limit',
                    );
                    if (role !== 'sales') {
                        assert(
                            (
                                await ranking
                                    .locator('#dashboard-sales-rows > li h3')
                                    .first()
                                    .innerText()
                            ).startsWith('Bima'),
                            'Ranking order',
                        );
                        const expand = ranking.getByRole('button', {
                            name: 'Tampilkan semua 6 Sales',
                        });
                        await expand.focus();
                        await page.keyboard.press('Enter');
                        assert(
                            (await ranking
                                .locator('#dashboard-sales-rows > li')
                                .count()) === 6,
                            'Expanded ranking',
                        );
                        assert(
                            (
                                await ranking
                                    .locator('#dashboard-sales-rows > li')
                                    .last()
                                    .innerText()
                            ).includes('Tidak tersedia'),
                            'Missing forecast must be explicit',
                        );
                        await geometry();
                        await ranking
                            .getByRole('button', {
                                name: 'Tampilkan lima teratas',
                            })
                            .click();
                        const summary = team.locator('summary');
                        await summary.focus();
                        await page.keyboard.press('Enter');
                        assert(
                            await team
                                .getByRole('heading', {
                                    name: 'Rincian kinerja tim',
                                })
                                .isVisible(),
                            'Keyboard disclosure',
                        );
                        assert(
                            await team
                                .getByText('Benchmark tim', { exact: true })
                                .first()
                                .isVisible(),
                            'Team details retained',
                        );
                        await geometry();
                        await summary.press('Space');
                    }
                    const detail = ranking.locator('summary');
                    await detail.press('Enter');
                    assert(
                        await ranking
                            .getByRole('heading', {
                                name: 'Rincian kinerja Sales',
                            })
                            .isVisible(),
                        'Sales details retained',
                    );
                    await geometry();
                    await detail.press('Enter');
                    const positions = await page.evaluate(() => {
                        const team = document.querySelector(
                            'section[aria-label="Kinerja per tim"]',
                        );
                        const pipeline = document.querySelector(
                            'section[aria-label="Pipeline per tahap"]',
                        );
                        if (!team) return null;
                        const a = team.getBoundingClientRect(),
                            b = pipeline.getBoundingClientRect();
                        return {
                            sameRow: Math.abs(a.top - b.top) < 2,
                            ratio: a.width / b.width,
                        };
                    });
                    if (positions)
                        assert(
                            width >= 1280
                                ? positions.sameRow && positions.ratio > 1.8
                                : !positions.sameRow,
                            `Panel layout ${width}`,
                        );
                    await geometry();
                    if (
                        (role === 'supervisor' && width === 1440) ||
                        (role === 'sales' && width === 390)
                    ) {
                        await page.evaluate(() => {
                            if (document.activeElement instanceof HTMLElement)
                                document.activeElement.blur();
                            window.scrollTo(0, 0);
                        });
                        await page.screenshot({
                            path: `.playwright-cli/dashboard-${role}-${width}-${theme}.png`,
                            fullPage: true,
                            animations: 'disabled',
                        });
                        if (role === 'supervisor') {
                            await team
                                .locator('..')
                                .locator('..')
                                .screenshot({
                                    path: `.playwright-cli/dashboard-panels-${theme}.png`,
                                    style: 'header.sticky { visibility: hidden; }',
                                    animations: 'disabled',
                                });
                        }
                    }
                    checked++;
                }
            }
        }
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            await load('supervisor', true);
            assert(
                (await page
                    .getByText('Belum ada data kinerja pada periode ini.', {
                        exact: true,
                    })
                    .count()) === 2,
                'Empty performance panels',
            );
            assert(
                await page
                    .getByText('Belum ada transaksi pada periode ini.', {
                        exact: true,
                    })
                    .isVisible(),
                'Empty pipeline',
            );
            await geometry();
            await load('supervisor', false, true);
            assert(
                await page
                    .getByText(
                        'Forecast bulan lampau tidak tersedia karena snapshot historis belum disimpan.',
                        { exact: false },
                    )
                    .isVisible(),
                'Historical forecast explanation',
            );
            assert(
                (
                    await page
                        .getByRole('region', {
                            name: 'Kinerja per tim',
                            exact: true,
                        })
                        .locator('#dashboard-team-rows')
                        .innerText()
                ).includes('Tidak tersedia'),
                'Historical bars must not imply zero',
            );
            await geometry();
            checked += 2;
        }
        assert(!errors.length, errors.join('; '));
        assert(writes === 0, 'No writes allowed');
        return {
            checked,
            browserErrors: errors,
            attemptedWrites: writes,
            businessWrites: 0,
        };
    } finally {
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto(`${origin}/login`);
    }
}
