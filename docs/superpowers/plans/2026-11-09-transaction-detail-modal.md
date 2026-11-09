# Modal Detail Transaksi Dua Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti modal "Detail transaksi" dengan modal dua panel: properti yang diedit di tempat, keterangan, dan timeline tahap di kiri; komentar coaching atau aktivitas di kanan lewat rail ikon.

**Architecture:** `TransactionTimeline` mendapat filter jenis, urutan, dan ukuran halaman. `TransactionController::show` mengirim header, `days_in_stage`, semua tahap, dan komentar halaman pertama; endpoint baru `transactions/{transaction}/feed` melayani halaman komentar/aktivitas berikutnya. Frontend memecah dialog dari `pages/transactions/index.tsx` ke `components/transaction-detail/*` dengan logika murni di `lib/transaction-detail.ts` yang diuji `node --test`. Simpan area/pembiayaan/keterangan memakai `PATCH /transactions/{id}` yang sudah ada.

**Tech Stack:** Laravel 12 + Pest, Inertia React 19, Tailwind 4, Radix Dialog, `vp check`, `node --test`, skrip browser `playwright-cli` di `tests/Browser`.

**Spec:** [`../specs/2026-11-09-transaction-detail-modal-design.md`](../specs/2026-11-09-transaction-detail-modal-design.md). Pelaksana membaca `AGENTS.md`, `rules/README.md`, dan spec ini sebelum bekerja. Kerja di branch non-default, commit Conventional Commits.

## Global Constraints

- Tanpa package baru (aturan `rules/README.md` §4): tidak ada Radix Popover; panel pilihan dibuat sendiri meniru posisi dan portal `components/ui/combobox.tsx`.
- Peran dan izin tidak berubah: `Gate view` + Branch Manager 403 di `TransactionTimeline`, `can_edit_metadata`, `can_comment`, revisi komentar hanya Admin.
- Lama di tahap = hari kalender Asia/Jakarta sejak `progress_at`; `null` untuk tahap tertutup.
- Simpan area, pembiayaan, dan keterangan hanya mengirim bagian yang berubah ke `PATCH /transactions/{public_id}` (server menggabung dengan nilai lama); wilayah tanpa kecamatan, atau Kota Lain tanpa nama, tidak pernah dikirim.
- Kontrol interaktif memakai `min-h-11` (aturan 44px/36px proyek di `DESIGN.md`); tanpa horizontal scroll di 390, 768, 1440, 1920px.
- Judul dialog tetap ada sebagai `DialogTitle` "Detail transaksi" (sr-only) agar fokus, aksesibilitas, dan tes lama tetap valid.
- Teks UI bahasa Indonesia, huruf kecil kecuali nama; "Tersimpan" setelah simpan berhasil.

## Review Focus

- 25 komentar: halaman 1 berisi 20 terbaru, "muat sebelumnya" membawa 5 sisanya tanpa duplikat (Task 2, Task 3).
- Wilayah dipilih tetapi kecamatan belum: tidak ada request, nilai lama tetap (Task 3, Task 5).
- Simpan gagal (422/409/jaringan): nilai kembali ke semula dan muncul pesan `role="alert"` (Task 5, Task 7).
- Akun tanpa `can_edit_metadata`: tidak ada kontrol edit dan keterangan `readOnly` (Task 5, Task 7).
- Transaksi tertutup: `days_in_stage` null dan header tanpa "di tahap ini" (Task 2, Task 6).

---

### Task 1: Opsi `TransactionTimeline::paginate`

**Files:**
- Modify: `app/Services/TransactionTimeline.php:19-31`
- Test: `tests/Feature/Pipeline/TransactionTimelineOptionsTest.php`

**Interfaces:**
- Produces: `paginate(DealTransaction $deal, User $actor, int $page = 1, array $kinds = ['stage', 'activity', 'comment'], bool $newestFirst = false, int $perPage = 20): array` dengan bentuk keluaran lama (`data`, `current_page`, `last_page`, `total`). Pemanggil lama (`CustomerHistoryController`, `DealCommentController`) tidak diubah dan hasilnya identik.

