# Hapus Tahap Delivery: Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghapus tahap Delivery dari pipeline, data, tampilan, laporan, dan dokumen, sehingga DO menjadi tahap akhir transaksi yang berhasil.

**Architecture:** Satu migration data mengubah sisa nilai `delivery` di database. Aturan domain baru (follow-up dibatalkan saat DO, Batalkan DO hanya di bulan yang sama) masuk lebih dulu selagi enum masih lengkap. Setelah itu `PipelineStage::Delivery` dihapus beserta semua rujukannya di PHP, lalu di frontend, lalu di dokumen.

**Tech Stack:** Laravel + Pest, Inertia React + TypeScript, PostgreSQL, Playwright browser scripts di `tests/Browser`.

**Spec:** `docs/superpowers/specs/2026-11-19-remove-delivery-stage-design.md`

## Global Constraints

- Kerjakan di worktree atau branch baru dari `main`, misalnya `feat/remove-delivery-stage`, jangan di branch yang sedang aktif. Checkout ini dipakai sesi lain: stage file dengan path persis, jangan `git add -A`.
- Commit memakai Conventional Commits. Jangan menambah trailer `Co-Authored-By: Claude`.
- Jalankan tes yang relevan sebelum setiap commit. Jika gagal, jangan commit.
- Jangan menjalankan migration atau seeder pada database non-test. Production hanya atas perintah eksplisit pemilik, dan backup diambil lebih dulu.
- Zona waktu bulan: `Asia/Jakarta`.
- Teks alasan follow-up yang dibatalkan: `Transaksi DO` dan `Transaksi Lost`, persis seperti ini.
- Frontend dicek dengan `vp check`. Selector di `tests/Browser` ikut diperbarui bila UI berubah.
- ADR lama tidak ditulis ulang. Dokumen implementasi historis (`docs/agents/implementation-*.md`, `design-*.md`, `accessibility-*.md`, `docs/design/**`) tidak diubah.

## Review Focus

1. **DO pada pergantian bulan:** DO pukul 23.59 WIB tanggal 31 Oktober sudah ditolak saat dibatalkan pada 00.00 WIB 1 November. Padahal di UTC keduanya masih tanggal 31 Oktober. Tes di Task 2.
2. **Transaksi bekas Delivery yang DO-nya bulan ini:** setelah migrasi transaksi ini tetap bisa dibatalkan Admin. Tes di Task 1 (data) dan Task 2 (policy).
3. **Email komentar antre dengan tahap `delivery`:** render email tidak boleh error. Tes di Task 3.
4. **DO yang pernah dibatalkan lalu dicatat ulang:** bulan yang dipakai adalah event DO aktif (`currentDoEvent()`), bukan DO pertama. Tes di Task 2.
5. **Follow-up yang sudah selesai atau dibatalkan** tidak berubah, baik oleh migrasi maupun oleh transisi ke DO. Tes di Task 1 dan Task 2.

---

### Task 1: Migration data Delivery

**Files:**

- Create: `database/migrations/2026_11_20_100000_remove_delivery_stage.php`
- Test: `tests/Feature/Pipeline/RemoveDeliveryStageMigrationTest.php`

**Interfaces:**

- Produces: tidak ada baris dengan `deal_transactions.current_stage`, `stage_histories.to_stage`, `stage_histories.from_stage`, atau `deal_comments.stage_at_creation` bernilai `delivery`. Task 3 mengandalkan ini.

Migration memakai `DB::table` dengan string mentah, jangan model atau enum, supaya tetap jalan setelah enum berubah. Semua langkah dalam satu `DB::transaction`, dengan urutan:

1. `stage_histories` dengan `to_stage = 'delivery'` atau `from_stage = 'delivery'`: dihapus.
2. `deal_transactions` dengan `current_stage = 'delivery'`: `current_stage = 'do'`, `progress_at` = `created_at` dari baris `stage_histories` terbaru (`created_at` desc, lalu `id` desc) yang `to_stage = 'do'` dan tidak dirujuk oleh `reverses_stage_history_id` baris lain. Jika tidak ada baris seperti itu, `progress_at` dibiarkan. `last_activity_at` tidak diubah.
3. `deal_comments.stage_at_creation = 'delivery'` menjadi `'do'`.
4. `follow_ups` dengan `status = 'pending'` yang transaksinya `current_stage = 'do'`: `status = 'cancelled'`, `cancel_reason = 'Transaksi DO'`, `updated_at = now()`. Cek nama kolom relasi transaksi di migration `follow_ups`.

