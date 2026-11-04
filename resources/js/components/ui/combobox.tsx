import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
    value: string;
    label: string;
    hint?: string;
};

type ComboboxProps = {
    value: string;
    onValueChange: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    className?: string;
    'aria-label'?: string;
    'aria-invalid'?: boolean;
};

type PanelPosition = {
    left: number;
    top: number;
    width: number;
    placement: 'up' | 'down';
};

const PANEL_MAX_HEIGHT = 288;

export function Combobox({
    value,
    onValueChange,
    options,
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Cari...',
    emptyMessage = 'Tidak ada hasil.',
    disabled = false,
    id,
    name,
    className,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
}: ComboboxProps) {
    const listboxId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [position, setPosition] = useState<PanelPosition | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);

    const selected = options.find((option) => option.value === value);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (term === '') {
            return options;
        }

        return options.filter((option) =>
            `${option.label} ${option.hint ?? ''} ${option.value}`
                .toLowerCase()
                .includes(term),
        );
    }, [options, query]);

    const closePanel = (focusTrigger = true) => {
        setOpen(false);
        setQuery('');

        if (focusTrigger) {
            triggerRef.current?.focus();
        }
    };

    const openPanel = () => {
        if (disabled) {
            return;
        }

        const trigger = triggerRef.current;

        if (!trigger) {
            return;
        }

        const dialog = trigger.closest('[role="dialog"]');

        setContainer(dialog instanceof HTMLElement ? dialog : document.body);
        setQuery('');
        setActiveIndex(
            Math.max(
                0,
                options.findIndex((option) => option.value === value),
            ),
        );
        setOpen(true);
    };

    useEffect(() => {
        if (!open || !container) {
            return;
        }

        const updatePosition = () => {
            const trigger = triggerRef.current;

            if (!trigger) {
                return;
            }

            const rect = trigger.getBoundingClientRect();
            const width = Math.max(rect.width, 224);
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const placement: 'up' | 'down' =
                spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow
                    ? 'up'
                    : 'down';

            if (container === document.body) {
                const left = Math.min(
                    Math.max(8, rect.left),
                    Math.max(8, window.innerWidth - width - 8),
                );

                setPosition({
                    left,
                    width,
                    placement,
                    top: placement === 'up' ? rect.top - 4 : rect.bottom + 4,
                });

                return;
            }

            const containerRect = container.getBoundingClientRect();

            setPosition({
                left: rect.left - containerRect.left + container.scrollLeft,
                width,
                placement,
                top:
                    (placement === 'up' ? rect.top - 4 : rect.bottom + 4) -
                    containerRect.top +
                    container.scrollTop,
            });
        };

        updatePosition();

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, container]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                triggerRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }

            closePanel(false);
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    useEffect(() => {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open]);

    const selectOption = (option: ComboboxOption) => {
        onValueChange(option.value);
        closePanel();
    };

    const handleSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) =>
                Math.min(index + 1, filteredOptions.length - 1),
            );

            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));

            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            const option = filteredOptions[activeIndex];

            if (option) {
                selectOption(option);
            }

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closePanel();
        }
        if (event.key === 'Tab') {
            closePanel();
        }
    };

    const panel =
        open && position ? (
            <div
                ref={panelRef}
                className="fixed z-60 max-h-72 min-w-56 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                style={{
                    position: container === document.body ? 'fixed' : 'absolute',
                    left: position.left,
                    top: position.top,
                    width: position.width,
                    transform:
                        position.placement === 'up'
                            ? 'translateY(-100%)'
                            : undefined,
                }}
            >
                <div className="flex items-center gap-2 border-b px-3">
                    <Search
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                    />
                    <input
                        role="combobox"
                        aria-expanded="true"
                        aria-autocomplete="list"
                        aria-activedescendant={filteredOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
                        autoFocus
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        aria-controls={listboxId}
                        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    />
                </div>
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label={ariaLabel}
                    className="max-h-56 overflow-y-auto p-1"
                >
                    {filteredOptions.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </p>
                    )}
                    {filteredOptions.map((option, index) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                id={`${listboxId}-option-${index}`}
                                tabIndex={-1}
                                key={option.value || 'empty'}
                                ref={(element) => {
                                    optionRefs.current[index] = element;
                                }}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => selectOption(option)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={cn(
                                    'flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    index === activeIndex &&
                                        'bg-accent text-accent-foreground',
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">
                                        {option.label}
                                    </span>
                                    {option.hint && (
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {option.hint}
                                        </span>
                                    )}
                                </span>
                                {isSelected && (
                                    <Check
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        ) : null;

    return (
        <div className="w-full">
            <button
                ref={triggerRef}
                type="button"
                id={id}
                role="combobox"
                aria-label={ariaLabel}
                aria-invalid={ariaInvalid}
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-haspopup="listbox"
                disabled={disabled}
                onClick={() => (open ? closePanel(false) : openPanel())}
                onKeyDown={(event) => {
                    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        openPanel();
                    }
                }}
                className={cn(
                    'flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
            >
                <span
                    className={cn(
                        'truncate',
                        !selected && 'text-muted-foreground',
                    )}
                >
                    {selected?.label ?? placeholder}
                </span>
                <ChevronsUpDown
                    aria-hidden="true"
                    className="size-4 shrink-0 opacity-50"
                />
            </button>
            {name && <input type="hidden" name={name} value={value} />}
            {panel &&
                position &&
                container &&
                createPortal(panel, container)}
        </div>
    );
}
