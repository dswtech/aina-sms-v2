import { Form, Head } from '@inertiajs/react';
import { Plus, UsersRound } from 'lucide-react';
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

type Team = {
    id: string;
    name: string;
    is_active: boolean;
    member_count: number;
};

type Person = {
    id: string;
    name: string;
    username: string;
    role: 'sales' | 'supervisor';
    team_id: string | null;
    team_name: string | null;
};

type Props = { teams: Team[]; people: Person[] };

function CreateTeamDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus aria-hidden="true" />
                    Buat tim
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Buat tim baru</DialogTitle>
                    <DialogDescription>
                        Nama tim harus unik dalam dealer.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action="/teams"
                    method="post"
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5 pt-2"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="team-name">Nama tim</Label>
                                <Input
                                    id="team-name"
                                    name="name"
                                    required
                                    autoFocus
                                />
                                <InputError message={errors.name} />
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Simpan tim
                            </Button>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function TeamCard({ team }: { team: Team }) {
    const [editing, setEditing] = useState(false);

    return (
        <article className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-semibold">{team.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {team.member_count} penempatan aktif
                    </p>
                </div>
                <Badge variant={team.is_active ? 'default' : 'secondary'}>
                    {team.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                <Dialog open={editing} onOpenChange={setEditing}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            Ubah nama
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ubah nama tim</DialogTitle>
                            <DialogDescription>
                                Perubahan nama tidak menghapus riwayat
                                penempatan.
                            </DialogDescription>
                        </DialogHeader>
                        <Form
                            action={`/teams/${team.id}`}
                            method="patch"
                            onSuccess={() => setEditing(false)}
                            className="grid gap-5 pt-2"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`name-${team.id}`}>
                                            Nama tim
                                        </Label>
                                        <Input
                                            id={`name-${team.id}`}
                                            name="name"
                                            defaultValue={team.name}
                                            required
                                            autoFocus
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Simpan perubahan
                                    </Button>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
                <Form action={`/teams/${team.id}`} method="patch">
                    {({ processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="is_active"
                                value={team.is_active ? '0' : '1'}
                            />
                            <Button
                                variant={team.is_active ? 'ghost' : 'outline'}
                                size="sm"
                                disabled={processing}
                                title={
                                    team.is_active
                                        ? 'Semua penempatan aktif akan ditutup dan riwayat dipertahankan.'
                                        : undefined
                                }
                            >
                                {team.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </article>
    );
}

function PlacementEditor({ person, teams }: { person: Person; teams: Team[] }) {
    const [teamId, setTeamId] = useState(person.team_id ?? '');
    const activeTeams = teams.filter((team) => team.is_active);

    return (
        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto]">
            <Form action="/team-memberships" method="post" className="contents">
                {({ processing, errors }) => (
                    <>
                        <input type="hidden" name="user_id" value={person.id} />
                        <Select
                            name="team_id"
                            value={teamId}
                            onValueChange={setTeamId}
                        >
                            <SelectTrigger
                                className="min-h-11 w-full"
                                aria-label={`Tim untuk ${person.name}`}
                            >
                                <SelectValue placeholder="Belum ditempatkan" />
                            </SelectTrigger>
                            <SelectContent>
                                {activeTeams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                        {team.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="submit"
                            variant="outline"
                            disabled={
                                processing ||
                                teamId === '' ||
                                teamId === person.team_id
                            }
                        >
                            {processing && <Spinner />}
                            Simpan
                        </Button>
                        <InputError
                            className="sm:col-span-2"
                            message={errors.team_id ?? errors.user_id}
                        />
                    </>
                )}
            </Form>
            <Form action={`/team-memberships/${person.id}`} method="delete">
                {({ processing }) => (
                    <Button
                        type="submit"
                        variant="ghost"
                        disabled={processing || person.team_id === null}
                        title={
                            person.team_id === null
                                ? 'Pengguna belum mempunyai penempatan aktif.'
                                : 'Tutup penempatan aktif tanpa menghapus riwayat.'
                        }
                    >
                        Lepaskan
                    </Button>
                )}
            </Form>
        </div>
    );
}

export default function TeamsIndex({ teams, people }: Props) {
    return (
        <>
            <Head title="Tim & Penempatan" />
            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <UsersRound className="size-4" aria-hidden="true" />
                            Struktur organisasi
                        </div>
                        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                            Tim & Penempatan
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                            Atur tim aktif dan pindahkan Sales atau Supervisor
                            tanpa menghapus riwayat sebelumnya.
                        </p>
                    </div>
                    <CreateTeamDialog />
                </header>

                <section className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Daftar tim</h2>
                        <span className="text-sm text-muted-foreground">
                            {teams.length} tim
                        </span>
                    </div>
                    {teams.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-5 py-12 text-center text-sm text-muted-foreground">
                            Belum ada tim. Buat tim sebelum menempatkan
                            pengguna.
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {teams.map((team) => (
                                <TeamCard key={team.id} team={team} />
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-10 rounded-xl border bg-card">
                    <div className="border-b p-5">
                        <h2 className="text-lg font-semibold">
                            Penempatan pengguna
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Satu pengguna hanya mempunyai satu penempatan aktif.
                        </p>
                    </div>
                    {people.length === 0 ? (
                        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                            Belum ada Sales atau Supervisor aktif.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {people.map((person) => (
                                <article
                                    key={person.id}
                                    className="grid gap-4 p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.2fr)] lg:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate font-semibold">
                                                {person.name}
                                            </h3>
                                            <Badge variant="secondary">
                                                {person.role === 'sales'
                                                    ? 'Sales'
                                                    : 'Supervisor'}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            @{person.username}
                                            {person.team_name
                                                ? ` · ${person.team_name}`
                                                : ' · Belum ditempatkan'}
                                        </p>
                                    </div>
                                    <PlacementEditor
                                        key={`${person.id}-${person.team_id ?? 'none'}`}
                                        person={person}
                                        teams={teams}
                                    />
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </>
    );
}
