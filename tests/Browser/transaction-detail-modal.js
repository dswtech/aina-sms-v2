// Detail modal: two panels, rail modes, resizable/collapsible right panel, inline edit and phone layout.
// Run against the isolated Laravel fixture (g11.* users, password "password").
// eslint-disable-next-line no-unused-vars -- playwright-cli invokes this function.
async function transactionDetailModal(page) {
    const origin = new URL(page.url()).origin;
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
        throw new Error('Expected the isolated G11 server');
    page.setDefaultTimeout(10000);
    if (page.unrouteAll) await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.context().setOffline(false);

    const assert = (condition, message) => {
        if (!condition) throw new Error(message);
    };
    const consoleErrors = [];
    const onConsole = (message) => {
        if (message.type() === 'error')
            consoleErrors.push(`${page.url()} ${message.text()}`);
    };
    const onPageError = (error) =>
        consoleErrors.push(`${page.url()} pageerror ${error.message}`);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    const login = async (username) => {
        await page.goto('about:blank');
        await page.context().clearCookies();
        await page.goto(`${origin}/login`, { waitUntil: 'load' });
        await page.getByLabel('Username').waitFor({ timeout: 15000 });
        await page.getByLabel('Username').fill(username);
        await page.locator('input[name="password"]').fill('password');
        await page.locator('[data-test="login-button"]').click();
        await page.waitForURL('**/dashboard');
    };
    const assertNoOverflow = async (state) => {
        const { viewport, content } = await page.evaluate(() => ({
            viewport: innerWidth,
            content: document.documentElement.scrollWidth,
        }));
        assert(content <= viewport, `${state}: scrollWidth ${content}px exceeds innerWidth ${viewport}px`);
    };
    const openDetail = async (model) => {
        await page.goto(`${origin}/transactions?search=${encodeURIComponent(model)}`);
        await page
            .getByRole('button', { name: 'Detail', exact: true })
            .filter({ visible: true })
            .first()
            .click();
        await page.getByRole('heading', { name: 'Detail transaksi' }).waitFor();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('region', { name: 'Properti transaksi' }).waitFor();
        return dialog;
    };
    const checked = [];

    // Desktop: layout, resize, collapse, rail modes and read-only role.
    await page.setViewportSize({ width: 1440, height: 900 });
    await login('g11.admin');
    let dialog = await openDetail('G11 Pagination Model 5');
    await assertNoOverflow('desktop open');
    const comments = dialog.getByRole('heading', { name: 'Komentar coaching' });
    const separator = dialog.getByRole('separator', { name: 'Ubah lebar panel kanan' });
    const rightWidth = () => comments.evaluate((h) => h.parentElement.getBoundingClientRect().width);
    const leftWidth = () =>
        dialog
            .getByRole('region', { name: 'Properti transaksi' })
            .evaluate((el) => el.parentElement.getBoundingClientRect().width);
    const drag = async (dx) => {
        const box = await separator.boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx, y, { steps: 6 });
        await page.mouse.up();
    };
    const start = await rightWidth();
    await drag(-80);
    const wider = await rightWidth();
    assert(wider > start + 40, `dragging left should widen the right panel (${start} -> ${wider})`);
    await drag(2000);
    assert((await rightWidth()) >= 159, 'right panel went below its minimum');
    await drag(-2000);
    assert((await leftWidth()) >= 299, `left panel went below its minimum: ${await leftWidth()}`);
    await separator.focus();
    const before = await rightWidth();
    await page.keyboard.press('ArrowRight');
    assert((await rightWidth()) < before, 'ArrowRight should narrow the right panel');
    checked.push('resize');

    await dialog.getByRole('button', { name: 'Lipat panel kanan' }).click();
    await comments.waitFor({ state: 'hidden' });
    assert((await separator.count()) === 0, 'collapsed panel left a separator');
    await dialog.getByRole('button', { name: 'Komentar', exact: true }).click();
    await comments.waitFor();
    await dialog.getByRole('button', { name: 'Aktivitas', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Aktivitas pelanggan' }).waitFor();
    assert((await dialog.locator('#detail-comment-body').count()) === 0, 'Aktivitas must not offer a comment box');
    checked.push('collapse and rail');
    assert((await dialog.locator('#detail-comment-body').count()) === 0, 'Admin is read-only for comments');

    // Inline edit: an incomplete area is never sent; Kota Lain saves; a failed save restores the value.
    const patches = [];
    const onRequest = (request) => request.method() === 'PATCH' && patches.push(request.url());
    page.on('request', onRequest);
    const areaTrigger = dialog.getByRole('button', { name: /^Area:/ });
    const areaBefore = await areaTrigger.getAttribute('aria-label');
    await areaTrigger.click();
    await dialog.getByRole('option', { name: 'Kabupaten Bandung Barat', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    assert(await dialog.isVisible(), 'Escape in the picker closed the whole dialog');
    assert(patches.length === 0, `region without district sent ${patches.length} request(s)`);
    assert((await areaTrigger.getAttribute('aria-label')) === areaBefore, 'incomplete area changed the value');
    checked.push('incomplete area not sent');

    await areaTrigger.click();
    await dialog.getByRole('option', { name: 'Kota Lain', exact: true }).click();
    await dialog.getByLabel('Nama kota').fill('Kota QA');
    await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
    await dialog.getByRole('button', { name: 'Area: Kota QA', exact: true }).waitFor();
    checked.push('Kota Lain saved');

    // Back-to-back edits must not cancel each other's request: the note save is slowed down
    // so the Area save starts while it is still in flight.
    const slowNote = async (route) => {
        if (route.request().method() === 'PATCH' && /notes/.test(route.request().postData() ?? ''))
            await new Promise((resolve) => setTimeout(resolve, 800));
        await route.continue();
    };
    const patchUrl = /\/transactions\/[0-9a-f-]{36}$/;
    const cancelled = [];
    const onCancelled = (request) => request.method() === 'PATCH' && cancelled.push(request.url());
    await page.route(patchUrl, slowNote);
    page.on('requestfailed', onCancelled);
    await dialog.getByLabel('Keterangan').fill('Catatan lalu area');
    await dialog.getByRole('button', { name: /^Area:/ }).click();
    await dialog.getByRole('option', { name: 'Kabupaten Bandung Barat', exact: true }).click();
    await dialog.getByRole('option', { name: 'Padalarang', exact: true }).click();
    await dialog.getByRole('button', { name: 'Area: Padalarang, Kabupaten Bandung Barat', exact: true }).waitFor();
    await page.waitForTimeout(1500);
    page.off('requestfailed', onCancelled);
    await page.unroute(patchUrl, slowNote);
    assert(cancelled.length === 0, `a PATCH was cancelled by the next edit (${cancelled.length})`);
    checked.push('edits do not cancel each other');

    await page.route(/\/transactions\/[0-9a-f-]{36}$/, (route) =>
        route.request().method() === 'PATCH'
            ? route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' })
            : route.continue(),
    );
    await dialog.getByRole('button', { name: /^Pembiayaan:/ }).click();
    await dialog.getByRole('option', { name: 'Cash', exact: true }).click();
    await dialog.getByRole('alert').first().waitFor();
    assert(
        (await dialog.getByRole('button', { name: /^Pembiayaan:/ }).getAttribute('aria-label')) !== 'Pembiayaan: Cash',
        'failed save kept the unsaved value',
    );
    // A failed note save must keep what the user typed, next to the error.
    const note = dialog.getByLabel('Keterangan');
    await note.fill('Catatan yang tidak boleh hilang');
    await note.blur();
    await page.waitForTimeout(800);
    await dialog.getByRole('alert').first().waitFor();
    assert(
        (await note.inputValue()) === 'Catatan yang tidak boleh hilang',
        'failed note save discarded the typed text',
    );
    await page.unroute(/\/transactions\/[0-9a-f-]{36}$/);
    page.off('request', onRequest);
    consoleErrors.length = 0; // the forced 500 above logs one expected error
    checked.push('failed save restored');

    // Closing with Escape while the note has unsaved text must still save it.
    await note.fill('Catatan lewat Escape');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(1000);
    dialog = await openDetail('G11 Pagination Model 5');
    assert(
        (await dialog.getByLabel('Keterangan').inputValue()) === 'Catatan lewat Escape',
        'Escape lost the unsaved note',
    );
    checked.push('note kept on failure and on Escape');

    // Supervisor can comment, and only in the Komentar mode.
    await login('g11.spv');
    dialog = await openDetail('G11 Pagination Model 5');
    const body = dialog.locator('#detail-comment-body');
    await body.waitFor();
    await dialog.getByRole('button', { name: 'Aktivitas', exact: true }).click();
    await body.waitFor({ state: 'hidden' });
    await dialog.getByRole('button', { name: 'Komentar', exact: true }).click();
    await body.fill('QA komentar detail');
    await dialog.getByRole('button', { name: 'Kirim komentar' }).click();
    await dialog.getByText('QA komentar detail').first().waitFor();
    checked.push('supervisor comment');

    // Tablet and phone: no overflow; phone shows one column chosen by the rail.
    await page.setViewportSize({ width: 768, height: 1024 });
    await assertNoOverflow('tablet');
    await page.setViewportSize({ width: 390, height: 844 });
    dialog = await openDetail('G11 Pagination Model 5');
    await assertNoOverflow('phone detail');
    assert((await separator.count()) === 0, 'phone must not show the resize handle');
    assert((await dialog.getByRole('button', { name: 'Lipat panel kanan' }).count()) === 0, 'phone must not show the collapse button');
    await dialog.getByRole('button', { name: 'Komentar', exact: true }).click();
    await comments.waitFor();
    assert((await dialog.getByRole('button', { name: /^Area:/ }).count()) === 0, 'phone Komentar still shows the properties');
    await assertNoOverflow('phone comments');
    await dialog.getByRole('button', { name: 'Aktivitas', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Aktivitas pelanggan' }).waitFor();
    await dialog.getByRole('button', { name: 'Detail', exact: true }).click();
    await dialog.getByRole('button', { name: /^Area:/ }).waitFor();
    checked.push('phone layout');

    assert(consoleErrors.length === 0, `console errors ${consoleErrors.join(' | ')}`);
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    return { checked };
}
