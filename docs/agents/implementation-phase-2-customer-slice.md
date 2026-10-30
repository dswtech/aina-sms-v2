# Fase 2 — Customer, Assignment, Pipeline & Mobile Slice Implementation Plan

> Eksekusi native mengikuti `PRD.md`, `roadmap.md`, `DESIGN.md`, `ADR-001`, `ADR-002`, `ADR-003`, dan skill `aina-sms-workflow`. Requirement kanonik hanya berada di `PRD.md`. Setiap task wajib memakai siklus TDD (Pest RED → GREEN → regression suite) sebelum commit.

**Tujuan:** Membangun vertical slice Fase 2 pertama yang utuh: Customer → assignment → transaksi → aktivitas → next follow-up → tampilan mobile, yang memberikan alat kerja operasional harian pertama bagi Sales dan Supervisor.

**Arsitektur:** 
- Laravel monolith dengan Inertia 3 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui.
- Customer menjadi entitas kanonik terpisah dari transaksi (satu Customer dapat memiliki banyak transaksi).
- Penugasan Customer (`CustomerAssignment`) mencatat riwayat lengkap kepemilikan hubungan pelanggan sebagai aset dealer.
- Transaksi mencatat peluang penjualan melalui 7 tahap kanonik (`Lead`, `Prospect`, `Hot Prospect`, `SPK`, `DO`, `Delivery`, `Lost`) dengan riwayat tahap append-only.
- Aktivitas mencatat komunikasi nyata dan memperbarui status stagnant serta waktu kontak terakhir.
- Seluruh aturan otorisasi ditegakkan server-side: Sales hanya melihat data miliknya, Supervisor hanya timnya, Branch Manager menerima data agregat tersanitasi (tanpa nomor telepon/kontak pribadi), dan Admin mengaudit lingkup dealer.
- Antarmuka mobile-first: target sentuh minimal 44×44px, tampilan kartu pada mobile (390px) dan tabel pada desktop (1440px), serta detail dialog adaptif.

---

## Batas keselamatan

- Tidak memasang atau memperbarui package tanpa izin pengguna.
- Tidak menjalankan database write atau migrasi non-test pada database non-terisolasi.
- Seluruh feature test berjalan pada database test terisolasi (PostgreSQL / in-memory SQLite untuk unit test cepat).
- Semua perubahan mengikuti Conventional Commits (`feat(...)`, `test(...)`, `fix(...)`, `docs(...)`).
- Seluruh route bisnis terlindungi policy server-side; client/Inertia props tidak menentukan otorisasi.

---

## Rincian Task Vertical Slice Fase 2

### Task 1 — Model & Skema Customer, Phone Normalization, dan Duplicate Warning
**Hasil:** Customer tersimpan terpisah dari transaksi dengan nomor telepon ternormalisasi, preferensi komunikasi, dan deteksi kandidat duplikat.
- [ ] Tulis feature test untuk schema `customers`, normalisasi nomor telepon Indonesia (format E.164 / `+62...`), validasi email/nama, preferensi komunikasi (izin/opt-out WhatsApp/telepon), dan service deteksi duplikat telepon (`CRM-01`, `CRM-02`, `CRM-08`, `CRM-15`).
- [ ] Implementasikan migration `create_customers_table`, model `Customer`, factory, cast, dan helper normalisasi telepon.
- [ ] Implementasikan query scope & service pendeteksi duplikat yang memberi warning tanpa memblokir pembuatan transaksi baru untuk pelanggan yang sama.
- [ ] Verifikasi Pest, lint, dan types.

### Task 2 — Penugasan Customer (Assignment & Reassignment History)
**Hasil:** Customer ditugaskan kepada Sales dengan riwayat penugasan append-only sebagai aset dealer.
- [ ] Tulis feature test penugasan awal ke Sales, penugasan ulang oleh Supervisor/Admin, histori assignment tidak terhapus, dan isolasi antar-tim (`CRM-04`, `CRM-13`, `CRM-14`).
- [ ] Implementasikan migration `create_customer_assignments_table`, model `CustomerAssignment`, relasi `assignedSales`, `activeAssignment`, dan scope pelanggan tim/sales.
- [ ] Buat `CustomerPolicy` dengan kewenangan server-side:
  - Sales: hanya Customer yang sedang aktif ditugaskan kepadanya (`CRM-09`).
  - Supervisor: Customer yang ditugaskan kepada anggota timnya (`CRM-14`).
  - Branch Manager: data agregat tanpa kontak pribadi / nomor telepon (`CRM-07`, `CRM-14`).
  - Admin: audit lingkup dealer.
