import { ArrowLeft, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PickerOption = { value: string; label: string };
export type PickerStep =
    | { title: string; options: PickerOption[] }
    | { title: string; text: true; type?: 'date' };

type Props = {
    label: string;
    display: string;
    /** Second, smaller line under the value (e.g. credit terms). */
    detail?: string;
    disabled: boolean;
    /** The step to show after `chosen`; `null` means the choice is complete. */
    getStep: (chosen: string[]) => PickerStep | null;
    onCommit: (chosen: string[]) => void;
};

type Position = { left: number; top: number; width: number; up: boolean };

const PANEL_MAX_HEIGHT = 288;

const rowClass =
    'flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm';

export function PropertyPicker({
    label,
    display,
    detail,
    disabled,
    getStep,
    onCommit,
}: Props) {
    const listboxId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [text, setText] = useState('');
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [position, setPosition] = useState<Position | null>(null);

    const step = open ? getStep(chosen) : null;

    const close = (focusTrigger = true) => {
        setOpen(false);
        setChosen([]);
        setQuery('');
        setText('');
        if (focusTrigger) triggerRef.current?.focus();
    };

    useEffect(() => {
        if (!open || !container) return;
        const place = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const width = Math.max(rect.width, 240);
            const up =
                window.innerHeight - rect.bottom < PANEL_MAX_HEIGHT &&
                rect.top > window.innerHeight - rect.bottom;
            const box = container.getBoundingClientRect();
            setPosition({
                left: Math.min(
                    rect.left - box.left + container.scrollLeft,
                    box.width - width - 8,
                ),
                top:
                    (up ? rect.top - 4 : rect.bottom + 4) -
                    box.top +
                    container.scrollTop,
                width,
                up,
            });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, container]);

    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                !triggerRef.current?.contains(target) &&
                !panelRef.current?.contains(target)
            )
                close(false);
        };
        // On the document, not the panel: a clicked option unmounts and focus falls back to the body.
        // The modal's onEscapeKeyDown keeps Radix from closing the dialog while this panel is open.
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onEscape);

        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onEscape);
        };
    }, [open]);

    if (disabled)
        return <div className={`${rowClass} cursor-default`}>{display}</div>;

    const advance = (value: string) => {
        const next = [...chosen, value];
        if (getStep(next) === null) {
            close();
            onCommit(next);

            return;
        }
        setChosen(next);
        setQuery('');
        setActive(0);
    };

    const options =
        step && 'options' in step
            ? step.options.filter((option) =>
                  option.label
                      .toLowerCase()
                      .includes(query.trim().toLowerCase()),
              )
            : [];

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (event.key === 'Enter' && step && 'options' in step) {
            event.preventDefault();
            if (options[active]) advance(options[active].value);
        }
    };

    const openPanel = () => {
        const dialog = triggerRef.current?.closest('[role="dialog"]');
        setContainer(dialog instanceof HTMLElement ? dialog : document.body);
        setOpen(true);
    };

    const panel =
        open && step && position && container ? (
            <div
                ref={panelRef}
                role="group"
                data-slot="property-picker-panel"
                onKeyDown={onKeyDown}
                className="z-60 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                style={{
                    position:
                        container === document.body ? 'fixed' : 'absolute',
                    left: position.left,
                    top: position.top,
                    width: position.width,
                    transform: position.up ? 'translateY(-100%)' : undefined,
                }}
            >
                {chosen.length > 0 && (
                    <button
                        type="button"
                        className={`${rowClass} gap-2 hover:bg-muted`}
                        onClick={() => {
                            setChosen(chosen.slice(0, -1));
                            setQuery('');
                        }}
                    >
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Kembali
                    </button>
                )}
                <p className="px-3 pt-2 text-xs text-muted-foreground">
                    {step.title}
                </p>
                {'options' in step ? (
                    <>
                        <div className="flex items-center gap-2 border-b px-3">
                            <Search
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                            <input
                                autoFocus
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setActive(0);
                                }}
                                placeholder="Cari…"
                                aria-label={`Cari ${step.title}`}
                                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                        <div
                            id={listboxId}
                            role="listbox"
                            aria-label={step.title}
                            className="max-h-56 overflow-y-auto p-1"
                        >
                            {options.length === 0 && (
                                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    Tidak ada hasil.
                                </p>
                            )}
                            {options.map((option, index) => (
                                <button
                                    key={option.value || 'empty'}
                                    type="button"
                                    role="option"
                                    aria-selected={index === active}
                                    tabIndex={-1}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => advance(option.value)}
                                    className={`${rowClass} ${index === active ? 'bg-muted' : ''}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <form
                        className="space-y-2 p-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (text.trim()) advance(text.trim());
                        }}
                    >
                        <input
                            autoFocus
                            type={step.type ?? 'text'}
                            // A birth date cannot be in the future; the server also requires a past day.
                            max={
                                step.type === 'date'
                                    ? new Date().toLocaleDateString('en-CA', {
                                          timeZone: 'Asia/Jakarta',
                                      })
                                    : undefined
                            }
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            aria-label={step.title}
                            maxLength={255}
                            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!text.trim()}
                            className="min-h-11 rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
                        >
                            Simpan
                        </button>
                    </form>
                )}
            </div>
        ) : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label={`${label}: ${display}${detail ? ` · ${detail}` : ''}`}
                title={detail ? `${display} · ${detail}` : display}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? close(false) : openPanel())}
                className={`${rowClass} outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring`}
            >
                <span className="flex min-w-0 flex-col">
                    <span className="[overflow-wrap:anywhere]">{display}</span>
                    {detail && (
                        <span className="text-xs text-muted-foreground">
                            {detail}
                        </span>
                    )}
                </span>
            </button>
            {panel && container && createPortal(panel, container)}
        </>
    );
}
