import { useSyncExternalStore } from 'react';

export type ColorTheme =
    | 'blue'
    | 'green'
    | 'purple'
    | 'red'
    | 'orange'
    | 'teal';

type ColorPalette = {
    primary: string;
    primaryForeground: string;
    ring: string;
    accent: string;
    accentForeground: string;
    sidebarPrimary: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarRing: string;
};

type ColorDefinition = {
    label: string;
    swatch: string;
    light: ColorPalette;
    dark: ColorPalette;
};

const COLOR_DEFINITIONS: Record<ColorTheme, ColorDefinition> = {
    blue: {
        label: 'Biru',
        swatch: '#1769e0',
        light: {
            primary: '#1769e0',
            primaryForeground: '#ffffff',
            ring: '#1769e0',
            accent: '#e8f1fe',
            accentForeground: '#0f4faa',
            sidebarPrimary: '#1769e0',
            sidebarAccent: '#e8f1fe',
            sidebarAccentForeground: '#0f4faa',
            sidebarRing: '#1769e0',
        },
        dark: {
            primary: '#60a5fa',
            primaryForeground: '#0f172a',
            ring: '#60a5fa',
            accent: '#1e3a5f',
            accentForeground: '#dbeafe',
            sidebarPrimary: '#60a5fa',
            sidebarAccent: '#1e3a5f',
            sidebarAccentForeground: '#dbeafe',
            sidebarRing: '#60a5fa',
        },
    },
    green: {
        label: 'Hijau',
        swatch: '#16a34a',
        light: {
            primary: '#16a34a',
            primaryForeground: '#ffffff',
            ring: '#16a34a',
            accent: '#dcfce7',
            accentForeground: '#166534',
            sidebarPrimary: '#16a34a',
            sidebarAccent: '#dcfce7',
            sidebarAccentForeground: '#166534',
            sidebarRing: '#16a34a',
        },
        dark: {
            primary: '#4ade80',
            primaryForeground: '#0f172a',
            ring: '#4ade80',
            accent: '#14532d',
            accentForeground: '#dcfce7',
            sidebarPrimary: '#4ade80',
            sidebarAccent: '#14532d',
            sidebarAccentForeground: '#dcfce7',
            sidebarRing: '#4ade80',
        },
    },
    purple: {
        label: 'Ungu',
        swatch: '#7c3aed',
        light: {
            primary: '#7c3aed',
            primaryForeground: '#ffffff',
            ring: '#7c3aed',
            accent: '#ede9fe',
            accentForeground: '#5b21b6',
            sidebarPrimary: '#7c3aed',
            sidebarAccent: '#ede9fe',
            sidebarAccentForeground: '#5b21b6',
            sidebarRing: '#7c3aed',
        },
        dark: {
            primary: '#a78bfa',
            primaryForeground: '#0f172a',
            ring: '#a78bfa',
            accent: '#2e1065',
            accentForeground: '#ede9fe',
            sidebarPrimary: '#a78bfa',
            sidebarAccent: '#2e1065',
            sidebarAccentForeground: '#ede9fe',
            sidebarRing: '#a78bfa',
        },
    },
    red: {
        label: 'Merah',
        swatch: '#dc2626',
        light: {
            primary: '#dc2626',
            primaryForeground: '#ffffff',
            ring: '#dc2626',
            accent: '#fee2e2',
            accentForeground: '#991b1b',
            sidebarPrimary: '#dc2626',
            sidebarAccent: '#fee2e2',
            sidebarAccentForeground: '#991b1b',
            sidebarRing: '#dc2626',
        },
        dark: {
            primary: '#f87171',
            primaryForeground: '#0f172a',
            ring: '#f87171',
            accent: '#7f1d1d',
            accentForeground: '#fee2e2',
            sidebarPrimary: '#f87171',
            sidebarAccent: '#7f1d1d',
            sidebarAccentForeground: '#fee2e2',
            sidebarRing: '#f87171',
        },
    },
    orange: {
        label: 'Oranye',
        swatch: '#ea580c',
        light: {
            primary: '#ea580c',
            primaryForeground: '#ffffff',
            ring: '#ea580c',
            accent: '#ffedd5',
            accentForeground: '#9a3412',
            sidebarPrimary: '#ea580c',
            sidebarAccent: '#ffedd5',
            sidebarAccentForeground: '#9a3412',
            sidebarRing: '#ea580c',
        },
        dark: {
            primary: '#fb923c',
            primaryForeground: '#0f172a',
            ring: '#fb923c',
            accent: '#7c2d12',
            accentForeground: '#ffedd5',
            sidebarPrimary: '#fb923c',
            sidebarAccent: '#7c2d12',
            sidebarAccentForeground: '#ffedd5',
            sidebarRing: '#fb923c',
        },
    },
    teal: {
        label: 'Teal',
        swatch: '#0d9488',
        light: {
            primary: '#0d9488',
            primaryForeground: '#ffffff',
            ring: '#0d9488',
            accent: '#ccfbf1',
            accentForeground: '#115e59',
            sidebarPrimary: '#0d9488',
            sidebarAccent: '#ccfbf1',
            sidebarAccentForeground: '#115e59',
            sidebarRing: '#0d9488',
        },
        dark: {
            primary: '#2dd4bf',
            primaryForeground: '#0f172a',
            ring: '#2dd4bf',
            accent: '#134e4a',
            accentForeground: '#ccfbf1',
            sidebarPrimary: '#2dd4bf',
            sidebarAccent: '#134e4a',
            sidebarAccentForeground: '#ccfbf1',
            sidebarRing: '#2dd4bf',
        },
    },
};

