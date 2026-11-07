// Run against the isolated Laravel fixture.
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function targetPlanRecovery(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(8000);
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/login`);
    await page.getByLabel('Username').fill('g11.spv');
    await page.locator('input[name="password"]').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.goto(`${origin}/targets`);

    const editor = page.getByRole('region', { name: 'Editor rencana target' });
    const target = editor.getByLabel('Target management (unit)');
    const markup = editor.getByLabel('Markup SPV (%)');
    const allocation = editor.locator('input[id^="allocation-"]');
    if ((await allocation.count()) !== 1)
        throw new Error('Expected the isolated team to contain one Sales');
    const save = editor.getByRole('button', {
        name: 'Simpan rencana target',
        exact: true,
    });
    const writes = [];
    const recordWrite = (request) => {
        if (
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/target-plans'
        )
            writes.push(request.postDataJSON());
    };
    page.on('request', recordWrite);
    const checked = [];
    let previousVersion;
    try {
        for (const failure of ['network', 'http']) {
            const draft = failure === 'network' ? '12,3456' : '13,4567';
            await target.fill(draft);
            await markup.fill('10,25');
            await allocation.fill('20,1234');
            const start = writes.length;
            let release;
            const pending = new Promise((resolve) => {
                release = resolve;
            });
            await page.route('**/target-plans', async (route) => {
                await pending;
                if (failure === 'network')
                    await route.abort('internetdisconnected');
                else
                    await route.fulfill({
                        status: 503,
                        contentType: 'text/plain',
                        body: 'QA unavailable before write',
                    });
            });
            try {
                await save.click();
                await editor
                    .getByRole('button', { name: 'Menyimpan…' })
                    .waitFor();
                if (
                    !(await target.isDisabled()) ||
                    !(await markup.isDisabled()) ||
                    !(await allocation.isDisabled()) ||
                    !(await editor
                        .getByRole('button', { name: 'Bagi rata' })
                        .isDisabled())
                )
                    throw new Error('Pending save left draft controls enabled');
                await editor.locator('form').evaluate((form) => {
                    form.dispatchEvent(
                        new Event('submit', {
                            bubbles: true,
                            cancelable: true,
                        }),
                    );
                });
            } finally {
                release();
            }
            const alert = editor.getByRole('alert');
            await alert.filter({ hasText: 'rencana target' }).waitFor();
            if (
                writes.length !== start + 1 ||
                (await target.inputValue()) !== draft ||
                (await markup.inputValue()) !== '10,25' ||
                (await allocation.inputValue()) !== '20,1234' ||
                !(await save.isEnabled()) ||
                (await editor.locator('p[role="status"]').innerText()).includes(
                    'Rencana target tersimpan.',
                )
            )
                throw new Error(
                    'Failed save duplicated a write, lost the draft, or reported success',
                );
            if (
                previousVersion !== undefined &&
                writes[start].version !== previousVersion + 1
            )
                throw new Error(
                    'Successful retry did not advance the plan version once',
                );
            previousVersion = writes[start].version;
            await page.unroute('**/target-plans');
            const response = page.waitForResponse(
                (result) =>
                    result.request().method() === 'POST' &&
                    new URL(result.url()).pathname === '/target-plans',
            );
            await save.press('Enter');
            if (![302, 303].includes((await response).status()))
                throw new Error('Target retry did not reach Laravel');
            await editor
                .getByRole('status')
                .filter({ hasText: 'Rencana target tersimpan.' })
                .waitFor();
            if (
                writes.length !== start + 2 ||
                JSON.stringify(writes[start]) !==
                    JSON.stringify(writes[start + 1])
            )
                throw new Error(
                    'Manual retry changed the draft payload or issued extra writes',
                );
            await alert.waitFor({ state: 'hidden' });
            await page.reload();
            if (
                (await target.inputValue()) !== draft.replace(',', '.') ||
                (await markup.inputValue()) !== '10.25' ||
                (await allocation.inputValue()) !== '20.1234'
            )
                throw new Error(
                    'Retried decimal target and allocation were not persisted',
                );
            checked.push(failure);
        }
    } finally {
        page.off('request', recordWrite);
        await page.unroute('**/target-plans');
    }
    return {
        checked,
        draftsAndVersionsPreserved: true,
        persistedAfterReload: true,
        writes: writes.length,
    };
}