- [ ] Verifikasi Pest dan types.

### Task 3 — Transaksi & Riwayat Tahap Pipeline (Append-Only)
**Hasil:** Transaksi memiliki satu Customer, kendaraan diminati, Sales PIC, tahap aktif, dan riwayat tahap yang tidak ditimpa.
- [ ] Tulis feature test transaksi dengan 7 tahap kanonik (`Lead`, `Prospect`, `Hot Prospect`, `SPK`, `DO`, `Delivery`, `Lost`), transisi tahap append-only, validasi SPK booking fee, validasi alasan Lost, dan penghitungan status stagnant (>3 hari tanpa aktivitas) (`PIP-01`, `PIP-02`, `PIP-03`, `PIP-04`, `PIP-05`, `PIP-07`).
- [ ] Implementasikan migration `create_deal_transactions_table` dan `create_stage_histories_table`.
- [ ] Buat enum `PipelineStage`, catalog alasan Lost, model `DealTransaction`, `StageHistory`, dan factory.
- [ ] Implementasikan `TransactionPolicy` dan scope query server-side.
- [ ] Verifikasi Pest dan types.

### Task 4 — Aktivitas & Penjadwalan Next Follow-Up
**Hasil:** Aktivitas follow-up tercatat pada timeline dan memperbarui kontak terakhir serta rencana tindak lanjut berikutnya.
- [ ] Tulis feature test pencatatan aktivitas (telepon, WhatsApp, visit, note), pembaruan otomatis `last_contact_at` / `last_activity_at`, dan penjadwalan `next_follow_up` (`PIP-06`, `CRM-10`, `CRM-11`, `CRM-12`).
- [ ] Implementasikan migration `create_customer_activities_table` dan `create_follow_ups_table`.
- [ ] Buat model `CustomerActivity`, `FollowUp`, relasi ke Customer dan Transaksi, serta audit penandaan waktu.
- [ ] Verifikasi Pest dan types.

### Task 5 — Controller & Endpoint Server-Side Buku Pelanggan
**Hasil:** Endpoint Buku Pelanggan Saya melayani data terfilter, sanitasi role, dan pencarian cepat.
- [ ] Tulis feature test request/response `/customers` (Buku Pelanggan Saya), filter kelompok kerja (Follow-up Hari Ini, Belum Dihubungi, Aktif, Tidak Aktif, Pernah Membeli), pencarian nama/nomor telepon, aksi simpan aktivitas, dan buat transaksi (`CRM-06`, `CRM-09`, `CRM-10`, `CRM-11`).
- [ ] Implementasikan `CustomerController`, form request validasi, dan Inertia view response.
- [ ] Pastikan Branch Manager tidak menerima field sensitif (telepon, preferensi, catatan pribadi) pada payload.
- [ ] Verifikasi negative authorization dan audit logging.

### Task 6 — Tampilan Frontend: Buku Pelanggan Saya (Mobile & Desktop)
**Hasil:** Sales memiliki layar phonebook kerja dengan kartu informatif di mobile dan tabel di desktop serta aksi cepat satu sentuhan.
- [ ] Buat halaman `resources/js/pages/customers/index.tsx` dengan daftar pelanggan terbagi dalam filter kelompok kerja dan pencarian cepat (`UIX-01`, `UIX-02`).
- [ ] Komposisi tampilan:
  - Mobile (390px): kartu kerja 2-baris dengan status hubungan, transaksi aktif, kontak terakhir, target sentuh 44px, dan tombol aksi cepat (tel, wa.me, catat aktivitas, jadwalkan follow-up).
  - Desktop (1440px): tabel responsif dengan badge status, kolom sorting, dan menu aksi.
- [ ] Buat komponen form modal/sheet adaptif untuk pembuatan lead baru dan pencatatan follow-up cepat (<60 detik di mobile).
- [ ] Verifikasi build dan browser di 390px, 768px, dan 1440px.

### Task 7 — Dialog Adaptif Detail Transaksi & Alur Lengkap Stage
**Hasil:** Detail transaksi adaptif (full-screen sheet di mobile, large dialog di desktop) dengan perubahan tahap dan alasan Lost.
- [ ] Buat dialog/sheet adaptif detail transaksi (`UIX-03`) yang menampilkan riwayat tahap, aksi ganti tahap, dialog alasan Lost jika berpindah ke Lost, dan timeline aktivitas.
- [ ] Pastikan posisi daftar dan filter tersimpan saat menutup dialog.
- [ ] Jalankan verifikasi linting (`pnpm run check`), type check (`pnpm run types:check`), Pint, PHPStan, dan Pest regression suite.