- [ ] **Step 1: Tulis tes gagal** `TransactionTimelineOptionsTest.php`: satu transaksi dengan 2 tahap, 2 aktivitas, 3 komentar (urutan waktu dikenal). Tes `filters by kind` (`['comment']` hanya `kind: comment`, `total` 3), `newestFirst reverses order and page 1 holds the newest` (perPage 2: halaman 1 = dua komentar terbaru, `last_page` 2), `defaults keep oldest-first with all kinds` (total 7, urutan naik).
- [ ] **Step 2: Jalankan** `php artisan test --filter=TransactionTimelineOptionsTest` → FAIL (argumen tidak dikenal).
- [ ] **Step 3: Implementasi** — `whereIn` jenis lewat hanya menyertakan `unionAll` untuk jenis di `$kinds` (pertahankan `selectRaw` yang sama; mulai dari union pertama yang aktif), `orderBy` arah `desc` untuk `occurred_at`, `kind`, `id` bila `$newestFirst`, `paginate($perPage, ['*'], 'timeline_page', $page)`. Otorisasi dan serialisasi tidak berubah.
- [ ] **Step 4: Jalankan** tes baru plus `php artisan test --filter=CustomerHistory` dan `--filter=Coaching` → PASS.
- [ ] **Step 5: Commit** `feat(transactions): add kind, order and size options to the timeline service`.

### Task 2: Payload detail dan endpoint feed

**Files:**
- Modify: `app/Http/Controllers/TransactionController.php:306-324` (`show`), tambah `feed`; `routes/web.php` (dekat baris 61); `tests/Feature/Pipeline/TransactionCreateFlowTest.php:97` (struktur JSON)
- Test: `tests/Feature/Pipeline/TransactionDetailPayloadTest.php`

**Interfaces:**
- Consumes: `TransactionTimeline::paginate(...)` dari Task 1.
- Produces: `GET /transactions/{public_id}` menambah `days_in_stage: int|null`, `can_comment: bool`, `stages: HistoryPage<TimelineEvent>|null` (kind stage, terbaru dulu, perPage 100), `comments: HistoryPage<TimelineEvent>|null` (kind comment, terbaru dulu, perPage 20) dan menghapus `history`; keduanya `null` untuk Branch Manager. `GET /transactions/{public_id}/feed?kind=comments|activities&page=N` (route `transactions.feed`, `TransactionController::feed(Request, DealTransaction, TransactionTimeline): JsonResponse`) mengembalikan `HistoryPage<TimelineEvent>` terbaru dulu; `kind` wajib salah satu nilai itu dan `page` integer ≥ 1, selain itu 422.

- [ ] **Step 1: Tulis tes gagal** di `TransactionDetailPayloadTest.php`: `days_in_stage counts Jakarta calendar days since progress_at` (dengan `Carbon::setTestNow`: `progress_at` 23:50 WIB kemarin dan sekarang 00:10 WIB → 1; 12 hari lalu → 12); `days_in_stage is null for a closed stage` (Won/Lost); `detail carries stages newest first and first comments page`; `feed pages comments without overlap` (25 komentar: halaman 1 = 20 terbaru, halaman 2 = 5 tertua, `last_page` 2, tidak ada key ganda); `feed returns only activities for kind=activities`; `feed rejects unknown kind and page 0 with 422`; `feed is forbidden for an unrelated Sales`; `can_comment is true for Supervisor and false for Admin` (sesuai `DealCommentPolicy::create`: hanya Sales dan Supervisor). Perbarui `assertJsonStructure` lama: ganti `history` dengan `stages`, `comments`, `days_in_stage`, `can_comment`.
- [ ] **Step 2: Jalankan** `php artisan test --filter=TransactionDetailPayloadTest` → FAIL.
- [ ] **Step 3: Implementasi** `days_in_stage`: selisih hari kalender Jakarta antara awal hari `progress_at` dan awal hari sekarang (tidak negatif), `null` bila `current_stage->isClosed()`; `can_comment` dari `$actor->can('create', [DealComment::class, $transaction])`; `feed` memakai `$request->validate(['kind' => ['required', 'in:comments,activities'], 'page' => ['sometimes', 'integer', 'min:1']])` lalu `paginate(kinds: ...)`; daftarkan route `GET transactions/{transaction}/feed` bernama `transactions.feed` di grup yang sama dengan `transactions.show`.
- [ ] **Step 4: Jalankan** `php artisan test --filter="TransactionDetailPayloadTest|TransactionCreateFlowTest|TransactionListContractTest"` → PASS.
- [ ] **Step 5: Commit** `feat(transactions): add detail header data and a paged feed endpoint`.

### Task 3: Logika murni `lib/transaction-detail.ts`

**Files:**
- Create: `resources/js/lib/transaction-detail.ts` (tanpa impor `@/`, agar bisa dijalankan `node --test`)
- Test: `tests/Frontend/transaction-detail.test.mjs`

