import { areaBoundaries } from './area-boundaries.ts';

/** Light to dark; the screen mixes with the card so dark mode follows, PNG stays on white. */
export const districtFills = [
    {
        screen: 'color-mix(in oklab, #1769e0 25%, var(--card))',
        png: '#cfe0fa',
    },
    {
        screen: 'color-mix(in oklab, #1769e0 55%, var(--card))',
        png: '#8ab0ef',
    },
    { screen: '#1769e0', png: '#1769e0' },
];

/** Up to three equal steps from 1 to the maximum; small maxima get fewer steps. */
export function districtClasses(maximum: number): [number, number][] {
    const tops = [
        ...new Set([1, 2, 3].map((step) => Math.ceil((maximum * step) / 3))),
    ];
    return maximum < 1
        ? []
        : tops.map((top, i) => [(tops[i - 1] ?? 0) + 1, top]);
}

/** 0 for no DO, otherwise 1–3 where the top class is always 3 (darkest). */
export function districtClass(count: number, maximum: number): number {
    if (count < 1) return 0;
    const classes = districtClasses(maximum);
    return (
        3 - classes.length + 1 + classes.findIndex(([, top]) => count <= top)
    );
}

/** Frames the districts that have a boundary; `unit` is the size of 1/600 of the map width. */
export function areaMapLayout(
    districts: { id: string; name: string; count: number }[],
) {
    const shapes = districts.flatMap(({ id, name, count }) =>
        areaBoundaries[id] ? [{ id, name, count, ...areaBoundaries[id] }] : [],
    );
    const points = shapes.flatMap(({ path }) =>
        Array.from(path.matchAll(/(-?\d+) (-?\d+)/g), ([, x, y]) => [+x, +y]),
    );
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const [left, top] = [Math.min(...xs), Math.min(...ys)];
    const [width, height] = [Math.max(...xs) - left, Math.max(...ys) - top];
    return {
        shapes,
        viewBox: `${left} ${top} ${width} ${height}`,
        unit: width / 600,
    };
}

export const shortRegionName = (name: string) =>
    name.replace(/^Kabupaten /, 'Kab. ');

const shareFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 1,
});

export const formatShare = (count: number, total: number) =>
    `${shareFormat.format(total ? (count / total) * 100 : 0)}%`;
