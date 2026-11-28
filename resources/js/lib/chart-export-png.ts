import { areaMapLayout, districtClass, districtFills } from '@/lib/area-map';
import {
    chartBarFraction,
    chartModeLabel,
    chartRowColor,
    layoutDonutLegend,
    wrapChartLabel,
} from '@/lib/chart-export';
import type { ChartExportData } from '@/lib/chart-export';

const width = 1200;
const padding = 64;
const contentWidth = width - padding * 2;
const ink = '#0f172a';
const secondary = '#526175';
const blue = '#1769e0';
const pale = '#e9f0f8';
const font = (size: number, weight = 400) =>
    `${weight} ${size}px "Inter Variable", system-ui, sans-serif`;
const numbers = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function drawMap(
    context: CanvasRenderingContext2D,
    map: ReturnType<typeof areaMapLayout>,
) {
    const [x, y, w, h] = map.viewBox.split(' ').map(Number);
    const scale = Math.min(contentWidth / w, 580 / h);
    const maximum = Math.max(...map.shapes.map((shape) => shape.count));
    context.save();
    context.translate(padding + (contentWidth - w * scale) / 2, 216);
    context.scale(scale, scale);
    context.translate(-x, -y);
    for (const shape of map.shapes) {
        const level = districtClass(shape.count, maximum);
        const path = new Path2D(shape.path);
        context.fillStyle = level ? districtFills[level - 1].png : '#f7ecec';
        context.fill(path);
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2 / scale;
        context.stroke(path);
        context.textAlign = 'center';
        context.fillStyle = level === 3 ? '#ffffff' : ink;
        context.font = font(20 / scale, 600);
        const named = shape.half * scale * 2 >= shape.name.length * 8;
        context.fillText(
            numbers.format(shape.count),
            shape.x,
            shape.y + (named ? 0 : 7 / scale),
        );
        if (!named) continue;
        context.font = font(14 / scale);
        context.fillText(shape.name, shape.x, shape.y + 17 / scale);
    }
    context.restore();
}

