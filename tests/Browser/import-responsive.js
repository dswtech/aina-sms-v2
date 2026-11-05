// Run: playwright-cli -s=g08 run-code --filename tests/Browser/import-responsive.js
// Real application assets, synthetic documents; all writes are intercepted.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function importResponsive(page) {
    page.setDefaultTimeout(5000);
    const origin = new URL(page.url()).origin;
    const template = await (await page.request.get(`${origin}/login`)).text();
    const bootstrap = /(<script\b[^>]*data-page[^>]*>)([\s\S]*?)(<\/script>)/;
    const initial = JSON.parse(template.match(bootstrap)[2]);
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    const longName = 'Pelanggan ' + 'nama-panjang'.repeat(14);
    const longModel = 'Model ' + 'kendaraan-panjang'.repeat(12);
    const longFile = 'batch-' + 'nama-file-panjang'.repeat(16) + '.csv';
    const rowError = 'Nomor telepon tidak valid: ' + 'pesan-panjang'.repeat(12);
    let fixture;
    let releaseWrite;
    let pendingWrite;
    const writes = [];
    const assert = (value, message) => {
        if (!value) throw new Error(message);
    };
    const makeFixture = (variant = 'full') => ({
        ...initial,
        component: 'imports/index',
        url: '/imports',
        props: {
            ...initial.props,
            errors:
                variant === 'error' ? { file: 'CSV harus diperbaiki.' } : {},
            notifications: [],
            notificationsUnreadCount: 0,
            sidebarOpen: true,
            auth: {
                user: {
                    public_id: 'qa-import-admin',
                    name: 'Admin QA',
                    username: 'qa-import-admin',
                    email: 'qa@example.test',
                    email_verified_at: '2026-11-01T00:00:00Z',
                    role: 'admin',
                    is_active: true,
                },
            },
            preview: ['empty', 'error'].includes(variant)
                ? null
                : {
                      batch_id: 77,
                      filename: longFile,
                      accepted_count: variant === 'invalid' ? 0 : 1,
                      rejected_count: variant === 'invalid' ? 2 : 1,
                      rows: [
                          {
                              row_number: 2,
                              data: {
                                  name: longName,
                                  phone: '+6281234567890',
                                  vehicle_model: longModel,
                                  sales_username: 'sales.qa',
                              },
                              valid: variant !== 'invalid',
                              errors: variant === 'invalid' ? [rowError] : [],
                          },
                          {
                              row_number: 3,
                              data: {
                                  name: 'Pelanggan ditolak QA',
                                  phone: 'nomor-tidak-valid',
                                  vehicle_model: 'Model QA kedua',
                                  sales_username: 'sales.qa.kedua',
                              },
                              valid: false,
                              errors: [rowError, 'Sales tidak aktif.'],
                          },
                      ],
                  },
            batches:
                variant === 'empty'
                    ? []
                    : [
                          {
                              id: 77,
                              original_filename: longFile,
                              status: 'completed',
                              total_rows: 2,
                              accepted_count: 1,
                              rejected_count: 1,
                              created_at: '2026-11-05T03:10:00Z',
                              actor_name: 'Admin Import QA',
                          },
                      ],
        },
    });
    await page.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() !== 'GET') {
            writes.push(new URL(request.url()).pathname);
            if (
                !['/imports/preview', '/imports/77/commit'].includes(
                    writes.at(-1),
                )
            )
                throw new Error('Unexpected write');
            pendingWrite = new Promise((resolve) => {
                releaseWrite = resolve;
            });
            await pendingWrite;
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
                fixture = makeFixture();
                await page.goto(`${origin}/imports`);
                await page
                    .getByRole('heading', { name: 'Import Data', exact: true })
                    .waitFor();
                const preview = page.getByRole('region', {
                    name: 'Preview impor',
                });
                const history = page.getByRole('region', {
                    name: 'Riwayat batch impor',
                });
                await preview.waitFor();
                const row =
                    width < 768
                        ? preview
                              .getByRole('listitem')
                              .filter({ hasText: 'Pelanggan ditolak QA' })
                        : preview
                              .getByRole('row')
                              .filter({ hasText: 'Pelanggan ditolak QA' });
                assert(
                    await row.isVisible(),
                    `Import row visible at ${width}/${theme}`,
                );
                for (const text of [
                    'Pelanggan ditolak QA',
                    'nomor-tidak-valid',
                    'Model QA kedua',
                    'sales.qa.kedua',
                    rowError,
                    'Sales tidak aktif.',
                ]) {
                    assert(
                        await row.getByText(text, { exact: true }).isVisible(),
                        `Missing row field ${text}`,
                    );
                }
                for (const text of [
                    longName,
                    '+6281234567890',
                    longModel,
                    'sales.qa',
                ]) {
                    assert(
                        (await preview
                            .getByText(text, { exact: true })
                            .filter({ visible: true })
                            .count()) === 1,
                        `Missing valid field ${text}`,
                    );
                }
                for (const text of [longFile, 'completed', 'Admin Import QA']) {
                    assert(
                        (await history
                            .getByText(text, { exact: true })
                            .filter({ visible: true })
                            .count()) === 1,
                        `Missing batch field ${text}`,
                    );
                }
                if (width < 768) {
                    assert(
                        (await preview.getByRole('table').isVisible()) ===
                            false,
                        'Mobile preview must replace the table',
                    );
                    assert(
                        (await history.getByRole('table').isVisible()) ===
                            false,
                        'Mobile history must replace the table',
                    );
                    for (const label of [
                        'Total',
                        'Diterima',
                        'Ditolak',
                        'Pelaku',
                        'Waktu',
                    ]) {
                        assert(
                            (await history
                                .getByText(label, { exact: true })
                                .filter({ visible: true })
                                .count()) === 1,
                            `Missing batch label ${label}`,
                        );
                    }
                    const summary = await history
                        .locator('dd:visible')
                        .allTextContents();
                    assert(
                        summary.slice(0, 5).join('|') ===
                            'completed|2|1|1|Admin Import QA',
                        'Batch counts and actor must match the table',
                    );
                    assert(
                        summary[5].includes('5 Nov 2026') &&
                            summary[5].includes('10.10'),
                        'Batch time must use Jakarta',
                    );
                    for (const label of [
                        'Nama',
                        'Telepon',
                        'Model',
                        'Sales',
                        'Status',
                    ]) {
                        assert(
                            (await preview
                                .getByText(label, { exact: true })
                                .filter({ visible: true })
                                .count()) === 2,
                            `Missing preview label ${label}`,
                        );
                    }
                }
                const geometry = await page.evaluate(() => ({
                    page:
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                    regions: [
                        ...document.querySelectorAll('[role="region"]'),
                    ].every((node) => node.scrollWidth <= node.clientWidth + 1),
                }));
                assert(
                    geometry.page && geometry.regions,
                    `Import overflow at ${width}/${theme}: ${JSON.stringify(geometry)}`,
                );
                assert(
                    await page
                        .getByRole('button', { name: 'Preview', exact: true })
                        .isDisabled(),
                    'Upload disabled without a file',
                );
                await page.screenshot({
                    path: `.playwright-cli/g08-import-${width}-${theme}.png`,
                    fullPage: true,
                });
                checked++;
            }
        }
        fixture = makeFixture('invalid');
        await page.goto(`${origin}/imports`);
        assert(
            await page
                .getByRole('button', { name: 'Import 0 baris valid' })
                .isDisabled(),
            'All-invalid preview cannot commit',
        );
        fixture = makeFixture('empty');
        await page.goto(`${origin}/imports`);
        await page
            .getByText('Belum ada batch import.', { exact: true })
            .waitFor();
        fixture = makeFixture('error');
        await page.goto(`${origin}/imports`);
        await page
            .getByRole('alert')
            .getByText('CSV harus diperbaiki.')
            .waitFor();
        fixture = makeFixture();
        await page.goto(`${origin}/imports`);
        const input = page.getByLabel('File CSV');
        await input.setInputFiles({
            name: 'qa.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from('name,phone\nQA,08123456789'),
        });
        const previewButton = page.getByRole('button', {
            name: 'Preview',
            exact: true,
        });
        await previewButton.focus();
        const uploadRequest = page.waitForRequest(
            (request) =>
                request.method() === 'POST' &&
                request.url().endsWith('/imports/preview'),
        );
        await page.keyboard.press('Enter');
        await uploadRequest;
        assert(
            await page
                .getByRole('button', { name: 'Memvalidasi' })
                .isDisabled(),
            'Upload loading state disabled',
        );
        releaseWrite();
        await page
            .getByRole('button', { name: 'Preview', exact: true })
            .waitFor();
        const commitButton = page.getByRole('button', {
            name: 'Import 1 baris valid',
        });
        await commitButton.focus();
        const commitRequest = page.waitForRequest(
            (request) =>
                request.method() === 'POST' &&
                request.url().endsWith('/imports/77/commit'),
        );
        await page.keyboard.press('Enter');
        await commitRequest;
        assert(
            await page.getByRole('button', { name: 'Mengimpor' }).isDisabled(),
            'Commit loading state disabled',
        );
        releaseWrite();
        await page
            .getByRole('button', { name: 'Import 1 baris valid' })
            .waitFor();
        assert(browserErrors.length === 0, browserErrors.join('; '));
        return {
            checked,
            states: [
                'invalid',
                'empty',
                'error',
                'upload-loading',
                'commit-loading',
                'keyboard',
            ],
            interceptedWrites: writes,
            businessWrites: 0,
            browserErrors,
        };
    } finally {
        releaseWrite?.();
        await page.unrouteAll({ behavior: 'wait' });
        await page.goto(`${origin}/login`);
    }
}
