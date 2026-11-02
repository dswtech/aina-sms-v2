import { useSyncExternalStore } from 'react';

export type FontSize = 'normal' | 'large' | 'xlarge';

type FontSizeOption = {
    label: string;
    rootSize: string;
};

const FONT_SIZES: Record<FontSize, FontSizeOption> = {
    normal: { label: 'Normal', rootSize: '16px' },
    large: { label: 'Besar', rootSize: '17.5px' },
    xlarge: { label: 'Ekstra', rootSize: '19px' },
};

const STORAGE_KEY = 'font-size';

const listeners = new Set<() => void>();
let currentSize: FontSize = 'normal';

export const FONT_SIZE_OPTIONS = (
    Object.entries(FONT_SIZES) as [FontSize, FontSizeOption][]
).map(([value, option]) => ({
    value,
    label: option.label,
}));

const getStoredSize = (): FontSize => {
    if (typeof window === 'undefined') {
        return 'normal';
    }

    const stored = localStorage.getItem(STORAGE_KEY);

    return stored && stored in FONT_SIZES ? (stored as FontSize) : 'normal';
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

export function applyFontSize(size: FontSize = currentSize): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.style.fontSize = FONT_SIZES[size].rootSize;
}

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeFontSize(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentSize = getStoredSize();
    applyFontSize(currentSize);
}

export function useFontSize(): {
    fontSize: FontSize;
    updateFontSize: (size: FontSize) => void;
} {
    const fontSize = useSyncExternalStore(
        (callback) => {
            listeners.add(callback);

            return () => listeners.delete(callback);
        },
        () => currentSize,
        () => 'normal' as FontSize,
    );

    const updateFontSize = (nextSize: FontSize): void => {
        currentSize = nextSize;
        localStorage.setItem(STORAGE_KEY, nextSize);
        setCookie(STORAGE_KEY, nextSize);
        applyFontSize(nextSize);
        notify();
    };

    return { fontSize, updateFontSize };
}