export async function chartPng(chart: ChartExportData): Promise<Blob> {
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas tidak tersedia.');
    const isArea = chart.kind.startsWith('area');
    const isList = chart.kind === 'leasing' || isArea;
    const map =
        chart.kind === 'area-foa-districts'
            ? areaMapLayout(
                  chart.rows.map((row) => ({ ...row, name: row.label })),
              )
            : null;
    const mapHeight = map?.shapes.length ? 620 : 0;
    context.font = font(24);
    let nextY = 236 + mapHeight;
    const barRows = chart.rows.map((row) => {
        const lines = wrapChartLabel(
            row.label,
            (text) => context.measureText(text).width,
            780,
        );
        const y = nextY;
        const barY = y + lines.length * 30 + 14;
        nextY = barY + 16 + 28;
        return {
            ...row,
            fraction: chartBarFraction(chart, row),
            lines,
            y,
            barY,
        };
    });
    const legend = layoutDonutLegend(
        chart.rows,
        (text) => context.measureText(text).width,
    );
    const bodyBottom = !isList
        ? Math.max(650, ...legend.map((row) => row.y + row.height))
        : chart.kind === 'leasing' && chart.total === 0
          ? 340
          : nextY;
    const note = isArea
        ? `Persentase dihitung dari seluruh DO sah; baris bulanan dari DO bulan itu. FOA = kecamatan FOA dealer; PMA = kab/kota PMA, termasuk FOA. Status mengikuti snapshot saat DO.${map ? ' Batas kecamatan pada peta disederhanakan.' : ''}`
        : chart.kind === 'financing'
          ? 'Persentase dihitung dari seluruh transaksi pada rentang dan dasar laporan yang dipilih.'
          : 'Kredit Lain mencakup leasing di luar pantauan utama. Leasing yang belum dipilih dihitung terpisah. Persentase dihitung dari total transaksi Kredit.';
    context.font = font(18);
    const footer = wrapChartLabel(
        note,
        (text) => context.measureText(text).width,
        contentWidth,
    );
    const height = bodyBottom + 48 + footer.length * 26 + 44;
    canvas.width = width * 2;
    canvas.height = Math.ceil(height * 2);
    context.scale(2, 2);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.fillStyle = ink;
    context.font = font(36, 600);
    context.fillText(chart.title, padding, 88);
    context.textAlign = 'right';
    context.fillStyle = blue;
    context.font = font(20, 600);
    context.fillText(
        chart.synthetic ? 'Data contoh' : 'Data laporan',
        width - padding,
        84,
    );
    context.textAlign = 'left';
    context.fillStyle = secondary;
    context.font = font(22);
    context.fillText(
        `${chartModeLabel(chart.mode)} · ${chart.periodLabel}`,
        padding,
        132,
    );
    context.font = font(20);
    context.fillText(
        `${numbers.format(chart.total)} transaksi${chart.kind === 'leasing' ? ' Kredit' : isArea ? ' DO' : ''} · jumlah acuan persentase`,
        padding,
        166,
    );
    context.strokeStyle = '#dbe4f0';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding, 196);
    context.lineTo(width - padding, 196);
    context.stroke();

    if (!isList) {
        const centerX = 300;
        const centerY = 420;
        context.lineWidth = 56;
        context.strokeStyle = pale;
        context.beginPath();
        context.arc(centerX, centerY, 152, 0, Math.PI * 2);
        context.stroke();
        let angle = -Math.PI / 2;
        for (const row of chart.rows) {
            if (!row.count || !chart.total) continue;
            const nextAngle = angle + (row.count / chart.total) * Math.PI * 2;
            context.beginPath();
            context.strokeStyle = chartRowColor(chart.kind, row.id);
            context.arc(centerX, centerY, 152, angle, nextAngle);
            context.stroke();
            angle = nextAngle;
        }
        context.textAlign = 'center';
        context.fillStyle = ink;
        context.font = font(52, 600);
        context.fillText(
            numbers.format(chart.total),
            centerX,
            centerY + 10,
            240,
        );
        context.fillStyle = secondary;
        context.font = font(22);
        context.fillText('transaksi', centerX, centerY + 46);
        chart.rows.forEach((row, index) => {
            const { y, lines } = legend[index];
            context.fillStyle = chartRowColor(chart.kind, row.id);
            context.fillRect(556, y - 16, 12, 12);
            context.textAlign = 'left';
            context.fillStyle = ink;
            context.font = font(24);
            lines.forEach((line, lineIndex) =>
                context.fillText(line, 584, y + lineIndex * 30),
            );
            context.textAlign = 'right';
            context.font = font(24, 600);
            context.fillText(numbers.format(row.count), 1000, y);
            context.fillStyle = secondary;
            context.font = font(24);
            context.fillText(
                `${numbers.format(row.percentage)}%`,
                width - padding,
                y,
            );
        });
    } else if (chart.kind === 'leasing' && chart.total === 0) {
        context.fillStyle = secondary;
        context.font = font(26);
        context.fillText(
            'Belum ada transaksi Kredit pada rentang ini.',
            padding,
            284,
        );
    } else {
        if (map?.shapes.length) drawMap(context, map);
        for (const row of barRows) {
            context.textAlign = 'left';
            context.fillStyle = ink;
            context.font = font(24);
            row.lines.forEach((line, index) =>
                context.fillText(line, padding, row.y + 26 + index * 30),
            );
            context.textAlign = 'right';
            context.font = font(24, 600);
            context.fillText(numbers.format(row.count), 1000, row.y + 26);
            context.fillStyle = secondary;
            context.font = font(24);
            context.fillText(
                `${numbers.format(row.percentage)}%`,
                width - padding,
                row.y + 26,
            );
            context.fillStyle = pale;
            context.fillRect(padding, row.barY, contentWidth, 16);
            context.fillStyle =
                row.muted || row.id === 'unselected'
                    ? secondary
                    : chartRowColor(chart.kind, row.id);
            context.fillRect(
                padding,
                row.barY,
                contentWidth * row.fraction,
                16,
            );
        }
    }
    context.textAlign = 'left';
    context.strokeStyle = '#dbe4f0';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding, bodyBottom + 12);
    context.lineTo(width - padding, bodyBottom + 12);
    context.stroke();
    context.fillStyle = secondary;
    context.font = font(18);
    footer.forEach((line, index) =>
        context.fillText(line, padding, bodyBottom + 48 + index * 26),
    );
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error('PNG belum dapat dibuat.')),
            'image/png',
        ),
    );
}