**Interfaces:**
- Produces:
  - `clampPanelWidth(requested: number, container: number): number` — batas minimum kanan 160 dan kiri 300.
  - `daysInStageLabel(days: number | null): string | null` — `12 → "12 hari di tahap ini"`, `0 → "Baru pindah tahap hari ini"`, `null → null`.
  - `mergeEarlier<T extends { key: string }>(shown: T[], page: T[]): T[]` — `page` terbaru dulu; hasil urut terlama ke terbaru, tanpa key ganda.
  - `areaPatch(chosen: string[]): { area: { region_code: string; district_code: string | null; other_city: string | null } | null } | null`; `financingPatch(chosen: string[]): { financing: { type: string; leasing_id: string | null; other_name: string | null } | null } | null`. `null` berarti belum lengkap, jangan kirim. Pilihan: `[]`/`['']` → `{area: null}`; `['32.17']` → `null`; `['32.17','32.17.08']` → lengkap; `['other']` → `null`; `['other','Bandung']` → `{region_code:'other', district_code:null, other_city:'Bandung'}`. Pembiayaan: `['']` → `{financing: null}`; `['cash']` lengkap; `['credit']` → `null`; `['credit','5']` → `leasing_id '5'`; `['credit','other']` → `null`; `['credit','other','X']` → `leasing_id 'other', other_name 'X'`.

- [ ] **Step 1: Tulis tes** untuk tiap fungsi dengan nilai di atas, termasuk `mergeEarlier` dari 25 item (halaman 1 = 20 terbaru, halaman 2 = 5 tertua → 25 unik terurut naik) dan `clampPanelWidth(50, 1000) === 160`, `clampPanelWidth(900, 1000) === 700`.
- [ ] **Step 2: Jalankan** `pnpm run test:frontend` → FAIL (modul tidak ada).
- [ ] **Step 3: Implementasi** fungsi di atas.
- [ ] **Step 4: Jalankan** `pnpm run test:frontend` dan `pnpm run check` → PASS.
- [ ] **Step 5: Commit** `feat(transactions): add pure helpers for the detail modal`.

### Task 4: Ekstraksi bersama tanpa perubahan perilaku

**Files:**
- Create: `resources/js/lib/transaction-labels.ts`
- Modify: `resources/js/pages/transactions/index.tsx:116-168` (pindahkan `CHANNEL_LABELS`, `formatDate`, `sourceLabel`, `areaLabel`, `supervisorLabel`, `financingLabel` apa adanya lalu impor), `resources/js/components/transaction-timeline.tsx` (ekstrak `<li>` menjadi komponen terekspor)

**Interfaces:**
- Produces: modul `transaction-labels` mengekspor enam simbol di atas dengan tanda tangan lama; `TimelineEntry({ event, onReply, onEdit, className }: { event: TimelineEvent; onReply?: (c: TimelineComment) => void; onEdit?: (c: TimelineComment) => void; className?: string })` di `transaction-timeline.tsx`, dipakai juga oleh `TransactionTimeline`.

- [ ] **Step 1: Pindahkan** fungsi/konstanta label; **ekstrak** `TimelineEntry` dari isi `page.data.map` (JSX sama persis, `key` tetap di pemanggil).
- [ ] **Step 2: Jalankan** `pnpm run check`, `pnpm run types:check`, `pnpm run test:frontend` → PASS; `php artisan test --filter="CustomerHistory|Coaching"` → PASS (halaman coaching dan riwayat pelanggan tidak berubah).
- [ ] **Step 3: Commit** `refactor(transactions): share labels and the timeline entry`.

### Task 5: Properti yang bisa diedit

**Files:**
- Create: `resources/js/components/transaction-detail/property-picker.tsx`, `resources/js/components/transaction-detail/detail-properties.tsx`
- Modify: `resources/js/types/history.ts` (tambah `TransactionDetailData`: bentuk JSON `show` Task 2 termasuk `stages`, `comments`, `days_in_stage`, `can_comment`, `can_edit_metadata`, `sales`, `supervisors`)

