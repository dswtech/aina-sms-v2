import { useId } from 'react';
import type { CSSProperties } from 'react';
import {
    areaMapLayout,
    districtClass,
    districtClasses,
    districtFills,
} from '@/lib/area-map';
import type { AreaReportData } from '@/lib/chart-export';

function Hatch({ id, unit }: { id: string; unit: number }) {
    return (
        <pattern
            id={id}
            width={7 * unit}
            height={7 * unit}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
        >
            <rect width={7 * unit} height={7 * unit} className="fill-card" />
            <line
                y2={7 * unit}
                strokeWidth={2.5 * unit}
                className="stroke-destructive/40"
            />
        </pattern>
    );
}

function Swatch({ fill }: { fill?: string }) {
    const id = useId();
    return (
        <svg aria-hidden="true" viewBox="0 0 20 12" className="h-3 w-5">
            <defs>
                <Hatch id={id} unit={0.7} />
            </defs>
            <rect
                x="0.5"
                y="0.5"
                width="19"
                height="11"
                rx="2"
                className="stroke-muted-foreground/60"
                style={{ fill: fill ?? `url(#${id})` }}
            />
        </svg>
    );
}

/** Choropleth of the dealer's FOA districts; the ranking beside it is the text equivalent. */
export function AreaMap({
    districts,
    active,
    onActive,
}: {
    districts: AreaReportData['districts'];
    active: string | null;
    onActive: (id: string) => void;
}) {
    const id = useId();
    const { shapes, viewBox, unit } = areaMapLayout(districts);
    const maximum = Math.max(0, ...shapes.map((shape) => shape.count));
    if (!shapes.length)
        return (
            <p className="mt-4 text-sm text-muted-foreground">
                Belum ada kecamatan FOA. Admin mengatur daftar FOA di Pengaturan
                Dealer → Area &amp; PMA.
            </p>
        );
    return (
        <div className="@container">
            <ul
                aria-label="Keterangan warna peta"
                className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
            >
                <li className="flex items-center gap-1.5">
                    <Swatch /> Belum ada DO
                </li>
                {districtClasses(maximum).map(([low, high]) => (
                    <li key={high} className="flex items-center gap-1.5">
                        <Swatch
                            fill={
                                districtFills[districtClass(high, maximum) - 1]
                                    .screen
                            }
                        />
                        {low === high ? high : `${low}–${high}`} DO
                    </li>
                ))}
            </ul>
            {/* Text is sized in map units: `--u` is 1/600 of the map width. */}
            <svg
                viewBox={viewBox}
                role="img"
                aria-label="Peta DO per kecamatan FOA. Angka lengkap ada di Peringkat kecamatan."
                className="mt-4 max-h-[36rem] w-full"
                style={{ '--u': `${unit}px` } as CSSProperties}
            >
                <defs>
                    <Hatch id={id} unit={unit} />
                </defs>
                {shapes.map((shape) => {
                    const level = districtClass(shape.count, maximum);
                    return (
                        <path
                            key={shape.id}
                            d={shape.path}
                            vectorEffect="non-scaling-stroke"
                            className={
                                level
                                    ? 'stroke-card'
                                    : 'stroke-muted-foreground/60'
                            }
                            strokeWidth="1.5"
                            style={{
                                fill: level
                                    ? districtFills[level - 1].screen
                                    : `url(#${id})`,
                            }}
                            onPointerEnter={() => onActive(shape.id)}
                            onPointerDown={() => onActive(shape.id)}
                        />
                    );
                })}
                <g className="pointer-events-none">
                    {shapes
                        .filter((shape) => shape.id === active)
                        .map((shape) => (
                            <path
                                key={shape.id}
                                d={shape.path}
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                                strokeWidth="3"
                                className="stroke-foreground"
                            />
                        ))}
                    {shapes.map((shape) => {
                        const level = districtClass(shape.count, maximum);
                        // 5.8 units is the average width of one character at the 11-unit name size.
                        const named =
                            shape.half * 2 >= shape.name.length * 5.8 * unit;
                        return (
                            <text
                                key={shape.id}
                                x={shape.x}
                                y={shape.y}
                                textAnchor="middle"
                                className={
                                    level === 3
                                        ? 'fill-white'
                                        : 'fill-foreground stroke-card [paint-order:stroke]'
                                }
                                strokeWidth={level === 0 ? 3 * unit : 0}
                            >
                                <tspan
                                    x={shape.x}
                                    dy={named ? 0 : 5 * unit}
                                    className="text-[length:calc(var(--u)*22)] font-semibold @lg:text-[length:calc(var(--u)*15)]"
                                >
                                    {shape.count}
                                </tspan>
                                {named && (
                                    <tspan
                                        x={shape.x}
                                        dy={13 * unit}
                                        className="hidden text-[length:calc(var(--u)*11)] @lg:inline"
                                    >
                                        {shape.name}
                                    </tspan>
                                )}
                            </text>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
