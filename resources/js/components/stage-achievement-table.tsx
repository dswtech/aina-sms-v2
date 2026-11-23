import { stageLabel } from '@/components/team-performance';

export type StageAchievementData = {
    stages: string[];
    rows: { id: number; name: string; counts: Record<string, number> }[];
    totals: Record<string, number>;
};

export function StageAchievementTable({
    data,
    caption,
}: {
    data: StageAchievementData;
    caption?: string;
}) {
    return (
        <section
            aria-labelledby="stage-achievement-title"
            className="min-w-0 overflow-hidden rounded-xl border bg-card"
        >
            <div className="border-b p-5">
                <h2
                    id="stage-achievement-title"
                    className="text-base font-semibold"
                >
                    Capaian per tahap{caption && ` · ${caption}`}
                </h2>
            </div>
            {/* Phone: one card per Sales so SPK and DO stay visible without sideways scroll. */}
            <ul className="text-sm md:hidden">
                {data.rows.length === 0 && (
                    <li className="px-5 py-6 text-center text-muted-foreground">
                        Belum ada Sales.
                    </li>
                )}
                {[
                    ...data.rows,
                    { id: 'total', name: 'Total', counts: data.totals },
                ].map((row) => (
                    <li
                        key={row.id}
                        className={`striped-row px-5 py-4 ${row.id === 'total' ? 'border-t font-semibold' : ''}`}
                    >
                        <h3 className="font-medium">{row.name}</h3>
                        <dl className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2">
                            {data.stages.map((stage) => (
                                <div key={stage} className="min-w-0">
                                    <dt className="truncate text-xs font-normal text-muted-foreground">
                                        {stageLabel(stage)}
                                    </dt>
                                    <dd className="tabular-nums">
                                        {row.counts[stage] ?? 0}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </li>
                ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                            <th scope="col" className="px-5 py-3 font-medium">
                                Sales
                            </th>
                            {data.stages.map((stage) => (
                                <th
                                    key={stage}
                                    scope="col"
                                    className="px-3 py-3 text-right font-medium whitespace-nowrap"
                                >
                                    {stageLabel(stage)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={data.stages.length + 1}
                                    className="px-5 py-6 text-center text-muted-foreground"
                                >
                                    Belum ada Sales.
                                </td>
                            </tr>
                        )}
                        {data.rows.map((row) => (
                            <tr key={row.id}>
                                <th
                                    scope="row"
                                    className="px-5 py-3 text-left font-medium whitespace-nowrap"
                                >
                                    {row.name}
                                </th>
                                {data.stages.map((stage) => (
                                    <td
                                        key={stage}
                                        className="px-3 py-3 text-right tabular-nums"
                                    >
                                        {row.counts[stage] ?? 0}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t font-semibold">
                            <th scope="row" className="px-5 py-3 text-left">
                                Total
                            </th>
                            {data.stages.map((stage) => (
                                <td
                                    key={stage}
                                    className="px-3 py-3 text-right tabular-nums"
                                >
                                    {data.totals[stage] ?? 0}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </section>
    );
}