`down()` kosong dengan komentar satu baris: data Delivery sengaja tidak dipulihkan.

- [ ] **Step 1: Tulis tes yang gagal**

Seed lewat `DB::table` (bukan model): satu transaksi `delivery` dengan riwayat SPK→DO (`created_at` 2026-11-05 03:00 UTC) dan DO→Delivery (2026-11-10), satu komentar `stage_at_creation = 'delivery'`, satu transaksi `do` dengan follow-up `pending`, satu `completed`, dan satu `cancelled` (alasan lama). Lalu `(require database_path('migrations/2026_11_20_100000_remove_delivery_stage.php'))->up();`.

```php
it('folds delivery deals back into DO', function () { /* seed */
    expect(DB::table('deal_transactions')->where('id', $deliveredId)->value('current_stage'))->toBe('do')
        ->and(Carbon::parse(DB::table('deal_transactions')->where('id', $deliveredId)->value('progress_at'))->equalTo('2026-11-05 03:00:00'))->toBeTrue()
        ->and(DB::table('stage_histories')->where('to_stage', 'delivery')->exists())->toBeFalse()
        ->and(DB::table('stage_histories')->where('deal_transaction_id', $deliveredId)->where('to_stage', 'do')->count())->toBe(1)
        ->and(DB::table('deal_comments')->where('stage_at_creation', 'delivery')->exists())->toBeFalse();
});

it('cancels only pending follow-ups on DO deals', function () { /* seed */
    expect(DB::table('follow_ups')->where('id', $pendingId)->first())
        ->status->toBe('cancelled')->cancel_reason->toBe('Transaksi DO');
    expect(DB::table('follow_ups')->where('id', $completedId)->value('status'))->toBe('completed')
        ->and(DB::table('follow_ups')->where('id', $oldCancelledId)->value('cancel_reason'))->toBe($oldReason);
});
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Run: `php artisan test tests/Feature/Pipeline/RemoveDeliveryStageMigrationTest.php`
Expected: FAIL, file migration belum ada.

- [ ] **Step 3: Tulis migration sesuai urutan di atas**

- [ ] **Step 4: Jalankan dan pastikan lulus**

Run: `php artisan test tests/Feature/Pipeline/RemoveDeliveryStageMigrationTest.php`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_11_20_100000_remove_delivery_stage.php tests/Feature/Pipeline/RemoveDeliveryStageMigrationTest.php
git commit -m "feat(pipeline): migrate delivery deals back to DO"
```

---

### Task 2: Aturan DO baru (follow-up dan Batalkan DO)

**Files:**

- Modify: `app/Models/DealTransaction.php` (blok follow-up di `transitionTo`, sekitar baris 314)
- Modify: `app/Policies/DealTransactionPolicy.php` (`cancelDo`)
- Test: `tests/Feature/Pipeline/DoWorkflowTest.php` (tambah tes baru)

**Interfaces:**

- Produces: `DealTransactionPolicy::cancelDo(User $actor, DealTransaction $deal): bool` mengembalikan `true` hanya jika syarat lama terpenuhi dan `$deal->currentDoEvent()?->created_at` jatuh di bulan yang sama dengan `now()`, keduanya diformat `Y-m` di `Asia/Jakarta`. Jika tidak ada event DO, hasilnya `false`. `TransactionController` sudah memakai policy ini untuk `can_cancel_do`, jadi tidak perlu diubah.

- [ ] **Step 1: Tulis tes yang gagal**

