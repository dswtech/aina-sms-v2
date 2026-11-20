import { DateRangePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

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
            <Label htmlFor={id}>{label}</Label>
            <DateRangePicker
                id={id}
                className="mt-1.5"
                from={from}
                to={to}
                onChange={onChange}
                aria-invalid={!!(errorFrom || errorTo)}
            />
            <InputError message={errorFrom} />
            <InputError message={errorTo} />
        </div>
    );
}
