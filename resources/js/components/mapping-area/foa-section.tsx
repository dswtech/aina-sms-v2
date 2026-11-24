import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { ChartExportMenu } from '@/components/chart-export-menu';
import { AreaMap } from '@/components/mapping-area/area-map';
import { BarRow } from '@/components/mapping-area/bar-row';
import { formatShare } from '@/lib/area-map';
import { chartRowColor } from '@/lib/chart-export';
import type { AreaReportData, ChartExportData } from '@/lib/chart-export';

export function FoaSection({
    result,
    chart,
    byTeam,
}: {
    result: AreaReportData;
    chart: ChartExportData;
    byTeam: boolean;
}) {
    const [active, setActive] = useState<string | null>(null);
    const districts = result.districts.filter((row) => row.id !== 'other');
    const sold = districts.filter((row) => row.count > 0);
    const empty = districts.filter((row) => row.count === 0);
    const maximum = Math.max(1, ...districts.map((row) => row.count));
    const selected = districts.find((row) => row.id === active);
    const scope = byTeam ? ' dari tim Anda' : '';
    return (
        <section aria-labelledby="mapping-foa" className="space-y-3">
            <div>
                <h2 id="mapping-foa" className="text-lg font-semibold">
                    Persebaran di FOA
                </h2>
                <p className="text-sm text-muted-foreground">
                    {sold.length} dari {districts.length} kecamatan sudah ada DO
                    {scope}.
                </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <section
                    aria-labelledby="mapping-foa-map"
                    className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
                >
                    <div className="flex items-start justify-between gap-3">
                        <h3 id="mapping-foa-map" className="font-semibold">
                            DO per kecamatan FOA
                        </h3>
                        <ChartExportMenu chart={chart} />
                    </div>
                    <AreaMap
                        districts={districts}
                        active={active}
                        onActive={setActive}
                    />
                    <p
                        aria-live="polite"
                        className="mt-3 text-sm text-muted-foreground"
                    >
                        {selected
                            ? `${selected.name}: ${selected.count} DO, ${formatShare(selected.count, result.total)} dari seluruh DO`
                            : 'Sentuh kecamatan untuk melihat nama dan porsinya. Batas wilayah disederhanakan.'}
                    </p>
                </section>
                <section
                    aria-labelledby="mapping-foa-rank"
                    className="min-w-0 rounded-xl border bg-card p-5 sm:p-6"
                >
                    <h3 id="mapping-foa-rank" className="font-semibold">
                        Peringkat kecamatan
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Jumlah DO dan porsinya dari seluruh DO.
                    </p>
                    {sold.length > 0 && (
                        <ul className="mt-4">
                            {sold.map((row) => (
                                <li
                                    key={row.id}
                                    className={
                                        row.id === active
                                            ? 'rounded bg-muted'
                                            : undefined
                                    }
                                    onPointerEnter={() => setActive(row.id)}
                                >
                                    <BarRow
                                        label={row.name}
                                        parts={[
                                            {
                                                count: row.count,
                                                color: chartRowColor(
                                                    chart.kind,
                                                    row.id,
                                                ),
                                            },
                                        ]}
                                        maximum={maximum}
                                        total={result.total}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    {empty.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                            <h4 className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                                <CircleAlert
                                    aria-hidden="true"
                                    className="size-4 shrink-0"
                                />
                                Belum ada DO{scope} ({empty.length})
                            </h4>
                            <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
                                {empty.map((row) => (
                                    <li
                                        key={row.id}
                                        className={`rounded-md border px-2 py-0.5 ${row.id === active ? 'border-foreground' : ''}`}
                                        onPointerEnter={() => setActive(row.id)}
                                    >
                                        {row.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-muted-foreground">
                        {result.total - result.foa} DO lainnya berasal dari luar
                        FOA.
                    </p>
                </section>
            </div>
        </section>
    );
}