```php
it('cancels pending follow-ups when a deal reaches DO', function () {
    // deal SPK + follow-up pending + follow-up completed; transitionTo(Do) dengan checklist dan vehicle_ownership
    expect($pending->fresh())->status->toBe('cancelled')->cancel_reason->toBe('Transaksi DO')
        ->and($completed->fresh()->status)->toBe('completed');
});

it('lets Admin cancel a DO only in the Jakarta month it was recorded', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-31 23:59', 'Asia/Jakarta'));
    // catat DO
    $this->travelTo(CarbonImmutable::parse('2026-11-01 00:00', 'Asia/Jakarta'));
    expect($admin->can('cancelDo', $deal->fresh()))->toBeFalse();
    $this->actingAs($admin)->postJson(route('transactions.cancel-do', $deal), ['reason' => 'x', 'do_event_id' => $event->id])->assertForbidden();
});

it('allows cancelling a DO recorded earlier in the same Jakarta month', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-01 00:00', 'Asia/Jakarta'));
    // catat DO
    $this->travelTo(CarbonImmutable::parse('2026-11-30 23:59', 'Asia/Jakarta'));
    expect($admin->can('cancelDo', $deal->fresh()))->toBeTrue();
});

it('uses the active DO event after a cancel and re-record', function () {
    // DO 2026-10-20, dibatalkan 2026-10-21, DO ulang 2026-11-02; sekarang 2026-11-15
    expect($admin->can('cancelDo', $deal->fresh()))->toBeTrue();
});
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Run: `php artisan test tests/Feature/Pipeline/DoWorkflowTest.php`
Expected: tes follow-up dan tes bulan lalu FAIL.

- [ ] **Step 3: Implementasi**

`transitionTo`: pembatalan follow-up berlaku untuk `Lost` dan `Do`, dengan alasan `'Transaksi '.$toStage->label()`. Untuk sementara `Delivery` tetap ikut, karena enum baru dihapus di Task 3. `cancelDo`: tambahkan syarat bulan seperti di Interfaces.

- [ ] **Step 4: Jalankan dan pastikan lulus**

Run: `php artisan test tests/Feature/Pipeline`
Expected: PASS. Tes lama di `DoWorkflowTest.php` yang membatalkan DO memakai waktu saat ini, jadi tetap lulus.

- [ ] **Step 5: Commit**

```bash
git add app/Models/DealTransaction.php app/Policies/DealTransactionPolicy.php tests/Feature/Pipeline/DoWorkflowTest.php
git commit -m "feat(pipeline): close DO follow-ups and lock DO cancellation to its month"
```

---

### Task 3: Hapus Delivery dari backend

**Files:**

- Modify:
    - `app/Enums/PipelineStage.php`
    - `app/Models/DealTransaction.php`
    - `app/Models/Customer.php` (komentar baris 282)
    - `app/Policies/DealTransactionPolicy.php`
    - `app/Http/Requests/Customer/UpdateDealStageRequest.php`
    - `app/Http/Controllers/Customer/CustomerController.php`
    - `app/Http/Controllers/TransactionController.php`
    - `app/Http/Controllers/AnalyticsController.php`
    - `app/Services/TeamPerformance.php`
    - `app/Services/StageAchievements.php`
    - `app/Notifications/DealCommentCreated.php`
    - `app/Notifications/DealStageChanged.php`
    - `database/seeders/DevelopmentDemoSeeder.php`
- Test (sesuaikan): semua file di `tests/Feature` dan `tests/Operations` dari `grep -rliE "delivery" tests/Feature tests/Operations tests/Performance`

**Interfaces:**

- Consumes: data tanpa `delivery` (Task 1), `cancelDo` baru (Task 2).
- Produces:
    - `PipelineStage` tanpa `Delivery`; `closedValues()` = `['do', 'lost']`.
    - Payload transaksi tanpa `can_confirm_delivery`.
    - Baris Analytics `{spk, do}` tanpa `delivery`. Header CSV menjadi `['Sumber', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Conversion (%)']` dan `['Model', 'Jumlah', 'Porsi (%)', 'SPK', 'DO']`.
    - `stageCounts` Kinerja Tim dan `stages` Pencapaian Tahap tanpa `delivery`.

Perubahan per file:

- `DealTransaction::transitionTo`: hapus dua cek Delivery. Cek tahap terkunci menjadi `if ($fromStage->isClosed())`. Follow-up dibatalkan untuk Lost dan DO.
- `DealTransactionPolicy`: hapus `confirmDelivery`.
- `UpdateDealStageRequest`: hapus `do_event_id`.
- `CustomerController`: `whereIn(current_stage, [do, delivery])` menjadi `where('current_stage', PipelineStage::Do->value)` (6 tempat). Cabang `match` dan `assertCurrentDoEvent` untuk Delivery di `updateStage` dihapus; `assertCurrentDoEvent` tetap dipakai `cancelDo`.
- `TransactionController`: hapus `$confirmDelivery` dan `can_confirm_delivery`; `$doEvent` hanya bila `$cancelDo`; daftar tahap kendaraan terkunci `[Spk, Do]`.
- `AnalyticsController`, `TeamPerformance` (`delivered_in_period` dan cabang `Delivery`), `StageAchievements::STAGES`: buang Delivery.
- Kedua notifikasi: `PipelineStage::tryFrom($x)?->label() ?? ucfirst($x)`, supaya email lama yang antre tetap terkirim.
- `DevelopmentDemoSeeder`: 30 transaksi Delivery menjadi DO (`array_fill(0, 30, PipelineStage::Do)` digabung ke jumlah DO yang ada, atau hapus baris itu dan naikkan jumlah DO 30). Hapus entri peta Delivery.

- [ ] **Step 1: Tambahkan tes notifikasi yang gagal**

Di `tests/Feature/Customer/CoachingWorkflowTest.php` atau file tes notifikasi komentar yang sudah ada:

```php
it('renders a comment email whose stage no longer exists', function () {
    $mail = (new DealCommentCreated(/* argumen yang sama seperti tes lain, stage: 'delivery' */))->toMail($user);
    expect($mail->introLines[0])->toContain('Delivery');
});
```

- [ ] **Step 2: Hapus enum dan semua rujukan seperti di atas**

- [ ] **Step 3: Sesuaikan tes yang ada**

Tes yang memakai `'delivery'` atau `PipelineStage::Delivery`: hapus langkah Delivery, atau ganti ekspektasinya ke DO. Tambahan di `DoWorkflowTest.php`:

- `patchJson($stage, ['to_stage' => 'delivery'])` harus `assertUnprocessable()` dengan error `to_stage`.
- Setelah DO, `to_stage` apa pun ditolak dengan pesan "Tahap transaksi yang selesai terkunci."
- Payload transaksi tidak berisi kunci `can_confirm_delivery`.

Tes ekspor (`AnalyticsTest.php`, `ExportVerificationTest.php`) memeriksa header CSV yang baru.

- [ ] **Step 4: Jalankan seluruh tes backend**

Run: `composer test`
Expected: PASS. Lalu jalankan `grep -rniE "PipelineStage::Delivery|'delivery'" app database/seeders tests/Feature tests/Operations`; satu-satunya hasil yang tersisa adalah file migration Task 1 dan tes migrasinya.

- [ ] **Step 5: Lint dan analisis statis**

Run: `composer lint:check` lalu `composer types:check`
Expected: bersih.

- [ ] **Step 6: Commit**

Stage setiap file yang diubah dengan path persis.

```bash
git commit -m "feat(pipeline)!: remove the Delivery stage"
```

---

### Task 4: Hapus Delivery dari frontend dan tes browser

**Files:**

- Modify:
    - `resources/js/components/stage-badge.tsx`
    - `resources/js/components/dashboard-charts.tsx` (daftar `stages` dan teks sekitar baris 296)
    - `resources/js/pages/dashboard.tsx` (baris 115: "transaksi DO")
    - `resources/js/components/team-performance.tsx`
    - `resources/js/components/transaction-detail/stage-form.tsx`
    - `resources/js/components/transaction-detail/transaction-detail-modal.tsx`
    - `resources/js/components/transaction-detail/detail-properties.tsx`
    - `resources/js/lib/transaction-detail.ts`
    - `resources/js/pages/analytics/index.tsx`
    - `resources/js/pages/module-status.tsx`
    - `resources/js/pages/transactions/index.tsx`
    - `resources/js/types/history.ts`
- Modify tes browser:
    - `tests/Browser/do-workflow.js`
    - `tests/Browser/acceptance-flow.js`
    - `tests/Browser/accessibility.js`
    - `tests/Browser/analytics-export.js`
    - `tests/Browser/customer-history.js`
    - `tests/Browser/dashboard-layout.js`
    - `tests/Browser/exports-real.js`
    - `tests/Browser/target-role-metrics.js`
    - `tests/Browser/transactions-financing-roles.js`

**Interfaces:**

- Consumes: payload tanpa `can_confirm_delivery`, baris Analytics tanpa `delivery` (Task 3).
- Produces: `type StageAction = 'cancel' | null` di `stage-form.tsx`.

Perubahan:

- Hapus tombol dan mode "Konfirmasi Delivery" di modal dan halaman Transaksi, serta mode `delivery` di `stage-form.tsx`. Filter `item.value !== 'delivery'` tidak diperlukan lagi.
- `LOCKED_VEHICLE_STAGES = ['spk', 'do']`.
- Analytics: kolom dan stat Delivery dihapus; teks deskripsi menjadi "SPK serta DO".
- `module-status.tsx`: "Pipeline Lead sampai DO atau Lost".
- Dashboard: teks yang menjelaskan Delivery dihapus.

- [ ] **Step 1: Ubah komponen**

- [ ] **Step 2: Cek tipe dan lint**

Run: `vp check` lalu `npm run types:check`
Expected: bersih. `grep -rni "delivery" resources/js` tidak menghasilkan apa pun.

- [ ] **Step 3: Jalankan tes frontend**

Run: `npm run test:frontend`
Expected: PASS

- [ ] **Step 4: Perbarui dan jalankan tes browser**

Hapus langkah Konfirmasi Delivery dan selector kolom Delivery. `do-workflow.js` memeriksa bahwa tombol "Konfirmasi Delivery" tidak muncul setelah DO, dan "Batalkan DO" muncul untuk Admin. Sebelum menjalankan suite browser, jeda `public/hot` sesuai catatan proyek; kembalikan setelahnya.
Expected: semua skrip browser yang diubah lulus.

- [ ] **Step 5: Commit**

Stage setiap file yang diubah dengan path persis.

```bash
git commit -m "feat(ui): drop Delivery from transactions, dashboard and reports"
```

---

### Task 5: Dokumen

**Files:**

- Create: `docs/agents/adr/ADR-010-remove-delivery-stage.md`
- Modify:
    - `docs/agents/PRD.md`: PIP-02, PIP-07, ANL-03, cerita pengguna 6, ringkasan aturan tahap (baris 321, 332), dan baris fase 2 "Lead sampai Delivery/Lost"
    - `docs/agents/knowledge.md`
    - `docs/agents/memory.md`
    - `docs/agents/uat-matrix.md`
    - `docs/agents/roadmap.md`
    - `docs/agents/ringkasan-untuk-supervisor.md`
    - `docs/panduan-bobot-forecast.md`
    - `PRODUCT.md`
    - `DESIGN.md`
    - `docs/operations/backup-restore.md`
    - `docs/agents/README.md` (daftarkan ADR-010)

Isi ADR-010: konteks (Delivery bukan lingkup kerja pengguna), keputusan (tahap dihapus; data lama digabung ke DO; follow-up dibatalkan saat DO; Batalkan DO hanya di bulan WIB yang sama), konsekuensi (catatan waktu kirim hilang permanen, export Analytics kehilangan satu kolom, DO tanggal 31 tidak bisa dibatalkan tanggal 1). PRD PIP-07 memuat aturan bulan pembatalan. Kalender delivery pasca-MVP tetap disebut sebagai kemungkinan masa depan.

- [ ] **Step 1: Tulis ADR dan perbarui dokumen**

- [ ] **Step 2: Periksa sisa rujukan**

Run: `grep -rn "Delivery" docs/agents/PRD.md docs/agents/knowledge.md docs/agents/uat-matrix.md PRODUCT.md DESIGN.md`
Expected: hanya rujukan ke kalender delivery pasca-MVP dan ke ADR-010.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: record removal of the Delivery stage (ADR-010)"
```

---

### Task 6: Verifikasi akhir

- [ ] **Step 1:** Jalankan `composer ci:check`. Expected: lulus.
- [ ] **Step 2:** Jalankan `vp check` dan `npm run test:frontend`. Expected: lulus.
- [ ] **Step 3:** Buka aplikasi lokal dan periksa halaman Transaksi, modal detail transaksi DO, Dashboard, Analytics (termasuk export CSV), Kinerja Tim, Pencapaian Tahap, dan Buku Pelanggan. Pastikan tidak ada Delivery dan tidak ada error.
- [ ] **Step 4:** Siapkan catatan rilis dalam format bullet (seperti v1.2.3): Delivery dihapus, kolom export Analytics berkurang satu, Batalkan DO dibatasi ke bulan berjalan, dan migrasi production butuh backup lebih dulu.
