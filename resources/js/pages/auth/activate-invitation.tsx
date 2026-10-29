import { Form, Head, Link } from '@inertiajs/react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type InvitationState = 'valid' | 'expired' | 'revoked' | 'used' | 'invalid';

type Invitation = {
    name: string;
    email: string;
    username: string;
    role: string;
    team: string | null;
    expires_at: string;
};

type Props = {
    state: InvitationState;
    token: string | null;
    invitation?: Invitation;
};

const terminalCopy: Record<Exclude<InvitationState, 'valid'>, string> = {
    expired: 'Tautan undangan ini sudah kedaluwarsa.',
    revoked: 'Undangan ini sudah dicabut oleh Admin dealer.',
    used: 'Undangan ini sudah pernah digunakan.',
    invalid: 'Tautan undangan tidak valid.',
};

export default function ActivateInvitation({
    state,
    token,
    invitation,
}: Props) {
    if (state !== 'valid' || token === null || invitation === undefined) {
        const unavailableCopy =
            state === 'valid' ? terminalCopy.invalid : terminalCopy[state];

        return (
            <>
                <Head title="Undangan tidak tersedia" />
                <div className="grid gap-6 text-center">
                    <CircleAlert
                        className="mx-auto size-12 text-amber-600"
                        aria-hidden="true"
                    />
                    <div className="grid gap-2">
                        <h1 className="text-xl font-semibold text-foreground">
                            Undangan tidak tersedia
                        </h1>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {unavailableCopy}
                            <br />
                            Hubungi Admin dealer jika Anda masih memerlukan
                            akses.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Kembali ke halaman masuk</Link>
                    </Button>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Aktifkan akun" />
            <div className="grid gap-6">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                    <div className="flex gap-3">
                        <CircleCheck
                            className="mt-0.5 size-5 shrink-0 text-blue-700 dark:text-blue-300"
                            aria-hidden="true"
                        />
                        <div className="grid gap-1">
                            <p className="font-medium">
                                Undangan terverifikasi
                            </p>
                            <p className="leading-5">
                                {invitation.email} · {invitation.role}
                                {invitation.team ? ` · ${invitation.team}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">
                        Username Anda
                    </span>
                    <strong className="font-mono text-base text-foreground">
                        {invitation.username}
                    </strong>
                </div>

                <Form
                    action={`/activate/${encodeURIComponent(token)}`}
                    method="post"
                    resetOnSuccess={['password', 'password_confirmation']}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <InputError message={errors.invitation} />

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password baru</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                    autoFocus
                                    passwordrules="minlength:8;"
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Gunakan minimal 8 karakter. Password hanya
                                    Anda yang mengetahuinya.
                                </p>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Ulangi password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    required
                                    passwordrules="minlength:8;"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Aktifkan akun
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

ActivateInvitation.layout = {
    title: 'Aktifkan akun Anda',
    description:
        'Tetapkan password untuk menyelesaikan undangan ke ruang kerja dealer.',
};
