// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function customerActionRecovery(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/login');
    await page.getByLabel('Username').fill('g11.sales');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.goto(origin + '/transactions/create');
    await page.locator('#name').fill('G11 Customer Recovery');
    await page.locator('#phone').fill('081234567866');
    await page.locator('#model').selectOption('G11 Recovery Model');
    await page
        .getByRole('button', { name: 'Simpan transaksi', exact: true })
        .click();
    await page.waitForURL(/\/transactions(\?|$)/);
    await page.goto(origin + '/customers?search=G11%20Customer%20Recovery');
    const checked = [];
    for (const action of ['activity', 'followup']) {
        for (const failure of ['network', 'http']) {
            const note = 'G11 recovery ' + action + ' ' + failure;
            const followup = action === 'followup';
            await page
                .getByRole('button', {
                    name: followup ? 'Follow-Up' : 'Catat Aktivitas',
                    exact: true,
                })
                .click();
            const dialog = page.getByRole('dialog', {
                name: followup
                    ? 'Jadwalkan Tindak Lanjut Berikutnya'
                    : 'Catat Aktivitas Lapangan',
            });
            const input = dialog.locator(followup ? '#fu-notes' : '#act-notes');
            await input.fill(note);
            const date =
                failure === 'network' ? '2030-12-20T10:00' : '2030-12-19T10:00';
            if (followup) await dialog.locator('#fu-date').fill(date);
            const save = dialog.getByRole('button', {
                name: followup ? 'Jadwalkan Tindak Lanjut' : 'Simpan Aktivitas',
                exact: true,
            });
            const suffix = followup ? '/follow-ups' : '/activities';
            let release;
            const pending = new Promise((resolve) => {
                release = resolve;
            });
            let blocked = 0;
            const match = (url) =>
                url.pathname.startsWith('/customers/') &&
                url.pathname.endsWith(suffix);
            await page.route(
                match,
                async (route) => {
                    blocked++;
                    await pending;
                    if (failure === 'network')
                        await route.abort('internetdisconnected');
                    else
                        await route.fulfill({
                            status: 503,
                            contentType: 'text/plain',
                            body: 'QA unavailable',
                        });
                },
                { times: 1 },
            );
            await Promise.all([
                page.waitForRequest(
                    (request) =>
                        request.method() === 'POST' &&
                        match(new URL(request.url())),
                ),
                save.click(),
            ]);
            try {
                if (!(await save.isDisabled()))
                    throw new Error(
                        'Customer save stayed enabled during a slow request',
                    );
                if (!(await input.isDisabled()))
                    throw new Error(
                        'Customer draft stayed editable during a slow request',
                    );
                await save.evaluate((element) => element.click());
                await page.keyboard.press('Escape');
                await dialog.waitFor();
                if (blocked !== 1)
                    throw new Error('A pending write was submitted twice');
            } finally {
                release();
            }
            await dialog.getByRole('alert').waitFor();
            if ((await input.inputValue()) !== note)
                throw new Error('Failed customer write discarded the draft');
            if (
                followup &&
                (await dialog.locator('#fu-date').inputValue()) !== date
            )
                throw new Error('Failed follow-up lost its date');
            const [saved] = await Promise.all([
                page.waitForResponse(
                    (response) =>
                        response.request().method() === 'POST' &&
                        match(new URL(response.url())),
                ),
                save.click(),
            ]);
            if (![302, 303].includes(saved.status()))
                throw new Error('Customer retry did not save via Laravel');
            await dialog.waitFor({ state: 'hidden' });
            await page.reload();
            if (followup) {
                await page.getByText(note, { exact: false }).first().waitFor();
            } else {
                await page
                    .getByRole('button', { name: 'Detail', exact: true })
                    .click();
                await page.getByText(note, { exact: false }).first().waitFor();
                await page.keyboard.press('Escape');
            }
            checked.push(action + ':' + failure);
        }
    }
    return { checked, savedAfterReload: true };
}