**Interfaces:**
- Consumes: `areaPatch`, `financingPatch` (Task 3), label (Task 4).
- Produces:
  - `PropertyPicker({ label, display, disabled, getStep, onCommit }: { label: string; display: string; disabled: boolean; getStep: (chosen: string[]) => PickerStep | null; onCommit: (chosen: string[]) => void })` dengan `type PickerStep = { title: string; options: { value: string; label: string }[] } | { title: string; text: true }`. Tombol pemicu bernama `"{label}: {display}"`, tampil seperti teks biasa dan abu-abu saat hover; klik membuka panel dengan kolom cari, daftar `role="option"`, tombol "Kembali" (kecuali langkah pertama), dan untuk langkah `text` satu input dengan "Simpan". `onCommit(chosen)` dipanggil bila `getStep(chosen)` mengembalikan `null`. Panel di-portal ke elemen `[role="dialog"]` terdekat dan diposisikan seperti `Combobox`; Escape/klik di luar menutup.
  - `DetailProperties({ detail, regions, districts, leasings, canEdit, onSaved }: {...})` merender baris ikon + label + nilai (grid `repeat(auto-fit, minmax(270px, 1fr))`), urutan Area, Pembiayaan, Sumber, Estimasi nilai, Estimasi closing, Telepon, Media sosial, lalu pemisah dan `<textarea aria-label="Keterangan" placeholder="Tambah keterangan…">` tanpa border yang tingginya mengikuti isi. Area dan Pembiayaan memakai `PropertyPicker` (Area: Kabupaten/Kota termasuk "Kota Lain" → nama kota; lalu Kecamatan. Pembiayaan: Belum ditentukan/Cash/Kredit; Kredit → Leasing termasuk "Kredit Lain" → nama leasing). Simpan: `router.patch('/transactions/{public_id}', patch, { preserveScroll: true, preserveState: true, onSuccess, onError })`; keterangan disimpan saat `blur` bila berubah. Sukses → "Tersimpan" ~1,6 detik dan `onSaved()`; gagal → nilai kembali, teks galat `role="alert"`. Tanpa `canEdit`: tanpa pemicu klik dan `readOnly` pada keterangan.

- [ ] **Step 1: Implementasi `PropertyPicker`** sesuai antarmuka; satu catatan perilaku: `getStep([])` langkah pertama, `getStep(['32.17'])` langkah kecamatan, dan seterusnya.
- [ ] **Step 2: Implementasi `DetailProperties`**; payload hanya bagian berubah (`areaPatch`/`financingPatch`, `null` → tidak mengirim).
- [ ] **Step 3: Jalankan** `pnpm run check` dan `pnpm run types:check` → PASS. Verifikasi perilaku di Task 7 (komponen belum dipasang).
- [ ] **Step 4: Commit** `feat(transactions): add inline editable properties and picker`.

### Task 6: Modal dua panel dan pemasangan

**Files:**
- Create: `resources/js/components/transaction-detail/transaction-detail-modal.tsx`, `resources/js/components/transaction-detail/use-transaction-feed.ts`, `resources/js/components/transaction-detail/stage-timeline.tsx`
- Modify: `resources/js/pages/transactions/index.tsx` (hapus state `edit`/`detail`/`detailState`, `openDetail`, `startEdit`, `saveEdit`, helper `initialAreaFinancing`, dan blok `<Dialog>` detail di baris 1428-1619; pasang `<TransactionDetailModal>`)

**Interfaces:**
- Consumes: `DetailProperties` (Task 5), `TimelineEntry` (Task 4), `clampPanelWidth`, `daysInStageLabel`, `mergeEarlier` (Task 3), `useIsMobile` dari `@/hooks/use-mobile` (periksa nama ekspor dan ambang lebarnya; pakai 768px sebagai batas `md`).
- Produces:
  - `TransactionDetailModal({ target, onClose, regions, districts, leasings }: { target: Transaction | null; onClose: () => void; regions: Region[]; districts: District[]; leasings: Leasing[] })`. Memuat `GET /transactions/{public_id}` (pola penghitung `detailRequest` lama agar jawaban lambat tidak menimpa), menampilkan keadaan memuat dan galat dengan "Coba lagi".
  - `useTransactionFeed(publicId: string, kind: 'comments' | 'activities', initial: HistoryPage<TimelineEvent> | null, enabled: boolean): { events: TimelineEvent[]; hasEarlier: boolean; loadEarlier: () => void; reload: () => void; state: 'idle' | 'loading' | 'error' }` — `events` terlama ke terbaru; `loadEarlier` mengambil halaman berikutnya dari `/transactions/{id}/feed` dan menggabung dengan `mergeEarlier`; aktivitas baru diambil saat `enabled` pertama kali benar.
  - `StageTimeline({ page }: { page: HistoryPage<TimelineEvent> | null })`.
