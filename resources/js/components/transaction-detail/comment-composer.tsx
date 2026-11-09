import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { TimelineComment } from '@/types/history';

/** Remount with a new `key` to switch between new, reply and edit. */
export function CommentComposer({
    publicId,
    replyTo,
    editing,
    onDone,
    onCancel,
}: {
    publicId: string;
    replyTo: TimelineComment | null;
    editing: TimelineComment | null;
    onDone: () => void;
    onCancel: () => void;
}) {
    const form = useForm<{ body: string; parent_id: number | null }>({
        body: editing?.body ?? '',
        parent_id: replyTo?.id ?? null,
    });
    const special = editing !== null || replyTo !== null;
    const error = form.errors.body || form.errors.parent_id;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onDone,
        };
        if (editing) form.patch(`/comments/${editing.id}`, options);
        else form.post(`/transactions/${publicId}/comments`, options);
    };

    return (
        <form onSubmit={submit} className="space-y-2 border-t p-3">
            <Label htmlFor="detail-comment-body" className="text-xs">
                {editing
                    ? 'Edit komentar'
                    : replyTo
                      ? `Balas ${replyTo.author_name ?? 'komentar'}`
                      : 'Komentar baru'}
            </Label>
            <textarea
                id="detail-comment-body"
                autoFocus={special}
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
                required
                maxLength={2000}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'detail-comment-error' : undefined}
                placeholder="Tulis komentar coaching"
                className="field-sizing-content max-h-40 min-h-16 w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            {error && (
                <p
                    id="detail-comment-error"
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
                {special && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                    >
                        Batal
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={form.processing}>
                    {editing ? 'Simpan koreksi' : 'Kirim komentar'}
                </Button>
            </div>
        </form>
    );
}
