import { Head, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/lib/navigation';
import { dashboard } from '@/routes';
import type { UserRole } from '@/types';

const operationalCopy: Record<
    Exclude<UserRole, 'sales'>,
    {
        title: string;
        description: string;
        metrics: Array<{ label: string; value: string; note: string }>;
        attention: string[];
        scope: string;
    }
> = {
    supervisor: {
        title: 'Kinerja tim hari ini',
        description:
            'Pantau gap dan arahkan tindak lanjut pada transaksi yang paling membutuhkan perhatian.',
        metrics: [
            { label: 'Target bulan ini', value: '12', note: 'unit' },
            { label: 'Realisasi', value: '7', note: '58% target' },
            { label: 'Forecast', value: '10,4', note: 'perkiraan berbobot' },
            { label: 'Gap', value: '2', note: 'unit ke target' },
        ],
        attention: [
            '3 follow-up tim melewati jadwal',
            '2 transaksi belum memiliki aktivitas terbaru',
            '1 arahan menunggu balasan Sales',
        ],
        scope: 'Hanya data tim yang ditugaskan kepada Anda.',
    },
    branch_manager: {
        title: 'Ringkasan dealer',
        description:
            'Bandingkan pencapaian lintas tim melalui data agregat tanpa membuka kontak atau coaching.',
        metrics: [
            { label: 'Target dealer', value: '42', note: 'unit' },
            { label: 'Realisasi', value: '28', note: '67% target' },
            { label: 'Forecast', value: '36,5', note: 'perkiraan berbobot' },
            { label: 'Tim berisiko', value: '2', note: 'dari 4 tim' },
        ],
        attention: [
            'Tim Utara memiliki gap forecast terbesar',
            'Conversion Prospect ke SPK menurun',
            'Freshness pipeline dua tim perlu ditinjau',
        ],
        scope: 'Drilldown tetap tersanitasi tanpa kontak dan coaching.',
    },
    admin: {
        title: 'Kesiapan operasional',
        description:
            'Kelola akses dan struktur dealer agar pekerjaan tim tetap berjalan dengan kewenangan yang benar.',
        metrics: [
            { label: 'Pengguna aktif', value: '24', note: '4 role' },
            { label: 'Undangan aktif', value: '3', note: 'belum digunakan' },
            { label: 'Tim aktif', value: '4', note: 'seluruh dealer' },
            { label: 'Perlu ditinjau', value: '2', note: 'penempatan akun' },
        ],
        attention: [
            '2 undangan kedaluwarsa perlu diterbitkan ulang',
            '1 Sales belum memiliki penempatan tim',
            'Konfigurasi dealer siap ditinjau',
        ],
        scope: 'Akses audit tidak memberi kemampuan aktivitas penjualan.',
    },
};

function SalesDashboard() {
    const priorities = [
        {
            time: 'Sekarang',
            title: 'Hubungi Raka Pratama',
            detail: 'Follow-up test drive · terlambat 25 menit',
            urgent: true,
        },
        {
            time: '10.30',
            title: 'Konfirmasi pilihan warna',
            detail: 'Maya Sari · Hot Prospect',
        },
        {
            time: '13.00',
            title: 'Kirim simulasi pembiayaan',
            detail: 'Bima Nugraha · Prospect',
        },
        {
            time: 'Besok',
            title: 'Tindak lanjut setelah kunjungan',
            detail: 'Nadia Putri · Lead',
        },
    ];

    return (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <section className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
                    <div>
                        <h2 className="text-base font-semibold">
                            Antrean hari ini
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Urut berdasarkan waktu tindak lanjut.
                        </p>
                    </div>
                    <Badge variant="secondary">4 tindakan</Badge>
                </div>
                <ol className="divide-y">
                    {priorities.map((item) => (
                        <li
                            key={`${item.time}-${item.title}`}
                            className="group flex min-h-20 items-center gap-4 px-5 py-4 sm:px-6"
                        >
                            <div className="w-16 shrink-0">
                                <span
                                    className={
                                        item.urgent
                                            ? 'text-sm font-semibold text-destructive'
                                            : 'text-sm font-medium text-muted-foreground'
                                    }
                                >
                                    {item.time}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                    {item.title}
                                </p>
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                    {item.detail}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label={`Buka ${item.title}`}
                                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <ArrowRight
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </button>
                        </li>
                    ))}
                </ol>
            </section>

            <aside className="rounded-xl border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                    <CheckCircle2
                        aria-hidden="true"
                        className="size-5 text-primary"
                    />
                    <h2 className="text-base font-semibold">Target pribadi</h2>
                </div>
                <p className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
                    7{' '}
                    <span className="text-base text-muted-foreground">
                        / 10 unit
                    </span>
                </p>
                <div
                    role="progressbar"
                    aria-label="Pencapaian target pribadi"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={70}
                    className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
                >
                    <div className="h-full w-[70%] rounded-full bg-primary" />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Tiga unit lagi menuju target bulan ini. Forecast saat ini
                    8,6 unit.
                </p>
            </aside>
        </div>
    );
}

function OperationalDashboard({ role }: { role: Exclude<UserRole, 'sales'> }) {
    const content = operationalCopy[role];

    return (
        <>
            <section className="mt-8 overflow-hidden rounded-xl border bg-card">
                <h2 className="sr-only">Metrik utama</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                    {content.metrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="border-b p-5 sm:p-6 lg:border-r lg:border-b-0 lg:last:border-r-0"
                        >
                            <p className="text-sm font-medium text-muted-foreground">
                                {metric.label}
                            </p>
                            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
                                {metric.value}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {metric.note}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <section className="rounded-xl border bg-card p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <Clock3
                            aria-hidden="true"
                            className="size-5 text-primary"
                        />
                        <h2 className="text-base font-semibold">
                            Perlu perhatian
                        </h2>
                    </div>
                    <ul className="mt-5 divide-y">
                        {content.attention.map((item) => (
                            <li
                                key={item}
                                className="flex min-h-14 items-center gap-3 py-3 text-sm"
                            >
                                <span
                                    aria-hidden="true"
                                    className="size-1.5 shrink-0 rounded-full bg-primary"
                                />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <aside className="rounded-xl border bg-secondary p-5 sm:p-6">
                    <CalendarClock
                        aria-hidden="true"
                        className="size-5 text-secondary-foreground"
                    />
                    <h2 className="mt-4 text-base font-semibold">
                        Cakupan akses
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {content.scope}
                    </p>
                </aside>
            </div>
        </>
    );
}

export default function Dashboard() {
    const { auth } = usePage().props;
    const role = auth.user.role;
    const copy = role === 'sales' ? null : operationalCopy[role];

    return (
        <>
            <Head title="Beranda" />
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-10 lg:px-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">Data contoh</Badge>
                            <span className="text-sm text-muted-foreground">
                                {roleLabels[role]}
                            </span>
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                            {role === 'sales'
                                ? `Selamat pagi, ${auth.user.name.split(' ')[0]}`
                                : copy?.title}
                        </h1>
                        <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
                            {role === 'sales'
                                ? 'Mulai dari tindakan paling mendesak, lalu selesaikan antrean hari ini.'
                                : copy?.description}
                        </p>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                        Kamis, 30 Oktober 2026
                    </p>
                </header>

                {role === 'sales' ? (
                    <SalesDashboard />
                ) : (
                    <OperationalDashboard role={role} />
                )}
            </main>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Beranda',
            href: dashboard(),
        },
    ],
};
