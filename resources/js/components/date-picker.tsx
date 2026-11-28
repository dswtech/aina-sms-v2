import {
    CalendarIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const toDate = (value: string): Date | undefined =>
    value ? parseISO(value) : undefined;
export const toIso = (date: Date | undefined): string =>
    date ? format(date, 'yyyy-MM-dd') : '';
const label = (value: string) =>
    format(parseISO(value), 'dd MMM yyyy', { locale: idLocale });

function ClearButton({
    label,
    onClear,
}: {
    label: string;
    onClear: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            data-slot="date-clear"
            onClick={onClear}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none xl:pointer-fine:w-9"
        >
            <XIcon className="size-4" aria-hidden="true" />
        </button>
    );
}

// shadcn "Date of Birth" picker: outline trigger, dropdown captions, closes on pick.
export function DatePicker({
    id,
    value,
    onChange,
    placeholder = 'Pilih tanggal',
    className,
    calendarProps,
    'aria-invalid': ariaInvalid,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    calendarProps?: Omit<
        ComponentProps<typeof Calendar>,
        'mode' | 'selected' | 'onSelect'
    >;
    'aria-invalid'?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className={cn('relative w-full', className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-invalid={ariaInvalid}
                        className={cn(
                            'w-full justify-between px-3 font-normal',
                            value && 'pr-12',
                        )}
                    >
                        {value ? (
                            label(value)
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                        {!value && <ChevronDownIcon aria-hidden="true" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                    collisionPadding={8}
                >
                    <Calendar
                        captionLayout="dropdown"
                        {...calendarProps}
                        mode="single"
                        selected={toDate(value)}
                        defaultMonth={toDate(value)}
                        onSelect={(date) => {
                            onChange(toIso(date));
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
            {value && (
                <ClearButton
                    label="Hapus tanggal"
                    onClear={() => onChange('')}
                />
            )}
        </div>
    );
}

// shadcn "Range Picker": outline trigger with a calendar icon and two months (one on phones).
export function DateRangePicker({
    id,
    from,
    to,
    onChange,
    placeholder = 'Pilih rentang tanggal',
    className,
    'aria-invalid': ariaInvalid,
}: {
    id: string;
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
    placeholder?: string;
    className?: string;
    'aria-invalid'?: boolean;
}) {
    const isMobile = useIsMobile();

    return (
        <div className={cn('relative w-full', className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-invalid={ariaInvalid}
                        className={cn(
                            'w-full justify-start px-3 font-normal',
                            (from || to) && 'pr-12',
                        )}
                    >
                        <CalendarIcon aria-hidden="true" />
                        {from ? (
                            <span className="truncate">
                                {label(from)}
                                {to && to !== from && ` – ${label(to)}`}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto max-w-[calc(100vw-1rem)] p-0"
                    align="start"
                    collisionPadding={8}
                >
                    <Calendar
                        mode="range"
                        defaultMonth={toDate(from)}
                        selected={{ from: toDate(from), to: toDate(to) }}
                        onSelect={(range) =>
                            onChange(toIso(range?.from), toIso(range?.to))
                        }
                        numberOfMonths={isMobile ? 1 : 2}
                    />
                </PopoverContent>
            </Popover>
            {(from || to) && (
                <ClearButton
                    label="Hapus rentang tanggal"
                    onClear={() => onChange('', '')}
                />
            )}
        </div>
    );
}

const MONTHS = Array.from({ length: 12 }, (_, index) =>
    format(new Date(2000, index, 1), 'MMM', { locale: idLocale }),
);

// Month picker in the shadcn calendar style: year stepper over a 3×4 month grid; value is yyyy-MM.
export function MonthPicker({
    id,
    value,
    onChange,
    placeholder = 'Pilih bulan',
    className,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}) {
    const [open, setOpen] = useState(false);
    const selectedYear = value ? Number(value.slice(0, 4)) : null;
    const [year, setYear] = useState(
        () => selectedYear ?? new Date().getFullYear(),
    );
    const now = format(new Date(), 'yyyy-MM');

    return (
        <div className={cn('relative w-full', className)}>
            <Popover
                open={open}
                onOpenChange={(next) => {
                    if (next && selectedYear) setYear(selectedYear);
                    setOpen(next);
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedBy}
                        className={cn(
                            'w-full justify-start px-3 font-normal',
                            value && 'pr-12',
                        )}
                    >
                        <CalendarIcon aria-hidden="true" />
                        {value ? (
                            <span className="capitalize">
                                {format(parseISO(`${value}-01`), 'MMMM yyyy', {
                                    locale: idLocale,
                                })}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-72 p-3"
                    align="start"
                    collisionPadding={8}
                >
                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Tahun sebelumnya"
                            onClick={() => setYear(year - 1)}
                        >
                            <ChevronLeftIcon aria-hidden="true" />
                        </Button>
                        <span
                            className="text-sm font-medium"
                            aria-live="polite"
                        >
                            {year}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Tahun berikutnya"
                            onClick={() => setYear(year + 1)}
                        >
                            <ChevronRightIcon aria-hidden="true" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        {MONTHS.map((name, index) => {
                            const month = `${year}-${String(index + 1).padStart(2, '0')}`;
                            const selected = month === value;

                            return (
                                <Button
                                    key={month}
                                    type="button"
                                    variant={selected ? 'default' : 'ghost'}
                                    data-month={month}
                                    aria-pressed={selected}
                                    aria-label={format(
                                        parseISO(`${month}-01`),
                                        'MMMM yyyy',
                                        {
                                            locale: idLocale,
                                        },
                                    )}
                                    className={cn(
                                        'w-full font-normal',
                                        !selected &&
                                            month === now &&
                                            'bg-muted',
                                    )}
                                    onClick={() => {
                                        onChange(month);
                                        setOpen(false);
                                    }}
                                >
                                    {name}
                                </Button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
            {value && (
                <ClearButton label="Hapus bulan" onClear={() => onChange('')} />
            )}
        </div>
    );
}
