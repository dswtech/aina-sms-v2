// Run: playwright-cli run-code --filename tests/Browser/target-reminder.js
// Uses synthetic Inertia documents and real assets. Every mutation is blocked.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function targetReminder(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const errors = [];
    let writes = 0;
    let role = 'supervisor';
    let userId = 'qa-spv-1';
    let rangeError = null;
    page.on('pageerror', (error) => errors.push(error.message));
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
    const row = (id, name, target, benchmark = null) => ({
        id,
        name,
        cells: Object.fromEntries(
            months.map((month, index) => [
                month,
                {
                    expected: index !== 0,
                    target_units: index < 2 ? null : target,
                    benchmark_units: index < 2 ? null : benchmark,
                    realization_units: index,
                    achievement_percent: index < 2 ? null : 50,
                    benchmark_achievement_percent:
                        benchmark === null || index < 2 ? null : 40,
                },
            ]),
        ),
        average: { achievement_percent: 46.67, benchmark_achievement_percent: null },
    });
    const teams = Array.from({ length: 12 }, (_, index) => ({
        ...row(`team-${index}`, `Tim Panjang Sekali QA ${index}`, 10, 12),
        is_active: true,
        sales: [row(index * 2 + 1, 'Sales Alpha QA', 5.5)],
    }));
    const fixture = (pathname) => ({
        ...initial,
        component: 'analytics/target-history',
        url: pathname,
        props: {
            ...initial.props,
            auth: {
                user: {
                    public_id: userId,
                    name: 'QA',
                    username: 'qa',
                    email: 'qa@example.test',
                    email_verified_at: null,
                    role,
                    is_active: true,
                },
                impersonator: null,
            },
            errors: rangeError ? { to: rangeError } : {},
            notifications: [],
            notificationsUnreadCount: 0,
            sidebarOpen: true,
            targetReminder:
                role === 'supervisor'
                    ? {
                          today: '2026-11-24',
                          period: '2026-11',
                          teams: [
                              {
                                  id: 'team-0',
                                  name: 'Tim QA',
                                  reason: 'missing_target',
                                  unallocated_count: 0,
                              },
                          ],
                      }
                    : null,
            report: {
                from: '2026-06',
                to: '2026-11',
                currentMonth: '2026-11',
                months,
                averageMonths: ['2026-08', '2026-09', '2026-10'],
                dealer:
                    role === 'branch_manager' ? row('dealer', 'Total dealer', 120) : null,
                unassigned: null,
                teams,
            },
        },
    });
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET') {
            writes++;
            return route.abort();
        }
        if (request.isNavigationRequest()) {
            const { pathname } = new URL(request.url());
            const json = JSON.stringify(fixture(pathname)).replaceAll('<', '\\u003c');
            return route.fulfill({
                contentType: 'text/html',
                body: template.replace(bootstrap, (_, a, _b, c) => a + json + c),
            });
        }
        return route.fulfill({ response: await route.fetch() });
    });
    const reminder = page.locator('[data-target-reminder]');
    const open = async (path = '/analytics/target-history') => {
        await page.goto(`${origin}${path}`);
        await page.getByRole('heading', { level: 1 }).waitFor();
    };
    const noOverflow = async (label) =>
        assert(
            await page.evaluate(
                () =>
                    document.documentElement.scrollWidth <=
                    document.documentElement.clientWidth,
            ),
            `${label}: page scrolls sideways`,
        );
    try {
        // Desktop: the card stays in the corner and the page keeps working.
        await page.setViewportSize({ width: 1280, height: 800 });
        await open();
        await reminder.waitFor();
        assert(
            (await reminder.innerText()).includes(
                'Target Tim QA bulan ini belum diisi.',
            ),
            'reminder names the team',
        );
        assert(
            !(await reminder.evaluate((node) =>
                node.contains(document.activeElement),
            )),
            'reminder takes no focus',
        );
        const toggle = page.getByRole('button', {
            name: 'Tim Panjang Sekali QA 0',
        });
        assert(
            (await toggle.getAttribute('aria-expanded')) === 'true',
            'supervisor starts expanded',
        );
        assert(
            await toggle.evaluate(
                (node) => node.scrollHeight <= node.clientHeight + 1,
            ),
            'a long team name fits its toggle',
        );
        await toggle.click();
        assert(
            (await toggle.getAttribute('aria-expanded')) === 'false',
            'page controls work under the reminder',
        );
        const firstRow = page.locator('tbody tr').first().locator('td');
        assert(
            (await firstRow.nth(0).innerText()).trim() === '–',
            'a month that owes no target is not called unfilled',
        );
        assert(
            (await firstRow.nth(1).innerText()).includes('Belum diisi'),
            'a month that owes a target is called unfilled',
        );
        assert(
            (await firstRow.last().innerText()).includes('46,67%'),
            'percentages keep the dashboard precision',
        );
        // Everything can scroll clear of the fixed card.
        await page.evaluate(() =>
            window.scrollTo(0, document.documentElement.scrollHeight),
        );
        const lastRow = await page.locator('tbody tr').last().boundingBox();
        const card = await reminder.boundingBox();
        assert(
            lastRow.y + lastRow.height <= card.y,
            'last row scrolls clear of the reminder',
        );
        await noOverflow('desktop');

        // The page where targets are filled in never shows it.
        await open('/targets/plans');
        assert((await reminder.count()) === 0, 'hidden on the plan page');

        // Phone: in the flow, so nothing is covered.
        await page.setViewportSize({ width: 390, height: 844 });
        await open();
        await reminder.waitFor();
        const phoneCard = await reminder.boundingBox();
        const heading = await page
            .getByRole('heading', { level: 1 })
            .boundingBox();
        assert(
            phoneCard.y + phoneCard.height <= heading.y,
            'phone reminder sits above the content',
        );
        assert(
            (await reminder.evaluate(
                (node) => getComputedStyle(node).position,
            )) === 'static',
            'phone reminder is in the flow',
        );
        await noOverflow('phone');
        for (const control of [
            page.getByRole('button', { name: 'Tutup pengingat target' }),
            page.getByRole('link', { name: 'Isi target' }),
        ]) {
            const box = await control.boundingBox();
            assert(box.width >= 44 && box.height >= 44, 'touch target is 44px');
        }

        // Dismissed for the rest of the day, for this user only.
        await page
            .getByRole('button', { name: 'Tutup pengingat target' })
            .click();
        await reminder.waitFor({ state: 'detached' });
        await page.reload();
        await page.getByRole('heading', { level: 1 }).waitFor();
        assert((await reminder.count()) === 0, 'stays dismissed after reload');
        userId = 'qa-spv-2';
        await open();
        await reminder.waitFor();

        // Blocked storage must not break the page.
        await page.addInitScript(() => {
            const get = Storage.prototype.getItem;
            Storage.prototype.getItem = function (key) {
                if (key.startsWith('target-reminder')) throw new Error('blocked');
                return get.call(this, key);
            };
            const set = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
                if (key.startsWith('target-reminder')) throw new Error('blocked');
                return set.call(this, key, value);
            };
        });
        await open();
        await page
            .getByRole('button', { name: 'Tutup pengingat target' })
            .click();
        await reminder.waitFor({ state: 'detached' });

        // Branch Manager: report only, teams collapsed.
        role = 'branch_manager';
        userId = 'qa-bm';
        await open();
        assert((await reminder.count()) === 0, 'branch manager gets no reminder');
        assert(
            (await toggle.getAttribute('aria-expanded')) === 'false',
            'branch manager starts collapsed',
        );
        await page.getByText('Total dealer').waitFor();
        rangeError = 'Rentang maksimal 24 bulan.';
        await open();
        await page
            .getByRole('alert')
            .filter({ hasText: rangeError })
            .waitFor();
        await noOverflow('branch manager phone');

        assert(writes === 0, 'no writes');
        assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
        return 'target-reminder: ok';
    } finally {
        await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
}