const listeners = new Set<() => void>();
let currentColor: ColorTheme = 'blue';

const getStoredColor = (): ColorTheme => {
    if (typeof window === 'undefined') {
        return 'blue';
    }

    const stored = localStorage.getItem(
        'color-theme',
    ) as unknown as ColorTheme | null;
    return stored && stored in COLOR_DEFINITIONS ? stored : 'blue';
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

export const COLOR_OPTIONS = Object.entries(COLOR_DEFINITIONS).map(
    ([value, definition]) => ({
        value: value as ColorTheme,
        label: definition.label,
        swatch: definition.swatch,
    }),
);

export function applyColor(color: ColorTheme = currentColor): void {
    if (typeof document === 'undefined') {
        return;
    }

    const definition = COLOR_DEFINITIONS[color];
    const palette = document.documentElement.classList.contains('dark')
        ? definition.dark
        : definition.light;
    const root = document.documentElement;

    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-foreground', palette.primaryForeground);
    root.style.setProperty('--ring', palette.ring);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--accent-foreground', palette.accentForeground);
    root.style.setProperty('--sidebar-primary', palette.sidebarPrimary);
    root.style.setProperty('--sidebar-accent', palette.sidebarAccent);
    root.style.setProperty(
        '--sidebar-accent-foreground',
        palette.sidebarAccentForeground,
    );
    root.style.setProperty('--sidebar-ring', palette.sidebarRing);
}

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeColor(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentColor = getStoredColor();
    applyColor(currentColor);

    window.addEventListener('themechange', () => {
        applyColor(currentColor);
    });
}

export function useColor(): {
    color: ColorTheme;
    updateColor: (color: ColorTheme) => void;
} {
    const color = useSyncExternalStore(
        (callback) => {
            listeners.add(callback);
            return () => listeners.delete(callback);
        },
        () => currentColor,
        () => 'blue' as ColorTheme,
    );

    const updateColor = (nextColor: ColorTheme): void => {
        currentColor = nextColor;
        localStorage.setItem('color-theme', nextColor);
        setCookie('color-theme', nextColor);
        applyColor(nextColor);
        notify();
    };

    return { color, updateColor };
}
