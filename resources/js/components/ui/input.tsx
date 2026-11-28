import { XIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

const CLEARABLE_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number']);
// Layout classes belong on the wrapper so the clear button stays inside the visible field.
const WRAPPER_CLASS = /^(?:[a-z0-9-]+:)*-?(?:m[trblxy]?-|w-|max-w-|min-w-|col-|row-|flex-|grow|shrink|self-|basis-|order-|hidden$|block$)/;

const inputClass =
    'h-11 w-full min-w-0 rounded-md border border-input bg-input/20 px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40';

function Input({
    className,
    type,
    showClear = true,
    ref,
    onChange,
    ...props
}: React.ComponentProps<'input'> & { showClear?: boolean }) {
    const inner = React.useRef<HTMLInputElement | null>(null);
    const [filled, setFilled] = React.useState(
        () => String(props.value ?? props.defaultValue ?? '') !== '',
    );
    const clearable = showClear && CLEARABLE_TYPES.has(type ?? 'text');
    const hasValue =
        props.value !== undefined ? String(props.value) !== '' : filled;
    const classes = (className ?? '').split(/\s+/).filter(Boolean);
    const wrapperClasses = clearable
        ? classes.filter((name) => WRAPPER_CLASS.test(name))
        : [];

    const input = (
        <input
            ref={(node) => {
                inner.current = node;
                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref) {
                    ref.current = node;
                }
            }}
            type={type}
            data-slot="input"
            className={cn(
                inputClass,
                clearable && hasValue && 'pr-11 xl:pointer-fine:pr-9',
                clearable
                    ? classes.filter((name) => !wrapperClasses.includes(name))
                    : className,
            )}
            onChange={(event) => {
                setFilled(event.target.value !== '');
                onChange?.(event);
            }}
            {...props}
        />
    );

    if (!clearable) {
        return input;
    }

    const clear = () => {
        const node = inner.current;
        if (!node) {
            return;
        }
        // Set through the native setter so React's onChange fires for controlled inputs too.
        Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
        )?.set?.call(node, '');
        node.dispatchEvent(new Event('input', { bubbles: true }));
        setFilled(false);
        node.focus();
    };

    return (
        <div
            data-slot="input-clear-wrapper"
            className={cn('relative w-full', wrapperClasses)}
        >
            {input}
            {hasValue && !props.disabled && !props.readOnly && (
                <button
                    type="button"
                    aria-label="Hapus isian"
                    data-slot="input-clear"
                    onClick={clear}
                    className="absolute right-0 bottom-0 flex size-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:pointer-fine:size-9"
                >
                    <XIcon className="size-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

export { Input };
