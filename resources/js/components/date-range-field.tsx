import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { normalizeDateRange } from '@/lib/date-range';

const inputClass =
    'min-h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none';

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
    const invalid = !!(errorFrom || errorTo);
    return (
        <div className={className}>
            <Label htmlFor={`${id}-from`}>{label}</Label>
            <div
                role="group"
                aria-label={label}
                className="mt-1.5 flex min-h-11 items-center rounded-md border bg-background px-1 focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive"
                aria-invalid={invalid}
            >
                <input
                    id={`${id}-from`}
                    type="date"
                    className={inputClass}
                    aria-label="Tanggal mulai"
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
