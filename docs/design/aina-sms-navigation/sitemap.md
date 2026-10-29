# Sitemap MVP

```mermaid
flowchart TD
    PUBLIC[Area publik] --> LOGIN[Login]
    PUBLIC --> INVITE[Aktivasi undangan]
    PUBLIC --> FORGOT[Lupa password]
    FORGOT --> RESET[Reset password]

    LOGIN --> HOME[Beranda sesuai role]
    HOME --> SALES[Sales]
    HOME --> SUP[Supervisor]
    HOME --> BM[Branch Manager]
    HOME --> ADMIN[Admin]

    SALES --> S_HOME[Beranda Sales]
    SALES --> S_CUST[Buku Pelanggan Saya]
    S_CUST --> CUST_DETAIL[Profil pelanggan]
    CUST_DETAIL --> QUICK[Aksi cepat dan follow-up]
    CUST_DETAIL --> NEW_TX[Transaksi baru]
    SALES --> S_TX[Transaksi saya]
    S_TX --> TX_DETAIL[Detail transaksi]
    TX_DETAIL --> TIMELINE[Timeline dan coaching]
    TX_DETAIL --> STAGE[Riwayat dan perubahan tahap]

    SUP --> P_HOME[Dashboard tim]
    SUP --> P_CUST[Pelanggan tim]
    SUP --> P_TX[Transaksi tim]
    SUP --> TARGET[Target]
    SUP --> ANALYSIS[Analisis]
    SUP --> IMPORT[Import data]

    BM --> B_HOME[Dashboard dealer]
    BM --> PERFORMANCE[Kinerja tim]
    BM --> ANALYSIS
    ANALYSIS --> SOURCE[Analisis Sumber]
    ANALYSIS --> MODEL[Analisis Model]
    SOURCE --> SANITIZED[Drilldown tersanitasi]
    MODEL --> SANITIZED

    ADMIN --> A_HOME[Beranda Admin]
    ADMIN --> A_CUST[Pelanggan]
    ADMIN --> A_TX[Transaksi dan audit]
    ADMIN --> USERS[Pengguna dan undangan]
    ADMIN --> TEAMS[Tim dan penempatan]
    ADMIN --> ANALYSIS
    ADMIN --> IMPORT
    ADMIN --> DEALER[Pengaturan dealer]

    HOME --> NOTIF[Notifikasi]
    HOME --> PROFILE[Profil]
    HOME --> DENIED[Akses ditolak]
```

## Kontrak route untuk implementasi Inertia

| Area | Route konseptual | Catatan |
|---|---|---|
| Authentication | `/login`, `/invitations/{token}`, `/forgot-password`, `/reset-password/{token}` | Tidak ada registrasi publik. |
| Beranda | `/dashboard` | Isi dan cakupan mengikuti role. |
| Pelanggan | `/customers`, `/customers/{customer}` | Label menu mengikuti role; Branch Manager tidak memiliki route operasional ini. |
| Transaksi | `/transactions`, `/transactions/{transaction}` | Detail direct-linkable; tampil sebagai dialog/sheet dari konteks daftar. |
| Target | `/targets` | Supervisor dalam cakupan tim. |
| Analisis | `/analysis/source`, `/analysis/models` | Cakupan dan sanitasi mengikuti role. |
| Import | `/imports`, `/imports/{batch}` | Admin atau Supervisor sesuai cakupan. |
| Pengguna | `/admin/users`, `/admin/invitations` | Admin. |
| Tim | `/admin/teams`, `/admin/teams/{team}` | Admin. |
| Dealer | `/admin/dealer` | Admin; tidak mengekspos secret. |
| Notifikasi | `/notifications` | Data tetap mengikuti role dan akses objek asal. |
| Profil | `/profile`, `/profile/password` | Semua role. |

Route di atas adalah kontrak arsitektur informasi, bukan API publik. Nama parameter dan controller final mengikuti konvensi Laravel saat implementasi.

## Matriks akses navigasi

| Area | Sales | Supervisor | Branch Manager | Admin |
|---|:---:|:---:|:---:|:---:|
| Dashboard | Pribadi | Tim | Dealer/lintas tim | Dukungan/audit |
| Pelanggan operasional | Ditugaskan | Tim | — | Dealer/audit |
| Transaksi operasional | Ditugaskan | Tim | — | Dealer/audit |
| Coaching | Terkait | Tim terkait | — | Read-only audit |
| Target | Ringkasan pribadi | Kelola tim | Read-only agregat | Read-only dukungan |
| Analisis | — | Tim | Dealer tersanitasi | Dealer |
| Import CSV | — | Tim | — | Dealer |
| Pengguna dan tim | — | — | — | Kelola |
