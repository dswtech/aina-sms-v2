import { Form, Head, router } from '@inertiajs/react';
import { MailPlus, Search, UserRoundCheck, UsersRound } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

type UserRow = {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    is_self: boolean;
};

type InvitationRow = Omit<UserRow, 'status' | 'is_self'> & {
    status: 'valid' | 'expired' | 'revoked' | 'used';
    expires_at: string;
};

type Props = {
    users: UserRow[];
    invitations: InvitationRow[];
    teams: { id: number; name: string }[];
    filters: { q: string; status: string };
};

const roleLabels: Record<string, string> = {
    admin: 'Admin',
    branch_manager: 'Branch Manager',
    supervisor: 'Supervisor',
    sales: 'Sales',
};

const statusLabels: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
    valid: 'Diundang',
    expired: 'Kedaluwarsa',
    revoked: 'Dicabut',
    used: 'Sudah digunakan',
};

function StatusBadge({ status }: { status: string }) {
    const variant =
        status === 'active'
            ? 'default'
            : status === 'inactive' || status === 'revoked'
              ? 'destructive'
              : 'secondary';

    return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

function UserActions({ user }: { user: UserRow }) {
    const activating = user.status === 'inactive';
    const disabled = user.is_self && !activating;

    return (
        <Form
            action={`/users/${user.id}/status`}
            method="patch"
            className="flex justify-end"
        >
            {({ processing }) => (
                <>
                    <input
                        type="hidden"
                        name="is_active"
                        value={activating ? '1' : '0'}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={processing || disabled}
                        title={
                            disabled
                                ? 'Akun sendiri tidak dapat dinonaktifkan.'
                                : undefined
                        }
                    >
                        {processing && <Spinner />}
                        {activating ? 'Aktifkan' : 'Nonaktifkan'}
                    </Button>
                </>
            )}
        </Form>
    );
}

function InvitationActions({ invitation }: { invitation: InvitationRow }) {
    const terminal = ['revoked', 'used'].includes(invitation.status);

    return (
        <div className="flex flex-wrap justify-end gap-2">
            <Form action={`/invitations/${invitation.id}/resend`} method="post">
                {({ processing }) => (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={processing || terminal}
                        title={
                            terminal
                                ? 'Undangan terminal tidak dapat dikirim ulang.'
                                : undefined
                        }
                    >
                        {processing && <Spinner />}
                        Kirim ulang
                    </Button>
                )}
            </Form>
            <Form
                action={`/invitations/${invitation.id}/revoke`}
                method="patch"
            >
                {({ processing }) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={processing || terminal}
                        title={
                            terminal
                                ? 'Undangan ini tidak dapat dicabut.'
                                : undefined
                        }
                    >
                        Cabut
                    </Button>
                )}
            </Form>
        </div>
    );
}

