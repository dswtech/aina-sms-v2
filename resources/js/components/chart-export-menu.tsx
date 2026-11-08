import { useState } from 'react';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    Image,
    LoaderCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { chartCsv, chartFilename } from '@/lib/chart-export';
import type { ChartExportData } from '@/lib/chart-export';
import { chartPng } from '@/lib/chart-export-png';

function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.append(link);
        link.click();
    } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

export function ChartExportMenu({ chart }: { chart: ChartExportData }) {
    const [busy, setBusy] = useState(false);
    async function exportChart(format: 'png' | 'csv') {
        if (busy) return;
        const snapshot = {
            ...chart,
            rows: chart.rows.map((row) => ({ ...row })),
        };
        setBusy(true);
        const id = toast.loading(
            `Menyiapkan ${format.toUpperCase()} ${snapshot.title}…`,
        );
        try {
            const blob =
                format === 'png'
                    ? await chartPng(snapshot)
                    : new Blob([chartCsv(snapshot)], {
                          type: 'text/csv;charset=utf-8',
                      });
            download(blob, chartFilename(snapshot, format));
            toast.success(`Unduhan ${format.toUpperCase()} dimulai.`, { id });
        } catch {
            toast.error(
                'Unduhan belum dapat dibuat. Buka menu unduh dan coba lagi.',
                { id },
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 gap-1 px-2"
                            aria-busy={busy}
                            aria-label={`Unduh ${chart.title}`}
                        >
                            {busy ? (
                                <LoaderCircle
                                    className="size-4 animate-spin motion-reduce:animate-none"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Download
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            <ChevronDown
                                className="size-3"
                                aria-hidden="true"
                            />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Unduh {chart.title}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
                align="end"
                aria-label={`Pilihan unduhan ${chart.title}`}
            >
                <DropdownMenuItem
                    disabled={busy}
                    onSelect={() => {
                        void exportChart('png');
                    }}
                >
                    <Image aria-hidden="true" />
                    Unduh PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled={busy}
                    onSelect={() => {
                        void exportChart('csv');
                    }}
                >
                    <FileSpreadsheet aria-hidden="true" />
                    Unduh CSV
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
