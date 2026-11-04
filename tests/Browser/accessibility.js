// Run against a built local app with playwright-cli run-code --filename.
// Documents and mutations are intercepted; only the real app assets are loaded.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function accessibility(page) {
    page.setDefaultTimeout(2500);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const match = template.match(bootstrap);
    if (!match)
        throw new Error('Expected an Inertia document from the local app');
    const initial = JSON.parse(match[2]);
    const user = {
        public_id: 'qa-sales',
        name: 'QA Sales',
        username: 'qa-sales',
        email: 'qa@example.test',
        email_verified_at: '2026-11-01T00:00:00Z',
        role: 'sales',
        is_active: true,
    };
    const customer = {
        public_id: 'qa-customer',
        name: 'Pelanggan QA',
        phone: '+620000000000',
        email: null,
        address: null,
        contact_channel_preference: 'call',
        opt_out: false,
        last_contact_at: null,
        notes: null,
        assigned_sales: {
            public_id: user.public_id,
            name: user.name,
            username: user.username,
        },
        active_deal: {
            id: 1,
            public_id: 'qa-deal',
            vehicle_model: 'Model QA',
            current_stage: 'lead',
            stage_label: 'Lead',
            is_closed: false,
            is_stagnant: false,
            estimated_value: 100000000,
            can_comment: true,
            comments: [
                {
                    id: 1,
                    body: 'Komentar QA',
                    author_name: 'Supervisor QA',
                    created_at: '2026-11-01T00:00:00Z',
                    edited_at: null,
                    can_edit: false,
                    replies: [],
                },
            ],
        },
        next_follow_up: null,
        stage_history: Array.from({ length: 15 }, () => ({
            from_stage: null,
            from_stage_label: null,
            to_stage: 'lead',
            to_stage_label: 'Lead',
            notes: 'Riwayat panjang untuk menguji fokus',
            actor_name: 'QA Sales',
            created_at: '2026-11-01T00:00:00Z',
        })),
        recent_activities: [],
    };
    const customerProps = {
        customers: {
            data: [customer],
            current_page: 1,
            last_page: 2,
            total: 2,
            from: 1,
            to: 1,
            links: [
                { url: '/customers?page=1', label: '1', active: true },
                { url: '/customers?page=2', label: '2', active: false },
            ],
        },
        filters: {
            search: '',
            tab: 'all',
            sort: 'updated_at',
            direction: 'desc',
        },
        counts: {
            all: 2,
            follow_up_today: 0,
            uncontacted: 1,
            active: 1,
            purchased: 0,
            inactive: 0,
            repeat_order: 0,
            referral: 0,
        },
        assignableSales: [
            { id: 1, public_id: 'qa-sales-1', name: 'Sales Alpha' },
            { id: 2, public_id: 'qa-sales-2', name: 'Sales Beta' },
        ],
    };
    let fixture;
    let mutationErrors = {};
    let mutations = 0;
    const tick = () =>
        page.evaluate(
            () =>
                new Promise((r) =>
                    requestAnimationFrame(() => requestAnimationFrame(r)),
                ),
        );
    const assert = (ok, message) => {
        if (!ok) throw new Error(message);
    };
    const focus = () =>
        page.evaluate(
            () =>
                document.activeElement.getAttribute('aria-label') ||
                document.activeElement.textContent?.trim(),
        );
    const settle = (locator) =>
        locator.evaluate(async (e) => {
            await Promise.all(e.getAnimations().map((a) => a.finished));
        });
    const contrast = (locator) =>
        locator.evaluate((e) => {
            const context = document.createElement('canvas').getContext('2d');
            const paint = (color) => {
                context.fillStyle = color;
                context.fillRect(0, 0, 1, 1);
            };
            const luminance = (rgb) => {
                const v = rgb
                    .slice(0, 3)
                    .map((c) => c / 255)
                    .map((c) =>
                        c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
                    );
                return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
            };
            paint('#ffffff');
            const ancestors = [];
            for (let n = e; n; n = n.parentElement) ancestors.unshift(n);
            for (const n of ancestors)
                paint(getComputedStyle(n).backgroundColor);
            const background = [...context.getImageData(0, 0, 1, 1).data];
            paint(getComputedStyle(e).color);
            const text = [...context.getImageData(0, 0, 1, 1).data];
            const v = [luminance(text), luminance(background)].sort(
                (a, b) => b - a,
            );
            return (v[0] + 0.05) / (v[1] + 0.05);
        });
    const results = [];
    const checkTableActions = async (expected) => {
        const controls = page
            .locator('td.table-actions button, td.table-actions a')
            .filter({ visible: true });
        assert(
            (await controls.count()) === expected,
            `Expected ${expected} compact table actions`,
        );
        assert(
            await controls.evaluateAll((elements) =>
                elements.every((element) => {
                    const target = element.getBoundingClientRect();
                    const face = getComputedStyle(element, '::before');
                    return (
                        target.width >= 44 &&
                        target.height >= 44 &&
                        Math.abs(parseFloat(face.height) - 32) <= 0.5 &&
                        parseFloat(getComputedStyle(element).fontSize) === 12
                    );
                }),
            ),
            'Table actions need a 32px visual surface and a 44px hit area',
        );
    };
    const test = async (name, run) => {
        try {
            await run();
            results.push({ name, passed: true });
        } catch (error) {
            results.push({
                name,
                passed: false,
                error: error.message,
            });
        }
    };
    await page.route(`${origin}/**`, async (route) => {
        const request = route.request();
        if (!['GET', 'HEAD'].includes(request.method())) {
            mutations++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: { 'X-Inertia': 'true' },
                body: JSON.stringify({
                    ...fixture,
                    props: { ...fixture.props, errors: mutationErrors },
                }),
            });
        } else if (request.isNavigationRequest()) {
            const json = JSON.stringify(fixture).replaceAll('<', '\\u003c');
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: template.replace(
                    bootstrap,
                    (_, start, _old, end) => start + json + end,
                ),
            });
        } else {
            // Fulfilled documents have no network address space in Chromium.
            // Serve real assets through the same route to avoid loopback CORS failures.
            await route.fulfill({ response: await route.fetch() });
        }
    });
    const load = async (
        component = 'customers/index',
        props = customerProps,
        url = '/customers',
    ) => {
        fixture = {
            ...initial,
            component,
            url,
            props: {
                ...initial.props,
                auth: { user },
                errors: {},
                sidebarOpen: true,
                notifications: [
                    {
                        id: 'qa-notification',
                        data: {
                            title: 'Notifikasi QA',
                            message: 'Pesan QA',
                            url: '/customers',
                        },
                        created_at: '2026-11-01T00:00:00Z',
                    },
                ],
                notificationsUnreadCount: 1,
                ...props,
            },
        };
        mutationErrors = {};
        await page.goto(origin + url);
        await page.locator('h1').first().waitFor();
        await tick();
    };
    const openMenu = async () => {
        await page
            .getByRole('button', { name: 'Buka kontrol panel pengguna' })
            .press('Enter');
        await settle(page.getByRole('menu'));
    };
    const reach = async (name) => {
        for (let i = 0; i < 25; i++) {
            if ((await focus()) === name) return true;
            await page.keyboard.press('ArrowDown');
            await tick();
        }
        return false;
    };
    await page.setViewportSize({ width: 390, height: 844 });
    await test('keyboard can select theme, text size and accent in the user menu', async () => {
        await load();
        await openMenu();
        for (const name of ['Gelap', 'Besar', 'Pilih warna Hijau']) {
            assert(await reach(name), `Keyboard cannot reach ${name}`);
            await page.keyboard.press('Space');
            await tick();
            const expected =
                name === 'Gelap'
                    ? 'appearance'
                    : name === 'Besar'
                      ? 'font-size'
                      : 'color-theme';
            const value =
                name === 'Gelap'
                    ? 'dark'
                    : name === 'Besar'
                      ? 'large'
                      : 'green';
            assert(
                await page.evaluate(
                    ([k, v]) => localStorage.getItem(k) === v,
                    [expected, value],
                ),
                `${name} did not change preference`,
            );
        }
        await page.keyboard.press('Escape');
        await page.getByRole('menu').waitFor({ state: 'hidden' });
        assert(
            (await focus()) === 'Buka kontrol panel pengguna',
            'Menu did not return focus',
        );
    });
    // Each following document starts with the normal light/default preferences.
    await page.evaluate(() => {
        localStorage.clear();
        document.cookie = 'appearance=light;path=/';
    });
    await test('keyboard reaches notification items', async () => {
        await load();
        await page.getByRole('button', { name: /^Notifikasi/ }).press('Enter');
        await tick();
        assert(
            (await focus()).includes('Notifikasi QA'),
            'Notification was skipped by menu keyboard navigation',
        );
        await page.keyboard.press('Escape');
        await page.getByRole('menu').waitFor({ state: 'hidden' });
    });
    await test('mobile contact links have action names', async () => {
        await load();
        assert(
            await page
                .getByRole('link', {
                    name: 'Telepon Pelanggan QA',
                    exact: true,
                })
                .isVisible(),
            'Phone link has no accessible action name',
        );
        assert(
            await page
                .getByRole('link', {
                    name: 'WhatsApp Pelanggan QA',
                    exact: true,
                })
                .isVisible(),
            'WhatsApp link has no accessible action name',
        );
    });
    await test('long detail focuses visible content and returns to its opener', async () => {
        await load();
        const trigger = page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true });
        await trigger.press('Enter');
        const dialog = page.getByRole('dialog');
        await settle(dialog);
        assert(
            await dialog.evaluate((d) => {
                const f = document.activeElement;
                const r = f.getBoundingClientRect();
                return d.contains(f) && r.top >= 0 && r.bottom <= innerHeight;
            }),
            'Initial dialog focus is outside the viewport',
        );
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        assert(
            await trigger.evaluate((e) => e === document.activeElement),
            'Detail did not return focus to its trigger',
        );
    });
    await test('customer detail keeps its action grid readable and visible', async () => {
        const failures = [];
        for (const width of [390, 768, 1440]) {
            for (const font of ['Normal', 'Ekstra']) {
                for (const variant of [
                    {
                        name: '7-aksi',
                        closed: false,
                        assignable: true,
                        count: 7,
                    },
                    {
                        name: '6-aksi',
                        closed: false,
                        assignable: false,
                        count: 6,
                    },
                    {
                        name: '5-aksi',
                        closed: true,
                        assignable: false,
                        count: 5,
                    },
                ]) {
                    await page.setViewportSize({ width, height: 844 });
                    await load('customers/index', {
                        ...customerProps,
                        customers: {
                            ...customerProps.customers,
                            data: [
                                {
                                    ...customer,
                                    active_deal: {
                                        ...customer.active_deal,
                                        is_closed: variant.closed,
                                        current_stage: variant.closed
                                            ? 'delivery'
                                            : 'lead',
                                        stage_label: variant.closed
                                            ? 'Delivery'
                                            : 'Lead',
                                    },
                                },
                            ],
                        },
                        assignableSales: variant.assignable
                            ? customerProps.assignableSales
                            : [],
                    });
                    await openMenu();
                    await page
                        .getByRole('menuitemradio', { name: font, exact: true })
                        .click();
                    await page.keyboard.press('Escape');
                    await page.getByRole('menu').waitFor({ state: 'hidden' });
                    const trigger = page
                        .getByRole('button', { name: 'Detail', exact: true })
                        .filter({ visible: true });
                    await trigger.press('Enter');
                    const dialog = page.getByRole('dialog');
                    await settle(dialog);
                    const metrics = await dialog.evaluate((d) => {
                        const footer = [...d.querySelectorAll('button')].find(
                            (b) =>
                                b.textContent.trim() === 'Buat Transaksi Baru',
                        ).parentElement;
                        const actions = [...footer.children].filter((e) =>
                            e.matches('button,a'),
                        );
                        const outside = (a, b) =>
                            a.left < b.left - 1 ||
                            a.right > b.right + 1 ||
                            a.top < b.top - 1 ||
                            a.bottom > b.bottom + 1;
                        const rect = footer.getBoundingClientRect(),
                            bounds = d.getBoundingClientRect();
                        const issues = [];
                        if (
                            bounds.top < -1 ||
                            bounds.bottom > innerHeight + 1 ||
                            bounds.left < -1 ||
                            bounds.right > innerWidth + 1
                        )
                            issues.push('Dialog keluar viewport');
                        if (outside(rect, bounds))
                            issues.push('Footer keluar dialog');
                        const boxes = actions.map((e) =>
                            e.getBoundingClientRect(),
                        );
                        for (const [index, action] of actions.entries()) {
                            const box = boxes[index],
                                label = action.textContent.trim();
                            if (box.width < 43.9 || box.height < 43.9)
                                issues.push(`Target terlalu kecil: ${label}`);
                            if (outside(box, rect))
                                issues.push(`Tombol keluar footer: ${label}`);
                            const walker = document.createTreeWalker(
                                action,
                                NodeFilter.SHOW_TEXT,
                            );
                            while (walker.nextNode()) {
                                if (!walker.currentNode.textContent.trim())
                                    continue;
                                const range = document.createRange();
                                range.selectNodeContents(walker.currentNode);
                                if (
                                    [...range.getClientRects()].some((r) =>
                                        outside(r, box),
                                    )
                                )
                                    issues.push(`Teks keluar tombol: ${label}`);
                            }
                            if (
                                [...action.querySelectorAll('svg')].some((e) =>
                                    outside(e.getBoundingClientRect(), box),
                                )
                            )
                                issues.push(`Ikon keluar tombol: ${label}`);
                            for (let j = index + 1; j < boxes.length; j++) {
                                const other = boxes[j];
                                if (
                                    Math.min(box.right, other.right) -
                                        Math.max(box.left, other.left) >
                                        0.5 &&
                                    Math.min(box.bottom, other.bottom) -
                                        Math.max(box.top, other.top) >
                                        0.5
                                )
                                    issues.push('Tombol bertumpuk');
                            }
                        }
                        const heading = d.querySelector('h2'),
                            headerTop = heading.getBoundingClientRect().top;
                        const body = [...d.children].find(
                            (e) => getComputedStyle(e).overflowY === 'auto',
                        );
                        if (!body || body.scrollHeight <= body.clientHeight)
                            issues.push(
                                'Riwayat panjang tidak memiliki area scroll',
                            );
                        else {
                            body.scrollTop = body.scrollHeight;
                            if (
                                Math.abs(
                                    footer.getBoundingClientRect().top -
                                        rect.top,
                                ) > 1 ||
                                Math.abs(
                                    heading.getBoundingClientRect().top -
                                        headerTop,
                                ) > 1
                            )
                                issues.push('Header/footer ikut terscroll');
                            if (
                                heading.getBoundingClientRect().top < bounds.top
                            )
                                issues.push('Header tidak terlihat');
                        }
                        return {
                            issues,
                            count: actions.length,
                            columns: new Set(
                                boxes.map((b) => Math.round(b.left)),
                            ).size,
                        };
                    });
                    if (metrics.count !== variant.count)
                        metrics.issues.push('Jumlah aksi berubah');
                    if (metrics.columns !== (width === 390 ? 2 : 3))
                        metrics.issues.push(
                            'Jumlah kolom tidak sesuai viewport',
                        );
                    if (metrics.issues.length)
                        failures.push({
                            width,
                            font,
                            variant: variant.name,
                            issues: metrics.issues,
                        });
                    else if (variant.count === 7)
                        await dialog.screenshot({
                            path: `.playwright-cli/customer-detail-${width}-${font}.png`,
                        });
                    await page.keyboard.press('Escape');
                    await dialog.waitFor({ state: 'hidden' });
                    assert(
                        await trigger.evaluate(
                            (e) => e === document.activeElement,
                        ),
                        'Layout change lost Detail trigger focus',
                    );
                }
            }
        }
        await page.evaluate(() => localStorage.setItem('font-size', 'normal'));
        await page.setViewportSize({ width: 390, height: 844 });
        assert(
            !failures.length,
            `Customer detail layout failures: ${JSON.stringify(failures)}`,
        );
    });
    await test('follow-on dialogs return focus to the original customer action', async () => {
        for (const action of [
            'Catat Aktivitas',
            'Follow-Up',
            'Ubah Tahap',
            'Buat Transaksi Baru',
            'Penugasan Ulang',
        ]) {
            await load();
            const trigger = page
                .getByRole('button', { name: 'Detail', exact: true })
                .filter({ visible: true });
            await trigger.click();
            await settle(page.getByRole('dialog'));
            const nextAction = page
                .getByRole('dialog')
                .getByRole('button', { name: action, exact: true });
            await nextAction.click();
            await page
                .getByRole('heading', { name: 'Pelanggan QA', exact: true })
                .waitFor({ state: 'hidden' });
            await settle(page.getByRole('dialog'));
            await page.keyboard.press('Escape');
            await page.getByRole('dialog').waitFor({ state: 'hidden' });
            assert(
                await trigger.evaluate((e) => e === document.activeElement),
                `${action} lost the original Detail focus`,
            );
        }
        for (const action of ['Catat Aktivitas', 'Follow-Up', 'Ubah Tahap']) {
            await load();
            const trigger = page
                .getByRole('button', { name: action, exact: true })
                .filter({ visible: true });
            await trigger.press('Enter');
            await settle(page.getByRole('dialog'));
            await page.keyboard.press('Escape');
            await page.getByRole('dialog').waitFor({ state: 'hidden' });
            assert(
                await trigger.evaluate((e) => e === document.activeElement),
                `${action} did not restore its direct card trigger`,
            );
        }
    });
    await test('all primary theme pairs and hover states meet normal text contrast', async () => {
        await load();
        await openMenu();
        for (const mode of ['Terang', 'Gelap']) {
            await page
                .getByRole('menuitemradio', { name: mode, exact: true })
                .click();
            for (const color of [
                'Biru',
                'Hijau',
                'Ungu',
                'Merah',
                'Oranye',
                'Teal',
            ]) {
                await page
                    .getByLabel(`Pilih warna ${color}`, { exact: true })
                    .click();
                await page.keyboard.press('Escape');
                await page.getByRole('menu').waitFor({ state: 'hidden' });
                const target = page.getByRole('button', {
                    name: 'Tambah Lead Baru',
                    exact: true,
                });
                await settle(target);
                assert(
                    (await contrast(target)) >= 4.5,
                    `${mode}/${color} normal fails 4.5:1`,
                );
                await target.hover();
                await settle(target);
                assert(
                    (await contrast(target)) >= 4.5,
                    `${mode}/${color} hover fails 4.5:1`,
                );
                await page.mouse.move(0, 0);
                await openMenu();
            }
        }
        await page.keyboard.press('Escape');
    });
    await page.evaluate(() => {
        localStorage.clear();
        document.cookie = 'appearance=light;path=/';
    });
    await test('password visibility toggle follows the password in Tab order', async () => {
        await load(
            'auth/login',
            { auth: { user: null }, canResetPassword: true },
            '/login',
        );
        await page.getByLabel('Password', { exact: true }).focus();
        await page.keyboard.press('Tab');
        assert(
            /password/i.test(await focus()),
            'Tab skips the password visibility button',
        );
        await page.keyboard.press('Space');
        assert(
            (await page
                .getByLabel('Password', { exact: true })
                .getAttribute('type')) === 'text',
            'Keyboard cannot show password',
        );
    });
    await test('combobox exposes active option, empty results and isolated Escape', async () => {
        await load();
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true })
            .click();
        await page
            .getByRole('button', { name: 'Penugasan Ulang', exact: true })
            .click();
        const dialog = page.getByRole('dialog');
        await settle(dialog);
        await page
            .getByRole('combobox', { name: 'Sales tujuan', exact: true })
            .press('Enter');
        const search = page.getByPlaceholder('Cari sales...');
        await search.waitFor();
        await search.press('ArrowDown');
        await tick();
        const active = await search.getAttribute('aria-activedescendant');
        assert(
            active &&
                (await page.locator(`[id="${active}"]`).innerText()) ===
                    'Sales Beta',
            'ArrowDown does not expose the active option',
        );
        await search.fill('no-results-qa');
        await tick();
        assert(
            !(await search.getAttribute('aria-activedescendant')),
            'Empty search refers to a nonexistent option',
        );
        await search.fill('Alpha');
        await search.press('Enter');
        assert(
            (await page
                .getByRole('combobox', { name: 'Sales tujuan', exact: true })
                .innerText()) === 'Sales Alpha',
            'Enter did not select filtered option',
        );
        await page
            .getByRole('combobox', { name: 'Sales tujuan', exact: true })
            .press('Enter');
        await page.getByPlaceholder('Cari sales...').press('Escape');
        await tick();
        assert(
            await dialog.isVisible(),
            'Combobox Escape closed the parent dialog',
        );
        assert(
            !(await page.getByRole('listbox').count()),
            'Escape did not close combobox',
        );
        await page
            .getByRole('combobox', { name: 'Sales tujuan', exact: true })
            .press('Enter');
        await page.getByPlaceholder('Cari sales...').press('Tab');
        await tick();
        assert(
            await page
                .locator('#reassign-notes')
                .evaluate((e) => e === document.activeElement),
            'Tab did not leave combobox for the next field',
        );
    });
    await test('mobile targets are at least 44 by 44 on pages, menus and dialogs', async () => {
        const check = async () => {
            const small = await page
                .locator(
                    'a[href],button,input:not([type=hidden]),select,[role=menuitem],[role=menuitemradio],[role=option]',
                )
                .evaluateAll((es) =>
                    es
                        .filter((e) => {
                            const r = e.getBoundingClientRect();
                            return (
                                r.width > 0 &&
                                r.height > 0 &&
                                !e.disabled &&
                                !e.closest('[aria-hidden=true]')
                            );
                        })
                        .filter((e) => {
                            const r = e.getBoundingClientRect();
                            return r.width < 43.9 || r.height < 43.9;
                        })
                        .map(
                            (e) =>
                                e.getAttribute('aria-label') ||
                                e.textContent ||
                                e.name,
                        ),
                );
            assert(
                !small.length,
                `Small targets: ${small.join(', ').slice(0, 200)}`,
            );
        };
        await load();
        await check();
        await openMenu();
        await check();
        await page.keyboard.press('Escape');
        await page.getByRole('menu').waitFor({ state: 'hidden' });
        await page
            .getByRole('button', { name: 'Tambah Lead Baru', exact: true })
            .click();
        await settle(page.getByRole('dialog'));
        await check();
        await load(
            'auth/login',
            { auth: { user: null }, canResetPassword: true },
            '/login',
        );
        await check();
    });
    await test('customer search retains a label after typing', async () => {
        await load();
        const search = page.getByRole('textbox', {
            name: 'Pencarian pelanggan',
            exact: true,
        });
        assert(
            (await search.count()) === 1,
            'Search relies on placeholder instead of a label',
        );
        await search.fill('QA');
        assert(await search.isVisible(), 'Search is not visible after input');
    });
    await test('login and profile validation messages describe invalid fields', async () => {
        for (const component of ['auth/login', 'settings/profile']) {
            const login = component === 'auth/login';
            await load(
                component,
                { canResetPassword: true, mustVerifyEmail: false },
                login ? '/login' : '/settings/profile',
            );
            mutationErrors = login
                ? { username: 'Kesalahan username QA' }
                : { email: 'Kesalahan email QA' };
            if (login) {
                await page
                    .getByLabel('Username', { exact: true })
                    .fill('qa-user');
                await page
                    .getByLabel('Password', { exact: true })
                    .fill('qa-dummy-not-a-credential');
            }
            await page
                .getByRole('button', {
                    name: login ? 'Masuk' : 'Save',
                    exact: true,
                })
                .click();
            await page
                .getByText(
                    login ? 'Kesalahan username QA' : 'Kesalahan email QA',
                    { exact: true },
                )
                .waitFor();
            const input = page.getByLabel(
                login ? 'Username' : 'Email address',
                { exact: true },
            );
            const state = await input.evaluate((e) => ({
                invalid: e.getAttribute('aria-invalid'),
                message: document.getElementById(
                    e.getAttribute('aria-describedby'),
                )?.textContent,
            }));
            assert(
                state.invalid === 'true' &&
                    state.message?.includes('Kesalahan'),
                `${component} error is not associated with its field`,
            );
            mutationErrors = {};
            await page
                .getByRole('button', {
                    name: login ? 'Masuk' : 'Save',
                    exact: true,
                })
                .click();
            await page
                .getByText(
                    login ? 'Kesalahan username QA' : 'Kesalahan email QA',
                    { exact: true },
                )
                .waitFor({ state: 'hidden' });
            assert(
                !(await input.getAttribute('aria-describedby')),
                'Cleared error still describes the field',
            );
        }
    });
    await test('one main landmark and no page overflow at three widths', async () => {
        for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await load();
            assert(
                (await page.getByRole('main').count()) === 1,
                'Nested main landmarks',
            );
            assert(
                await page.evaluate(
                    () => document.documentElement.scrollWidth === innerWidth,
                ),
                `Page overflow at ${width}`,
            );
        }
    });
    await test('all seven transaction stages have distinct readable badge colors', async () => {
        const stages = [
            ['lead', 'Lead'],
            ['prospect', 'Prospect'],
            ['hot_prospect', 'Hot Prospect'],
            ['spk', 'SPK'],
            ['do', 'DO'],
            ['delivery', 'Delivery'],
            ['lost', 'Lost'],
        ];
        await page.setViewportSize({ width: 390, height: 844 });
        const data = stages.map(([stage, label], index) => ({
            ...customer,
            public_id: `qa-${index}`,
            name: `Pelanggan QA ${index}`,
            active_deal: {
                ...customer.active_deal,
                current_stage: stage,
                stage_label: label,
                is_closed: ['delivery', 'lost'].includes(stage),
            },
        }));
        await load('customers/index', {
            ...customerProps,
            customers: {
                ...customerProps.customers,
                data,
                last_page: 1,
                total: 7,
                from: 1,
                to: 7,
                links: [],
            },
            counts: {
                ...customerProps.counts,
                all: 7,
                uncontacted: 7,
                active: 5,
                purchased: 1,
                inactive: 1,
            },
        });
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 1100 });
            for (const mode of ['light', 'dark']) {
                await openMenu();
                await page
                    .getByRole('menuitemradio', {
                        name: mode === 'dark' ? 'Gelap' : 'Terang',
                        exact: true,
                    })
                    .click();
                await page.keyboard.press('Escape');
                await page.getByRole('menu').waitFor({ state: 'hidden' });
                const backgrounds = [];
                for (const [, label] of stages) {
                    const badge = page
                        .getByText(label, { exact: true })
                        .filter({ visible: true });
                    await settle(badge);
                    backgrounds.push(
                        await badge.evaluate(
                            (e) => getComputedStyle(e).backgroundColor,
                        ),
                    );
                    assert(
                        (await contrast(badge)) >= 4.5,
                        `${mode}/${label} badge fails 4.5:1`,
                    );
                    if (mode === 'dark' && label === 'Lost') {
                        assert(
                            await badge.evaluate((element) => {
                                const context = document
                                    .createElement('canvas')
                                    .getContext('2d');
                                const style = getComputedStyle(element);
                                return [
                                    style.backgroundColor,
                                    style.borderTopColor,
                                ].every((color) => {
                                    context.fillStyle = color;
                                    context.fillRect(0, 0, 1, 1);
                                    const rgb = [
                                        ...context.getImageData(0, 0, 1, 1)
                                            .data,
                                    ]
                                        .slice(0, 3)
                                        .map((channel) => channel / 255);
                                    const max = Math.max(...rgb);
                                    const min = Math.min(...rgb);
                                    const lightness = (max + min) / 2;
                                    const saturation =
                                        max === min
                                            ? 0
                                            : (max - min) /
                                              (1 - Math.abs(2 * lightness - 1));
                                    return saturation <= 0.3;
                                });
                            }),
                            'Dark Lost background and border should use a muted red',
                        );
                        assert(
                            (await contrast(badge)) <= 9,
                            'Dark Lost text should avoid excessive brightness',
                        );
                    }
                }
                assert(
                    new Set(backgrounds).size === 7,
                    'Stages do not have seven distinct badge colors',
                );
                if (width === 1440)
                    await page.screenshot({
                        path: `.playwright-cli/stage-badges-${mode}.png`,
                        fullPage: true,
                    });
            }
        }
    });
    await test('data rows alternate in both themes and reset for filtered and paginated results', async () => {
        for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 1100 });
            for (const mode of ['light', 'dark']) {
                for (const [count, currentPage, search] of [
                    [3, 1, ''],
                    [3, 2, ''],
                    [1, 1, 'QA'],
                    [0, 1, 'Tidak ada'],
                ]) {
                    await load('customers/index', {
                        ...customerProps,
                        filters: { ...customerProps.filters, search },
                        customers: {
                            ...customerProps.customers,
                            current_page: currentPage,
                            data: Array.from({ length: count }, (_, index) => ({
                                ...customer,
                                public_id: `stripe-${currentPage}-${index}`,
                                name: `Pelanggan QA ${index}`,
                            })),
                        },
                    });
                    await page.evaluate((theme) => {
                        document.documentElement.classList.toggle(
                            'dark',
                            theme === 'dark',
                        );
                    }, mode);
                    const rows = page
                        .locator('.striped-row')
                        .filter({ visible: true });
                    await page.mouse.move(0, 0);
                    await tick();
                    for (const row of await rows.all()) await settle(row);
                    if (width === 1440) await checkTableActions(count * 4);
                    assert(
                        (await rows.count()) === count,
                        `${width}/${mode}: expected ${count} visible data rows`,
                    );
                    for (let index = 0; index < count; index++) {
                        const row = rows.nth(index);
                        assert(
                            await row.evaluate(
                                (element, odd) => {
                                    const probe =
                                        document.createElement('span');
                                    probe.style.backgroundColor = `var(--${odd ? 'muted' : 'card'})`;
                                    element.append(probe);
                                    const expected =
                                        getComputedStyle(probe).backgroundColor;
                                    probe.remove();
                                    return (
                                        getComputedStyle(element)
                                            .backgroundColor === expected
                                    );
                                },
                                index % 2 === 1,
                            ),
                            `${width}/${mode}: incorrect background on row ${index}`,
                        );
                        assert(
                            (await contrast(
                                row.locator('h3, .font-semibold').first(),
                            )) >= 4.5,
                            `${width}/${mode}: row text fails contrast`,
                        );
                    }
                    assert(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth ===
                                innerWidth,
                        ),
                        `Striped rows overflow at ${width}`,
                    );
                    if (count === 3 && currentPage === 1)
                        await page.screenshot({
                            path: `.playwright-cli/striped-rows-${width}-${mode}.png`,
                            fullPage: true,
                        });
                    if (count > 1) {
                        const row = rows.nth(1);
                        await row.hover();
                        await settle(row);
                        assert(
                            await row.evaluate((element) => {
                                const probe = document.createElement('span');
                                probe.style.backgroundColor = 'var(--accent)';
                                element.append(probe);
                                const expected =
                                    getComputedStyle(probe).backgroundColor;
                                probe.remove();
                                return (
                                    getComputedStyle(element)
                                        .backgroundColor === expected
                                );
                            }),
                            `${width}/${mode}: hover must override the stripe`,
                        );
                    }
                }
            }
        }
    });
    await test('all data tables and their mobile lists share alternating surfaces', async () => {
        const three = (make) =>
            Array.from({ length: 3 }, (_, index) => make(index));
        const createdAt = '2026-11-01T00:00:00Z';
        /** @type {Array<[string, Record<string, unknown>, number]>} */
        const cases = [
            [
                'transactions/index',
                {
                    transactions: {
                        data: three((id) => ({
                            id,
                            public_id: `qa-${id}`,
                            customer: {
                                name: `QA ${id}`,
                                phone: '+620000000000',
                            },
                            sales: null,
                            vehicle_model: 'Model QA',
                            source: 'walk_in',
                            current_stage: 'lead',
                            stage_label: 'Lead',
                            estimated_value: null,
                            is_stagnant: false,
                            last_activity_at: null,
                            created_at: createdAt,
                            can_update: true,
                        })),
                        links: [],
                    },
                    filters: {
                        search: '',
                        stage: '',
                        tab: 'all',
                        sales_id: null,
                    },
                    assignableSales: [],
                    stages: [],
                    lostReasons: [],
                },
                3,
            ],
            [
                'dashboard',
                {
                    dashboard: {
                        period: '2026-11',
                        targetUnits: 10,
                        realizationUnits: 2,
                        forecastUnits: 5,
                        forecastValue: 0,
                        forecastApproved: true,
                        gapUnits: 5,
                        stageCounts: { lead: 3 },
                        stagnantCount: 0,
                        contributors: three((id) => ({
                            public_id: `qa-${id}`,
                            vehicle_model: 'Model QA',
                            stage_label: 'Lead',
                            sales_name: 'Sales QA',
                            weighted_value: 0,
                        })),
                        performance: three((id) => ({
                            id,
                            name: `Sales QA ${id}`,
                            username: `qa-${id}`,
                            target_units: 3,
                            realization_units: 1,
                            gap_units: 2,
                        })),
                    },
                    targetableUsers: [],
                },
                6,
            ],
            [
                'analytics/index',
                {
                    analytics: {
                        period: '2026-11',
                        mode: 'acquisition',
                        dimension: 'source',
                        value: 'walk_in',
                        sources: three((id) => ({
                            source: `source_${id}`,
                            total: 3,
                            share: 33,
                            spk: 1,
                            do: 1,
                            delivery: 1,
                            conversion: 33,
                        })),
                        models: three((id) => ({
                            model: `Model ${id}`,
                            total: 3,
                            share: 33,
                            spk: 1,
                            do: 1,
                            delivery: 1,
                        })),
                        drilldown: three((id) => ({
                            public_id: `qa-${id}`,
                            vehicle_model: 'Model QA',
                            source: 'walk_in',
                            stage: 'lead',
                            stage_label: 'Lead',
                            sales_name: 'Sales QA',
                            created_at: createdAt,
                        })),
                    },
                },
                9,
            ],
            [
                'admin/users/index',
                {
                    users: three((id) => ({
                        id: `qa-${id}`,
                        name: `QA ${id}`,
                        username: `qa-${id}`,
                        email: 'qa@example.test',
                        role: 'sales',
                        status: 'active',
                        is_self: false,
                    })).slice(0, 2),
                    invitations: [
                        {
                            id: 'qa-invite',
                            name: 'Undangan QA',
                            username: 'qa-invite',
                            email: 'invite@example.test',
                            role: 'sales',
                            status: 'valid',
                            expires_at: createdAt,
                        },
                    ],
                    teams: [],
                    filters: { q: '', status: 'all' },
                },
                3,
            ],
            [
                'imports/index',
                {
                    batches: three((id) => ({
                        id,
                        original_filename: `qa-${id}.csv`,
                        status: 'preview',
                        total_rows: 3,
                        accepted_count: 2,
                        rejected_count: 1,
                        created_at: createdAt,
                        actor_name: 'QA',
                    })),
                    preview: {
                        batch_id: 1,
                        filename: 'qa.csv',
                        accepted_count: 2,
                        rejected_count: 1,
                        rows: three((id) => ({
                            row_number: id + 1,
                            data: {
                                name: `QA ${id}`,
                                phone: '+620000000000',
                                vehicle_model: 'Model QA',
                                sales_username: 'qa-sales',
                            },
                            valid: id !== 1,
                            errors: id === 1 ? ['Nomor tidak valid'] : [],
                        })),
                    },
                },
                6,
            ],
        ];
        for (const [component, props, count] of cases) {
            await load(component, {
                ...props,
                auth: { user: { ...user, role: 'admin' } },
            });
            for (const width of [390, 768, 1440]) {
                await page.setViewportSize({ width, height: 1100 });
                for (const mode of ['light', 'dark']) {
                    await page.evaluate(
                        (theme) =>
                            document.documentElement.classList.toggle(
                                'dark',
                                theme === 'dark',
                            ),
                        mode,
                    );
                    const rows = page
                        .locator('.striped-row')
                        .filter({ visible: true });
                    if (width >= 768) {
                        const actionCounts = {
                            'transactions/index': 3,
                            'analytics/index': width >= 1024 ? 6 : 0,
                            'admin/users/index': 4,
                        };
                        await checkTableActions(actionCounts[component] ?? 0);
                        if (width === 1440 && actionCounts[component]) {
                            await page
                                .locator('table')
                                .filter({ visible: true })
                                .first()
                                .screenshot({
                                    path: `.playwright-cli/quiet-table-${component.replaceAll('/', '-')}-${mode}.png`,
                                });
                        }
                    }
                    assert(
                        (await rows.count()) === count,
                        `${component}/${width}: expected ${count} rows`,
                    );
                    assert(
                        await rows.evaluateAll((elements) =>
                            elements.every((element) => {
                                const siblings = Array.from(
                                    element.parentElement.children,
                                ).filter((sibling) =>
                                    sibling.classList.contains('striped-row'),
                                );
                                const probe = document.createElement('span');
                                probe.style.backgroundColor = `var(--${siblings.indexOf(element) % 2 ? 'muted' : 'card'})`;
                                element.append(probe);
                                const expected =
                                    getComputedStyle(probe).backgroundColor;
                                probe.remove();
                                return (
                                    getComputedStyle(element)
                                        .backgroundColor === expected
                                );
                            }),
                        ),
                        `${component}/${width}/${mode}: incorrect stripe surfaces`,
                    );
                    assert(
                        await page.evaluate(
                            () =>
                                document.documentElement.scrollWidth ===
                                innerWidth,
                        ),
                        `${component}/${width}: page overflow`,
                    );
                }
            }
        }
    });
    await test('G01 notification links open coaching with immutable stage labels and read-only admin controls', async () => {
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 1100 });
            for (const role of ['admin', 'sales']) {
                const props = {
                    ...customerProps,
                    auth: { user: { ...user, role } },
                    customers: {
                        ...customerProps.customers,
                        data: [
                            {
                                ...customer,
                                active_deal: {
                                    ...customer.active_deal,
                                    current_stage: 'hot_prospect',
                                    stage_label: 'Hot Prospect',
                                    can_comment: role === 'sales',
                                    comments: [
                                        {
                                            ...customer.active_deal.comments[0],
                                            stage_at_creation: 'prospect',
                                            stage_at_creation_label: 'Prospect',
                                            replies: [
                                                {
                                                    id: 2,
                                                    body: 'Balasan QA',
                                                    author_name: 'QA Sales',
                                                    created_at:
                                                        '2026-11-01T00:01:00Z',
                                                    edited_at: null,
                                                    can_edit: false,
                                                    stage_at_creation: null,
                                                    stage_at_creation_label:
                                                        null,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                };
                await load('customers/index', props);
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .filter({ visible: true })
                    .press('Enter');
                const dialog = page.getByRole('dialog');
                await dialog.waitFor({ state: 'visible' });
                assert(
                    (await dialog
                        .getByText('Saat dikirim: Prospect', { exact: true })
                        .count()) === 1,
                    'Missing original stage metadata',
                );
                assert(
                    (await dialog
                        .getByText('Tahap saat kirim belum tercatat', {
                            exact: true,
                        })
                        .count()) === 1,
                    'Legacy stage must stay unknown',
                );
                assert(
                    (await dialog
                        .getByRole('button', {
                            name: 'Kirim Komentar',
                            exact: true,
                        })
                        .count()) === (role === 'sales' ? 1 : 0),
                    'Admin must have no comment composer',
                );
                assert(
                    (await dialog
                        .getByRole('button', { name: 'Balas', exact: true })
                        .count()) === (role === 'sales' ? 1 : 0),
                    'Admin must have no reply control',
                );
                await page.keyboard.press('Escape');
                await dialog.waitFor({ state: 'hidden' });
                assert(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth === innerWidth,
                    ),
                    `G01 overflow at ${width}`,
                );
                await load(
                    'transactions/coaching',
                    {
                        auth: props.auth,
                        transaction: props.customers.data[0].active_deal,
                    },
                    '/transactions/qa-deal/coaching',
                );
                assert(
                    (await page
                        .getByText('Saat dikirim: Prospect', { exact: true })
                        .count()) === 1,
                    'Coaching link must show original stage',
                );
                assert(
                    (await page
                        .getByText('Tahap saat kirim belum tercatat', {
                            exact: true,
                        })
                        .count()) === 1,
                    'Coaching link must preserve unknown legacy stage',
                );
                assert(
                    (await page
                        .getByRole('button', { name: 'Balas', exact: true })
                        .count()) === (role === 'sales' ? 1 : 0),
                    'Only root comments can have a reply control',
                );
                assert(
                    (await page
                        .getByRole('button', {
                            name: 'Kirim Komentar',
                            exact: true,
                        })
                        .count()) === (role === 'sales' ? 1 : 0),
                    'Coaching page must honor write capabilities',
                );
                if (role === 'sales') {
                    await page
                        .getByRole('button', { name: 'Balas', exact: true })
                        .click();
                    const input = page.getByRole('textbox', {
                        name: 'Balas komentar',
                    });
                    assert(
                        await input.evaluate(
                            (element) => element === document.activeElement,
                        ),
                        'Reply must focus the composer',
                    );
                    await input.fill('Balasan sintetis');
                    mutationErrors = { body: 'Pesan uji tidak valid' };
                    await page
                        .getByRole('button', {
                            name: 'Kirim Komentar',
                            exact: true,
                        })
                        .click();
                    await page
                        .getByRole('alert')
                        .filter({ hasText: 'Pesan uji tidak valid' })
                        .waitFor();
                    assert(
                        (await input.getAttribute('aria-invalid')) === 'true',
                        'Coaching validation must mark the input invalid',
                    );
                    mutationErrors = {};
                    await page
                        .getByRole('button', {
                            name: 'Kirim Komentar',
                            exact: true,
                        })
                        .click();
                    await page
                        .getByRole('textbox', { name: 'Komentar baru' })
                        .waitFor();
                }
                assert(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth === innerWidth,
                    ),
                    `Coaching page overflow at ${width}`,
                );
                await page.screenshot({
                    path: `.playwright-cli/g01-coaching-${role}-${width}.png`,
                    fullPage: true,
                });
            }
        }
    });
    await page.unrouteAll({ behavior: 'wait' });
    await page.goto(`${origin}/login`);
    const report = {
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        interceptedMutations: mutations,
        results,
    };
    if (report.failed)
        throw new Error(`Accessibility regressions: ${JSON.stringify(report)}`);
    return report;
}
