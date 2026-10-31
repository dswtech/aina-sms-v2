import { Head, router, usePage } from '@inertiajs/react';
import { Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Batch = {
    id: number;
    original_filename: string;
    status: string;
    total_rows: number;
    accepted_count: number;
    rejected_count: number;
    created_at: string;
    actor_name: string | null;
};

type PreviewRow = {
    row_number: number;
    data: Record<string, string | null>;
    errors: string[];
    valid: boolean;
};

type Preview = {
    batch_id: number;
    filename: string;
    rows: PreviewRow[];
    accepted_count: number;
    rejected_count: number;
};

type Props = {
    batches: Batch[];
    preview: Preview | null;
    flash?: { success?: string };
};

export default function ImportsIndex({ batches, preview }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string } };
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const upload = (event: React.FormEvent) => {
        event.preventDefault();
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setSubmitting(true);
        router.post('/imports/preview', formData, {
            forceFormData: true,
            onFinish: () => setSubmitting(false),
        });
    };

    const commit = () => {
        if (!preview) return;
        router.post(`/imports/${preview.batch_id}/commit`);
    };

    return (
        <>
            <Head title="Import Data" />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-8 pb-28 sm:px-8 sm:pt-10 md:pb-10 lg:px-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                            Import Data
                        </h1>
                        <p className="mt-2 max-w-prose text-muted-foreground">
                            Unggah CSV sesuai template. Data divalidasi per
                            baris sebelum disimpan.
                        </p>
                    </div>
                    <a href="/imports/template" className="inline-flex">
                        <Button variant="outline" className="min-h-11">
                            <Download className="size-4" />
                            Unduh template
                        </Button>
                    </a>
                </div>

                {flash?.success && (
                    <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Unggah CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={upload}
                            className="flex flex-col gap-4 sm:flex-row sm:items-end"
                        >
                            <div className="flex-1">
                                <Label htmlFor="csv">File CSV</Label>
                                <Input
                                    id="csv"
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="mt-2 min-h-11"
                                    onChange={(event) =>
                                        setFile(event.target.files?.[0] ?? null)
                                    }
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={!file || submitting}
                                className="min-h-11"
                            >
                                <Upload className="size-4" />
                                Preview
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {preview && (
                    <Card className="mt-6">
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle>Preview: {preview.filename}</CardTitle>
                            <div className="flex gap-2">
                                <Badge variant="secondary">
                                    {preview.accepted_count} valid
                                </Badge>
                                <Badge variant="outline">
                                    {preview.rejected_count} ditolak
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="p-2">Baris</th>
                                            <th className="p-2">Nama</th>
                                            <th className="p-2">Telepon</th>
                                            <th className="p-2">Model</th>
                                            <th className="p-2">Sales</th>
                                            <th className="p-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((row) => (
                                            <tr
                                                key={row.row_number}
                                                className="border-b align-top"
                                            >
                                                <td className="p-2">
                                                    {row.row_number}
                                                </td>
                                                <td className="p-2">
                                                    {row.data.name}
                                                </td>
                                                <td className="p-2">
                                                    {row.data.phone}
                                                </td>
                                                <td className="p-2">
                                                    {row.data.vehicle_model}
                                                </td>
                                                <td className="p-2">
                                                    {row.data.sales_username}
                                                </td>
                                                <td className="p-2">
                                                    {row.valid ? (
                                                        <Badge>Valid</Badge>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <Badge variant="destructive">
                                                                Ditolak
                                                            </Badge>
                                                            <ul className="text-xs text-muted-foreground">
                                                                {row.errors.map(
                                                                    (error) => (
                                                                        <li
                                                                            key={
                                                                                error
                                                                            }
                                                                        >
                                                                            {
                                                                                error
                                                                            }
                                                                        </li>
                                                                    ),
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    onClick={commit}
                                    disabled={preview.accepted_count === 0}
                                    className="min-h-11"
                                >
                                    Import {preview.accepted_count} baris valid
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Riwayat batch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {batches.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Belum ada batch import.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="p-2">File</th>
                                            <th className="p-2">Status</th>
                                            <th className="p-2">Total</th>
                                            <th className="p-2">Diterima</th>
                                            <th className="p-2">Ditolak</th>
                                            <th className="p-2">Pelaku</th>
                                            <th className="p-2">Waktu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batches.map((batch) => (
                                            <tr
                                                key={batch.id}
                                                className="border-b"
                                            >
                                                <td className="p-2">
                                                    {batch.original_filename}
                                                </td>
                                                <td className="p-2">
                                                    <Badge
                                                        variant={
                                                            batch.status ===
                                                            'completed'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {batch.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-2">
                                                    {batch.total_rows}
                                                </td>
                                                <td className="p-2">
                                                    {batch.accepted_count}
                                                </td>
                                                <td className="p-2">
                                                    {batch.rejected_count}
                                                </td>
                                                <td className="p-2">
                                                    {batch.actor_name}
                                                </td>
                                                <td className="p-2">
                                                    {new Date(
                                                        batch.created_at,
                                                    ).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
