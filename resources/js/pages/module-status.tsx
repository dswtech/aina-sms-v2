import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

type ModuleKey =
    | 'customers'
    | 'transactions'
    | 'targets'
    | 'team-performance'
    | 'analytics'
    | 'imports'
    | 'users'
    | 'teams'
    | 'dealer-settings'
    | 'notifications';

const modules: Record<
    ModuleKey,
    { title: string; description: string; next: string }
> = {
    customers: {
        title: 'Pelanggan',
        description:
            'Ruang kerja pelanggan, assignment, dan tindak lanjut akan dibangun pada vertical slice berikutnya.',
        next: 'Customer → assignment → transaksi',
    },
    transactions: {
        title: 'Transaksi',
        description:
            'Pipeline dan detail transaksi akan menggunakan akses server sesuai role yang sedang masuk.',
        next: 'Pipeline Lead sampai Delivery atau Lost',
    },
    targets: {
        title: 'Target',
        description:
            'Target tim dan Sales akan ditambahkan setelah sumber data pelanggan dan transaksi stabil.',
        next: 'Target, realisasi, dan audit perubahan',
    },
    'team-performance': {
        title: 'Kinerja Tim',
        description:
            'Ringkasan lintas tim akan tetap agregat dan tidak mengirim data kontak atau coaching.',
        next: 'Perbandingan tim tersanitasi',
    },
    analytics: {
        title: 'Analisis',
        description:
            'Analisis Sumber dan Model akan direkonsiliasi langsung dengan transaksi sumber.',
        next: 'Sumber, Model, dan drilldown sesuai role',
    },
    imports: {
        title: 'Import Data',
        description:
            'Import CSV akan memakai preview dan validasi sebelum data boleh disimpan.',
        next: 'Template, preview, validasi, dan audit batch',
    },
    users: {
        title: 'Pengguna & Undangan',
        description:
            'Undangan sekali pakai dan status akun akan dibangun di atas fondasi akses ini.',
        next: 'Undangan, aktivasi, dan penonaktifan akun',
    },
    teams: {
        title: 'Tim & Penempatan',
        description:
            'Struktur tim akan menjaga riwayat penempatan tanpa mengubah pelaku pada data lama.',
        next: 'Tim, membership, dan riwayat penempatan',
    },
    'dealer-settings': {
        title: 'Pengaturan Dealer',
        description:
            'Hanya konfigurasi publik dan non-rahasia yang akan tersedia pada halaman ini.',
        next: 'Identitas dealer dan konfigurasi operasional',
    },
    notifications: {
        title: 'Notifikasi',
        description:
            'Notifikasi akan menunjukkan perubahan yang relevan tanpa membawa data sensitif ke role yang tidak berwenang.',
        next: 'Pemberitahuan in-app yang dapat ditindaklanjuti',
    },
};

function customerTitle(role: UserRole): string {
    if (role === 'sales') return 'Buku Pelanggan Saya';
    if (role === 'supervisor') return 'Pelanggan Tim';
    return 'Pelanggan';
}

export default function ModuleStatus({ module }: { module: ModuleKey }) {
    const { auth } = usePage().props;
    const content = modules[module];
    const title =
        module === 'customers' ? customerTitle(auth.user.role) : content.title;

    return (
        <>
            <Head title={title} />
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="max-w-2xl">
                    <Badge variant="secondary">Fondasi akses siap</Badge>
                    <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
                        {title}
                    </h1>
                    <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                        {content.description}
                    </p>
                </div>

                <section className="mt-10 max-w-2xl rounded-xl border bg-card p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0 text-primary"
                        />
                        <div>
                            <h2 className="text-base font-semibold">
                                Route sudah dilindungi server
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Role lain yang tidak berwenang akan menerima
                                akses ditolak meskipun membuka URL ini secara
                                langsung.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 flex items-center gap-2 border-t pt-5 text-sm font-medium text-foreground">
                        <ArrowRight
                            aria-hidden="true"
                            className="size-4 text-primary"
                        />
                        {content.next}
                    </div>
                </section>
            </main>
        </>
    );
}