function InviteDialog({ teams }: { teams: Props['teams'] }) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState('sales');
    const needsTeam = role === 'sales' || role === 'supervisor';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <MailPlus aria-hidden="true" />
                    Undang pengguna
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Undang pengguna</DialogTitle>
                    <DialogDescription>
                        Role dan tim dikunci oleh Admin. Penerima menetapkan
                        password sendiri dari tautan sekali pakai.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action="/invitations"
                    method="post"
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5 pt-2"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="invite-name">
                                    Nama lengkap
                                </Label>
                                <Input
                                    id="invite-name"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="invite-email">Email</Label>
                                <Input
                                    id="invite-email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="invite-role">Role</Label>
                                <Select
                                    name="role"
                                    value={role}
                                    onValueChange={setRole}
                                >
                                    <SelectTrigger
                                        id="invite-role"
                                        className="min-h-11 w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sales">
                                            Sales
                                        </SelectItem>
                                        <SelectItem value="supervisor">
                                            Supervisor
                                        </SelectItem>
                                        <SelectItem value="branch_manager">
                                            Branch Manager
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.role} />
                            </div>
                            {needsTeam && (
                                <div className="grid gap-2">
                                    <Label htmlFor="invite-team">Tim</Label>
                                    <Select name="team_id" required>
                                        <SelectTrigger
                                            id="invite-team"
                                            className="min-h-11 w-full"
                                        >
                                            <SelectValue placeholder="Pilih tim" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem
                                                    key={team.id}
                                                    value={String(team.id)}
                                                >
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.team_id} />
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="mt-1 w-full"
                                disabled={
                                    processing ||
                                    (needsTeam && teams.length === 0)
                                }
                            >
                                {processing && <Spinner />}
                                Kirim undangan
                            </Button>
                            {needsTeam && teams.length === 0 && (
                                <p className="text-sm text-destructive">
                                    Buat tim aktif sebelum mengundang Sales atau
                                    Supervisor.
                                </p>
                            )}
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function UsersIndex({
    users,
    invitations,
    teams,
    filters,
}: Props) {
    const [query, setQuery] = useState(filters.q);
    const rows = [
        ...users.map((user) => ({ kind: 'user' as const, item: user })),
        ...invitations.map((invitation) => ({
            kind: 'invitation' as const,
            item: invitation,
        })),
    ];

    function applyFilters(nextStatus = filters.status) {
        router.get(
            '/users',
            { q: query || undefined, status: nextStatus },
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Pengguna & Undangan" />
            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <UsersRound className="size-4" aria-hidden="true" />
                            Administrasi dealer
                        </div>
                        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                            Pengguna & Undangan
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                            Kelola akses tanpa membagikan password atau
                            menghapus riwayat pengguna.
                        </p>
                    </div>
                    <InviteDialog teams={teams} />
                </header>

                <section className="mt-8 rounded-xl border bg-card">
                    <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_180px_auto] sm:p-5">
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') applyFilters();
                                }}
                                className="min-h-11 pl-10"
                                placeholder="Cari nama, username, atau email"
                                aria-label="Cari pengguna"
                            />
                        </div>
                        <Select
                            value={filters.status}
                            onValueChange={(value) => applyFilters(value)}
                        >
                            <SelectTrigger
                                className="min-h-11 w-full"
                                aria-label="Filter status"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua status
                                </SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="inactive">
                                    Nonaktif
                                </SelectItem>
                                <SelectItem value="invited">
                                    Diundang
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => applyFilters()}
                        >
                            Terapkan
                        </Button>
                    </div>

                    {rows.length === 0 ? (
                        <div className="grid place-items-center px-5 py-16 text-center">
                            <UserRoundCheck
                                className="size-10 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <h2 className="mt-4 font-semibold">
                                Tidak ada data ditemukan
                            </h2>
                            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                                Ubah pencarian atau filter status untuk melihat
                                data lain.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-5 py-3">
                                                Pengguna
                                            </th>
                                            <th className="px-5 py-3">Role</th>
                                            <th className="px-5 py-3">
                                                Status
                                            </th>
                                            <th className="px-5 py-3 text-right">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rows.map(({ kind, item }) => (
                                            <tr key={`${kind}-${item.id}`}>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-foreground">
                                                        {item.name}
                                                    </p>
                                                    <p className="mt-1 text-muted-foreground">
                                                        @{item.username} ·{' '}
                                                        {item.email}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {roleLabels[item.role]}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge
                                                        status={item.status}
                                                    />
                                                </td>
                                                <td className="px-5 py-4">
                                                    {kind === 'user' ? (
                                                        <UserActions
                                                            user={item}
                                                        />
                                                    ) : (
                                                        <InvitationActions
                                                            invitation={item}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="divide-y md:hidden">
                                {rows.map(({ kind, item }) => (
                                    <article
                                        key={`${kind}-${item.id}`}
                                        className="grid gap-4 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="truncate font-semibold">
                                                    {item.name}
                                                </h2>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                    @{item.username}
                                                </p>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        <div className="grid gap-1 text-sm">
                                            <span>{roleLabels[item.role]}</span>
                                            <span className="break-all text-muted-foreground">
                                                {item.email}
                                            </span>
                                        </div>
                                        {kind === 'user' ? (
                                            <UserActions user={item} />
                                        ) : (
                                            <InvitationActions
                                                invitation={item}
                                            />
                                        )}
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>
        </>
    );
}
