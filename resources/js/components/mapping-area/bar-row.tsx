import { formatShare } from '@/lib/area-map';

export function BarRow({
    label,
    parts,
    maximum,
    total,
}: {
    label: string;
    parts: { count: number; color: string }[];
    maximum: number;
    total: number;
}) {
    const count = parts.reduce((sum, part) => sum + part.count, 0);
    return (
        <span className="grid min-h-7 grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2rem_3.25rem] items-center gap-3 text-sm">
            <span>{label}</span>
            <span aria-hidden="true" className="flex h-3.5 gap-0.5">
                {parts
                    .filter((part) => part.count > 0)
                    .map((part) => (
                        <span
                            key={part.color}
                            className="last:rounded-r"
                            style={{
                                width: `${(part.count / Math.max(1, maximum)) * 100}%`,
                                background: part.color,
                            }}
                        />
                    ))}
            </span>
            <span className="text-right font-medium tabular-nums">{count}</span>
            <span className="text-right text-muted-foreground tabular-nums">
                {formatShare(count, total)}
            </span>
        </span>
    );
}
