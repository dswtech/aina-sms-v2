import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { normalizeDateRange } from '@/lib/date-range';

const inputClass = 'h-full min-w-0 flex-1 bg-transparent px-2 outline-none';

export function DateRangeField({
    id,
    label,
    from,
    to,
    onChange,
    errorFrom,
    errorTo,
    className,
}: {
    id: string;
    label: string;
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    errorFrom?: string;
    errorTo?: string;
    className?: string;
}) {
    return (
        <div className={className}>
            <Label htmlFor={`${id}-from`}>{label}</Label>
            <div
                role="group"
                aria-label={label}
                data-slot="input"
                className="mt-1.5 flex h-11 w-full min-w-0 items-center rounded-md border bg-transparent px-1 text-base shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive md:text-sm"
            >
                <input
                    id={`${id}-from`}
                    type="date"
                    className={inputClass}
                    aria-label="Tanggal mulai"
                    aria-invalid={!!errorFrom}
                    max={to || undefined}
                    value={from}
                    onChange={(event) =>
                        onChange(...normalizeDateRange(event.target.value, to))
                    }
                />
                <span className="text-muted-foreground" aria-hidden="true">
                    –
                </span>
                <input
                    id={`${id}-to`}
                    type="date"
                    className={inputClass}
                    aria-label="Tanggal akhir"
                    aria-invalid={!!errorTo}
                    min={from || undefined}
                    value={to}
                    onChange={(event) =>
                        onChange(
                            ...normalizeDateRange(from, event.target.value),
                        )
                    }
                />
            </div>
            <InputError message={errorFrom} />
            <InputError message={errorTo} />
        </div>
    );
}
