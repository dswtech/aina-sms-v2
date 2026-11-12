// Run: playwright-cli run-code --filename tests/Browser/target-role-metrics.js
// Uses synthetic Inertia documents and real assets. Every mutation is blocked.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function targetRoleMetrics(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const errors = [];
    let writes = 0;
    let fixture;
    page.on('pageerror', (error) => errors.push(error.message));
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
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const personal = {
        id: 1,
        name: 'Sales Alpha QA',
        username: 'qa-alpha',
        target_units: 60,
        realization_units: 1,
        forecast_units: 1.5,
        gap_units: 59,
        forecast_gap_units: 58.5,
    };
    const team = {
        id: 'qa-team',
        name: 'Tim QA',
        is_active: true,
        target_units: 100,
        realization_units: 2,
        forecast_units: 3,
        gap_units: 98,
        forecast_gap_units: 97,
        sales_target_units: 120,
        sales_targets_missing: 0,
        benchmark_units: 120,
        allocation_percent: 100,
        active_allocation_units: 120,
        achievement_percent: 2,
        benchmark_achievement_percent: 1.67,
        benchmark_gap_units: 118,
        benchmark_forecast_gap_units: 117,
        target_allocation_difference: -20,
    };
    const screens = [
        ['sales', 'dashboard', '/dashboard'],
        ['supervisor', 'dashboard', '/dashboard'],
        ['branch_manager', 'dashboard', '/dashboard'],
        ['admin', 'dashboard', '/dashboard'],
        ['supervisor', 'targets/index', '/targets'],
        ['admin', 'targets/index', '/targets'],
        ['branch_manager', 'team-performance/index', '/team-performance'],
    ];
    let checked = 0;
    try {
        for (const [role, component, url] of screens) {
            const canViewManagement =
                role === 'supervisor' || role === 'branch_manager';
            const isSales = role === 'sales';
            const safeTeam = {
                ...team,
                ...(!canViewManagement
                    ? {
                          target_units: null,
                          gap_units: null,
                          forecast_gap_units: null,
                          achievement_percent: null,
                          target_allocation_difference: null,
                      }
                    : {}),
            };
            fixture = {
                ...initial,
                component,
                url,
                props: {
                    ...initial.props,
                    errors: {},
                    sidebarOpen: true,
                    auth: {
                        user: {
                            public_id: `qa-${role}`,
                            name: 'Pengguna QA',
                            username: `qa-${role}`,
                            email: 'qa@example.test',
                            email_verified_at: '2026-11-01T00:00:00Z',
                            role,
                            is_active: true,
                        },
                    },
                    notifications: [],
                    notificationsUnreadCount: 0,
                    targetableUsers: [],
                    targetableTeams: [],
                    targetPlans:
                        role === 'supervisor'
                            ? [
                                  {
                                      team_id: 'qa-team',
                                      name: 'Tim QA',
                                      period: '2026-11',
                                      version: 1,
                                      legacy: false,
                                      target_units: 100,
                                      markup_percent: 20,
                                      benchmark_units: 120,
                                      members: [1, 2].map((id) => ({
                                          user_id: id,
                                          name: `Sales ${id} QA`,
                                          username: `qa-sales-${id}`,
                                          active: true,
                                          target_units: 60,
                                          allocated: true,
                                          remaining_workdays: 8,
                                          period_workdays: 24,
                                      })),
                                  },
                              ]
                            : [],
                    dashboard: {
                        period: '2026-11-01',
                        targetUnits: isSales
                            ? 60
                            : canViewManagement
                              ? 100
                              : null,
                        realizationUnits: isSales ? 1 : 2,
                        forecastUnits: isSales ? 1.5 : 3,
                        gapUnits: isSales ? 59 : canViewManagement ? 98 : null,
                        forecastGapUnits: isSales
                            ? 58.5
                            : canViewManagement
                              ? 97
                              : null,
                        salesTargetUnits: isSales ? 60 : 120,
                        salesTargetsMissing: 0,
                        teamTargetsMissing: 0,
                        targetAllocationDifference: canViewManagement
                            ? -20
                            : null,
                        forecastApproved: false,
                        forecastValue: 0,
                        missingClosingMonthCount: 0,
                        missingDoHistoryCount: 0,
                        stageCounts: {
                            delivery: isSales ? 1 : 2,
                            hot_prospect: isSales ? 1 : 2,
                        },
                        stagnantCount: 0,
                        contributors: [],
                        teams: [safeTeam],
                        performance: [
                            personal,
                            ...(!isSales
                                ? [
                                      {
                                          ...personal,
                                          id: 2,
                                          name: 'Sales Beta QA',
                                      },
                                  ]
                                : []),
                        ],
                        priorities: { stagnant: [], closing: [], unread: [] },
                        unassignedTeam: null,
                    },
                },
            };
            for (const width of [390, 768, 1440]) {
                for (const theme of ['light', 'dark']) {
                    await page.setViewportSize({ width, height: 1000 });
                    await page.addInitScript(
                        (appearance) =>
                            localStorage.setItem('appearance', appearance),
                        theme,
                    );
                    await page.goto(origin + url);
                    await page.locator('h1').waitFor();
                    await page.evaluate(() => document.fonts.ready);
                    const content = page.getByRole('main');
                    assert(
                        (await content
                            .getByText('Target management', { exact: true })
                            .count()) >
                            0 ===
                            canViewManagement,
                        `Management visibility: ${role} ${url}`,
                    );
                    assert(
                        (await page
                            .getByRole('region', {
                                name: 'Editor rencana target',
                            })
                            .count()) >
                            0 ===
                            false,
                        `Editor visibility: ${role} ${url}`,
                    );
                    if (component === 'dashboard') {
                        await page
                            .getByText('Lihat rincian angka Sales', {
                                exact: true,
                            })
                            .click();
                    }
                    const personalSection = page
                        .locator('section')
                        .filter({
                            has: page.getByRole('heading', {
                                name:
                                    component === 'targets/index'
                                        ? 'Target dan kinerja Sales'
                                        : component === 'dashboard'
                                          ? 'Rincian kinerja Sales'
                                          : 'Kinerja per Sales',
                                exact: true,
                            }),
                        })
                        .last();
                    const card = personalSection
                        .locator('article')
                        .filter({ hasText: 'Sales Alpha QA' });
                    const row = personalSection
                        .locator('tbody tr')
                        .filter({ hasText: 'Sales Alpha QA' });
                    if (await card.isVisible()) {
                        for (const [label, value] of [
                            ['Target personal', '60'],
                            ['Realisasi', '1'],
                            ['Forecast', '1,5'],
                            ['Gap ke realisasi', '59'],
                            ['Gap ke forecast', '58,5'],
                        ]) {
                            const cell = card.locator('dl > div').filter({
                                has: page.getByText(label, { exact: true }),
                            });
                            assert(
                                (await cell.locator('dd').innerText()) ===
                                    value,
                                `${role}: ${label}`,
                            );
                        }
                    } else {
                        assert(
                            JSON.stringify(
                                await row.locator('td').allTextContents(),
                            ) ===
                                JSON.stringify([
                                    '60',
                                    '1',
                                    '1,5',
                                    '59',
                                    '58,5',
                                ]),
                            `Personal row: ${role}`,
                        );
                    }
                    assert(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth <=
                                innerWidth,
                        ),
                        `Page overflow: ${role} ${width}`,
                    );
                    if (component === 'dashboard') {
                        const forecast = content
                            .locator('dl')
                            .first()
                            .locator(':scope > div')
                            .filter({
                                has: page.getByText('Forecast (estimasi)', {
                                    exact: true,
                                }),
                            });
                        assert(
                            (await forecast.locator('dd').innerText()) ===
                                (isSales ? '1,5' : '3'),
                            `Dashboard forecast: ${role}`,
                        );
                    }
                    await page.screenshot({
                        path: `.playwright-cli/target-role-${role}-${component.replaceAll('/', '-')}-${width}-${theme}.png`,
                        fullPage: true,
                        animations: 'disabled',
                    });
                    checked++;
                }
            }
        }
        assert(errors.length === 0, errors.join('; '));
        assert(writes === 0, 'QA must not submit writes');
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
