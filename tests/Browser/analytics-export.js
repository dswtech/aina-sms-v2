// Run: playwright-cli -s=g10 run-code --filename tests/Browser/analytics-export.js
// Real assets with synthetic aggregate props; no business writes.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function analyticsExport(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const errors = [];
    let writes = 0;
    let fixture;
    const checked = [];
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET') {
            writes++;
            return route.abort();
        }
        if (request.isNavigationRequest()) {
            return route.fulfill({
                contentType: 'text/html',
                body: template.replace(
                    bootstrap,
                    (_, a, _b, c) =>
                        a +
                        JSON.stringify(fixture).replaceAll('<', '\\u003c') +
                        c,
                ),
            });
        }
        return route.fulfill({ response: await route.fetch() });
    });
    try {
        for (const variant of ['regular', 'empty', 'long']) {
            for (const mode of ['acquisition', 'achievement']) {
                for (const theme of ['light', 'dark']) {
                    const count =
                        variant === 'empty' ? 0 : variant === 'long' ? 42 : 2;
                    const sources = Array.from({ length: count }, (_, i) => ({
                        source:
                            variant === 'long'
                                ? `Category ${i + 1} ${'long-unbroken-label'.repeat(8)}`
                                : ['walk_in', 'referral'][i],
                        total: 4,
                        share: 50,
                        spk: 3,
                        do: 2,
                        delivery: 1,
                        conversion: mode === 'acquisition' ? 25 : null,
                    }));
                    const models = sources.map((row, i) => ({
                        ...row,
                        model:
                            variant === 'long'
                                ? `Model ${i + 1} ${'long-model'.repeat(14)}`
                                : ['Model A', 'Model B'][i],
                    }));
                    fixture = {
                        ...initial,
                        component: 'analytics/index',
                        url: '/analytics',
                        props: {
                            ...initial.props,
                            errors: {},
                            sidebarOpen: true,
                            notifications: [],
                            notificationsUnreadCount: 0,
                            auth: {
                                user: {
                                    public_id: 'qa-export',
                                    name: 'PRIVATE_OPERATOR',
                                    username: 'qa.export',
                                    email: 'qa@example.test',
                                    role: 'branch_manager',
                                    is_active: true,
                                },
                            },
                            analytics: {
                                period: '2026-11',
                                mode,
                                dimension: 'source',
                                value: 'walk_in',
                                sources,
                                models,
                                drilldown: [
                                    {
                                        public_id: 'private-deal',
                                        vehicle_model: 'PRIVATE_DRILLDOWN',
                                        source: 'walk_in',
                                        stage: 'lead',
                                        stage_label: 'Lead',
                                        sales_name: 'PRIVATE_SALES',
                                        created_at: '2026-11-01T00:00:00Z',
                                    },
                                ],
                            },
                        },
                    };
                    await page.setViewportSize({
                        width: variant === 'long' ? 1440 : 390,
                        height: 1000,
                    });
                    await page.emulateMedia({ media: 'screen' });
                    await page.addInitScript(
                        (value) => localStorage.setItem('appearance', value),
                        theme,
                    );
                    await page.goto(`${origin}/analytics`);
                    await page
                        .getByRole('heading', { name: 'Analisis', exact: true })
                        .waitFor();
                    await page.evaluate(() => document.fonts.ready);
                    assert(
                        (await page
                            .getByRole('link', { name: 'Unduh CSV' })
                            .getAttribute('href')) ===
                            `/analytics/export.csv?period=2026-11&mode=${mode}`,
                        'CSV filter query',
                    );
                    await page.evaluate(() => {
                        window.__printCalls = 0;
                        window.print = () => window.__printCalls++;
                    });
                    await page
                        .getByRole('button', {
                            name: 'Simpan sebagai PDF melalui dialog cetak browser',
                        })
                        .click();
                    assert(
                        (await page.evaluate(() => window.__printCalls)) === 1,
                        'Print button',
                    );
                    await page.emulateMedia({ media: 'print' });
                    await page.setViewportSize({ width: 718, height: 1000 });
                    const printed = await page.locator('body').innerText();
                    assert(
                        printed.includes('November 2026') &&
                            printed.includes(
                                mode === 'acquisition'
                                    ? 'Akuisisi'
                                    : 'Pencapaian',
                            ),
                        'Printed filter context',
                    );
                    assert(
                        !printed.includes('PRIVATE_'),
                        'Print exposes navigation, operator or drilldown',
                    );
                    assert(
                        await page
                            .locator('#analisis-sumber table')
                            .isVisible(),
                        'Source print table',
                    );
                    assert(
                        await page.locator('#analisis-model table').isVisible(),
                        'Model print table',
                    );
                    const cells = await page
                        .locator('#analisis-sumber tbody tr')
                        .count();
                    assert(
                        cells === Math.max(1, count),
                        'Printed source row count',
                    );
                    const geometry = await page.evaluate(
                        () =>
                            [
                                ...document.querySelectorAll(
                                    '#analisis-sumber td, #analisis-model td',
                                ),
                            ].filter((el) => {
                                const rect = el.getBoundingClientRect();
                                return (
                                    rect.width > 0 &&
                                    (el.scrollWidth > el.clientWidth + 1 ||
                                        rect.right > innerWidth + 1)
                                );
                            }).length,
                    );
                    assert(geometry === 0, 'Print table clips content');
                    const color = await page
                        .locator('#analisis-sumber')
                        .evaluate((el) => getComputedStyle(el).color);
                    assert(
                        !color.includes('0.985') &&
                            color !== 'rgb(255, 255, 255)',
                        'Dark text on print paper',
                    );
                    const darkSurfaces = await page
                        .locator('.analytics-print')
                        .evaluate((el) => {
                            const nodes = [...el.querySelectorAll('tr')];
                            for (
                                let parent = el;
                                parent;
                                parent = parent.parentElement
                            )
                                nodes.push(parent);
                            return nodes
                                .map((node) => ({
                                    element:
                                        node.tagName + '.' + node.className,
                                    bg: getComputedStyle(node).backgroundColor,
                                }))
                                .filter(
                                    ({ bg }) =>
                                        bg === 'rgb(15, 23, 42)' ||
                                        bg === 'rgb(23, 32, 51)' ||
                                        bg.includes('0.145'),
                                );
                        });
                    assert(
                        darkSurfaces.length === 0,
                        'Dark print surfaces: ' + JSON.stringify(darkSurfaces),
                    );
                    if (variant !== 'regular' || theme === 'dark') {
                        await page.pdf({
                            path: `.playwright-cli/g10-${variant}-${mode}-${theme}.pdf`,
                            format: 'A4',
                            printBackground: true,
                        });
                    }
                    await page.screenshot({
                        path: `.playwright-cli/g10-print-${variant}-${mode}-${theme}.png`,
                        fullPage: variant !== 'long',
                        animations: 'disabled',
                    });
                    checked.push(`${variant}/${mode}/${theme}`);
                }
            }
        }
        assert(errors.length === 0, errors.join('; '));
        assert(writes === 0, 'Unexpected mutations');
        return { checked, browserErrors: errors, businessWrites: writes };
    } finally {
        await page.emulateMedia({ media: 'screen' });
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto(`${origin}/login`);
    }
}
