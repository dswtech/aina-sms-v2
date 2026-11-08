import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { monthRangeError } from '@/lib/month-range';

export function MonthRangeFields({
    id,
    from,
    to,
    onChange,
    disabled = false,
}: {
    id: string;
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    disabled?: boolean;
}) {
    const error = monthRangeError(from, to);
    return (
        <fieldset className="min-w-0 space-y-2" disabled={disabled}>
            <legend className="mb-2 text-sm font-medium">Rentang bulan</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                    <Label htmlFor={`${id}-from`}>Dari bulan</Label>
                    <Input
                        id={`${id}-from`}
                        type="month"
                        min="0001-01"
                        max={to || '9999-12'}
                        value={from}
                        onChange={(event) => onChange(event.target.value, to)}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className="w-full"
                    />
                </div>
                <div className="min-w-0 space-y-2">
                    <Label htmlFor={`${id}-to`}>Sampai bulan</Label>
                    <Input
                        id={`${id}-to`}
                        type="month"
                        min={from || '0001-01'}
                        max="9999-12"
                        value={to}
                        onChange={(event) => onChange(from, event.target.value)}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className="w-full"
                    />
                </div>
            </div>
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </fieldset>
    );
}