- Tata letak desktop (`md` ke atas): header (pelanggan · kendaraan, badge tahap, Sales, Supervisor, `daysInStageLabel`, sisakan ruang untuk tombol tutup `pr-12`) → badan `grid` kolom `1fr | pemisah 6px | lebar-kanan | rail 40px`; kiri = `DetailProperties`, pemisah, `StageTimeline`; kanan = judul mode, daftar `TimelineEntry` (komentar dengan `onReply`/`onEdit` bila `can_comment`), kolom tulis hanya di mode Komentar dan bila `can_comment` (logika kirim/balas/edit disalin dari `pages/transactions/coaching.tsx` ke `POST /transactions/{id}/comments` dan `PATCH /comments/{id}`, lalu `reload()`), "Muat sebelumnya" bila `hasEarlier`. Lebar kanan awal ≈ 200px (sepertiga modal), pemisah `role="separator"` `aria-orientation="vertical"` `tabIndex=0` bisa digeser pointer dan panah kiri/kanan (langkah 16, `clampPanelWidth`). Rail: tombol `»`/`«` "Lipat panel kanan"/"Buka panel kanan", "Komentar", "Aktivitas" dengan `aria-pressed`; menekan ikon mode saat terlipat membuka panel. Mobile (< `md`): satu kolom, rail berisi "Detail", "Komentar", "Aktivitas", tanpa pemisah dan tombol lipat. Modal dibuka di mode Komentar; `DialogContent` tinggi `90dvh`, `sm:max-w-5xl`, tiap panel `overflow-y-auto`.

- [ ] **Step 1: Implementasi** hook, `StageTimeline`, dan modal sesuai antarmuka; pasang di `index.tsx` dan hapus kode dialog lama beserta impor yang tak terpakai (`AreaFields`/`FinancingFields` tetap dipakai form lain? periksa; hapus hanya yang tak terpakai).
- [ ] **Step 2: Jalankan** `pnpm run check`, `pnpm run types:check`, `pnpm run build` → PASS.
- [ ] **Step 3: Verifikasi manual** di browser (server dev, akun seed Sales/Supervisor): modal terbuka dengan data benar, ganti mode rail, geser dan lipat panel, kirim komentar baru, balas, edit. Catat hasil.
- [ ] **Step 4: Commit** `feat(transactions): redesign the transaction detail modal`.

### Task 7: Tes browser, dokumen, dan verifikasi akhir

**Files:**
- Modify: `tests/Browser/transactions-financing-roles.js:152-172`, `tests/Browser/acceptance-flow.js:272-279,331-344`, `docs/superpowers/specs/2026-11-09-transaction-detail-modal-design.md`, `docs/agents/README.md`, `docs/agents/memory.md`
- Create: `tests/Browser/transaction-detail-modal.js`

**Interfaces:**
- Consumes: pemicu properti bernama `"Area: …"`/`"Pembiayaan: …"`, textarea `aria-label="Keterangan"`, tombol rail "Komentar"/"Aktivitas"/"Lipat panel kanan", separator, dan teks "Tersimpan".

- [ ] **Step 1: Perbarui skrip lama** — ganti klik "Ubah area, pembiayaan dan keterangan" dan `select`/`#edit-*` dengan alur picker (klik pemicu Area → pilih Kabupaten/Kota → pilih Kecamatan; Pembiayaan → Cash) dan `getByLabel('Keterangan').fill(...)` + blur; heading "Detail transaksi" tetap valid.
- [ ] **Step 2: Skrip baru `transaction-detail-modal.js`** (pola `transactions-financing-roles.js`): untuk Admin di 1440, 768, 390px — modal terbuka, tanpa horizontal scroll; geser separator mengubah lebar dan batas minimum bertahan; lipat dan buka panel; rail berganti Komentar/Aktivitas (kolom tulis hanya di Komentar); wilayah dipilih lalu picker ditutup tanpa kecamatan → tidak ada request PATCH dan nilai lama tetap; Kota Lain + nama kota tersimpan; simpan gagal (`page.route` memaksa 422) → nilai kembali dan `role="alert"`; akun tanpa izin (transaksi DO) → tidak ada pemicu dan keterangan `readOnly`; mobile: rail memilih Detail/Komentar/Aktivitas satu per satu.
- [ ] **Step 3: Dokumen** — ubah status spec dan baris manifest README menjadi diimplementasikan (setelah PR dibuka, sebutkan nomor PR); `memory.md`: catat keadaan terverifikasi dan tes yang dijalankan.
- [ ] **Step 4: Jalankan** `pnpm run build`, lalu `pwsh -NoProfile -File tests/Browser/run-isolated.ps1`, dan `composer ci:check` → semua PASS. Bila ada yang tidak dapat dijalankan, laporkan alasan dan risikonya.
- [ ] **Step 5: Commit** `test(transactions): cover the redesigned detail modal` lalu `docs(transactions): record the detail modal design and plan`; buka PR dari branch kerja.
