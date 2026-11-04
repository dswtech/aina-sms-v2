import { Head, Link, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Comment = {
    id: number;
    body: string;
    author_name: string | null;
    created_at: string | null;
    stage_at_creation_label: string | null;
    can_edit: boolean;
};

type Props = {
    transaction: {
        public_id: string;
        vehicle_model: string;
        stage_label: string;
        can_comment: boolean;
        comments: Array<Comment & { replies: Comment[] }>;
    };
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
});

export default function Coaching({ transaction }: Props) {
    const form = useForm<{ body: string; parent_id: number | null }>({
        body: '',
        parent_id: null,
    });
    const [editingId, setEditingId] = useState<number | null>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    function reset() {
        setEditingId(null);
        form.reset();
        form.clearErrors();
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        if (editingId !== null) {
            form.patch(`/comments/${editingId}`, {
                preserveScroll: true,
                onSuccess: reset,
            });
        } else {
            form.post(`/transactions/${transaction.public_id}/comments`, {
                preserveScroll: true,
                onSuccess: reset,
            });
        }
    }

    function renderComment(comment: Comment, root: boolean) {
        return (
            <article className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">
                        {comment.author_name ?? 'Pengguna'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {comment.created_at
                            ? dateFormatter.format(new Date(comment.created_at))
                            : 'Waktu belum tercatat'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {comment.stage_at_creation_label
                            ? `Saat dikirim: ${comment.stage_at_creation_label}`
                            : 'Tahap saat kirim belum tercatat'}
                    </span>
                </div>
                <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                    {comment.body}
                </p>
                {transaction.can_comment && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {root && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setEditingId(null);
                                    form.setData({
                                        body: '',
                                        parent_id: comment.id,
                                    });
                                    form.clearErrors();
                                    bodyRef.current?.focus();
                                }}
                            >
                                Balas
                            </Button>
                        )}
                        {comment.can_edit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setEditingId(comment.id);
                                    form.setData({
                                        body: comment.body,
                                        parent_id: null,
                                    });
                                    form.clearErrors();
                                    bodyRef.current?.focus();
                                }}
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                )}
            </article>
        );
    }

    return (
        <>
            <Head title="Coaching transaksi" />
            <div className="mx-auto w-full max-w-3xl min-w-0 px-5 py-8 sm:px-8">
                <Link
                    href="/transactions"
                    className="inline-flex min-h-11 items-center text-sm text-primary underline"
                >
                    Kembali ke transaksi
                </Link>
                <h1 className="mt-4 text-2xl font-semibold">
                    Coaching transaksi
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{transaction.vehicle_model}</p>
                    <Badge variant="secondary">{transaction.stage_label}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    Diskusi untuk transaksi ini. Tahap saat komentar dikirim
                    tetap tersimpan.
                </p>
                {transaction.comments.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                        Belum ada komentar.
                    </p>
                ) : (
                    <ul className="mt-6 space-y-4">
                        {transaction.comments.map((comment) => (
                            <li key={comment.id}>
                                {renderComment(comment, true)}
                                {comment.replies.length > 0 && (
                                    <ul className="mt-2 space-y-2 pl-4 sm:pl-6">
                                        {comment.replies.map((reply) => (
                                            <li key={reply.id}>
                                                {renderComment(reply, false)}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {transaction.can_comment ? (
                    <form onSubmit={submit} className="mt-6 space-y-3">
                        <Label htmlFor="coaching-body">
                            {editingId !== null
                                ? 'Edit komentar'
                                : form.data.parent_id !== null
                                  ? 'Balas komentar'
                                  : 'Komentar baru'}
                        </Label>
                        <textarea
                            ref={bodyRef}
                            id="coaching-body"
                            value={form.data.body}
                            onChange={(event) =>
                                form.setData('body', event.target.value)
                            }
                            required
                            maxLength={2000}
                            aria-invalid={Boolean(
                                form.errors.body || form.errors.parent_id,
                            )}
                            aria-describedby={
                                form.errors.body || form.errors.parent_id
                                    ? 'coaching-error'
                                    : undefined
                            }
                            className="min-h-28 w-full rounded-md border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                        />
                        {(form.errors.body || form.errors.parent_id) && (
                            <p
                                id="coaching-error"
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {form.errors.body || form.errors.parent_id}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" disabled={form.processing}>
                                {editingId !== null
                                    ? 'Simpan koreksi'
                                    : 'Kirim Komentar'}
                            </Button>
                            {(editingId !== null ||
                                form.data.parent_id !== null) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={reset}
                                >
                                    Batal
                                </Button>
                            )}
                        </div>
                    </form>
                ) : (
                    <p className="mt-6 text-sm text-muted-foreground">
                        Mode baca untuk audit.
                    </p>
                )}
            </div>
        </>
    );
}

Coaching.layout = {
    breadcrumbs: [{ title: 'Transaksi', href: '/transactions' }],
};
