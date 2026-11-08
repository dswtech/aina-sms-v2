import type { AreaDistrict, AreaRegion } from './bandung-raya-districts';

export type AreaChoice = {
    regionCode: string | null;
    districtCode: string | null;
    otherCity: string;
};
export type AreaSnapshot = AreaChoice & {
    districtName: string;
    regionName: string;
    isFoa: boolean;
};
export type AreaDeal = {
    id: number;
    area: AreaChoice;
    doMonth?: string;
    doReversed?: boolean;
    snapshot: AreaSnapshot | null;
};
export const emptyArea: AreaChoice = {
    regionCode: null,
    districtCode: null,
    otherCity: '',
};

export function initialFoaCodes(districts: AreaDistrict[]): string[] {
    return districts
        .filter(
            (row) =>
                row.regionCode === '32.17' &&
                ['Padalarang', 'Ngamprah', 'Batujajar'].includes(row.name),
        )
        .map((row) => row.code);
}

export function normalizeArea(
    choice: AreaChoice,
    districts: AreaDistrict[],
    regions: AreaRegion[],
): AreaChoice {
    if (choice.regionCode === 'other') {
        if (!choice.otherCity.trim())
            throw new Error('Isi nama kota untuk Kota Lain.');
        return {
            regionCode: 'other',
            districtCode: null,
            otherCity: choice.otherCity.trim(),
        };
    }
    if (!choice.regionCode && !choice.districtCode) return { ...emptyArea };
    if (
        !regions.some((row) => row.code === choice.regionCode) ||
        !districts.some(
            (row) =>
                row.code === choice.districtCode &&
                row.regionCode === choice.regionCode,
        )
    )
        throw new Error('Pilih kecamatan yang sesuai dengan kabupaten/kota.');
    return {
        regionCode: choice.regionCode,
        districtCode: choice.districtCode,
        otherCity: '',
    };
}

export function snapshotArea(
    choice: AreaChoice,
    foaCodes: ReadonlySet<string>,
    districts: AreaDistrict[],
    regions: AreaRegion[],
): AreaSnapshot {
    const area = normalizeArea(choice, districts, regions);
    const district = districts.find((row) => row.code === area.districtCode);
    return {
        ...area,
        districtName: district?.name ?? '',
        regionName:
            regions.find((row) => row.code === area.regionCode)?.name ?? '',
        isFoa: !!district && foaCodes.has(district.code),
    };
}

export function updateAreaDeal(
    deal: AreaDeal,
    choice: AreaChoice,
    districts: AreaDistrict[],
    regions: AreaRegion[],
): AreaDeal {
    if (deal.doMonth && !deal.doReversed)
        throw new Error('Area transaksi sudah dikunci saat DO.');
    return { ...deal, area: normalizeArea(choice, districts, regions) };
}

export function buildAreaDeals(
    transactions: readonly { id: number; doMonth?: string }[],
    districts: AreaDistrict[],
    regions: AreaRegion[],
): AreaDeal[] {
    const foaCodes = new Set(initialFoaCodes(districts));
    const byName = (name: string, region: string) =>
        districts.find(
            (row) => row.name === name && row.regionCode === region,
        )!;
    const choices = [
        byName('Padalarang', '32.17'),
        byName('Ngamprah', '32.17'),
        byName('Batujajar', '32.17'),
        districts.find((row) => row.regionCode === '32.77')!,
        districts.find((row) => row.regionCode === '32.11')!,
    ];
    return transactions.map((deal, index) => {
        const slot = Math.floor(index / 3) % 12;
        const district =
            slot < 4
                ? choices[0]
                : slot < 7
                  ? choices[1]
                  : slot === 7
                    ? choices[2]
                    : slot === 8
                      ? choices[3]
                      : choices[4];
        const area: AreaChoice =
            slot === 10
                ? {
                      regionCode: 'other',
                      districtCode: null,
                      otherCity: 'Cianjur',
                  }
                : slot === 11
                  ? { ...emptyArea }
                  : {
                        regionCode: district.regionCode,
                        districtCode: district.code,
                        otherCity: '',
                    };
        return {
            id: deal.id,
            doMonth: deal.doMonth,
            area,
            snapshot: deal.doMonth
                ? snapshotArea(area, foaCodes, districts, regions)
                : null,
        };
    });
}

export function summarizeArea(deals: AreaDeal[], from: string, to: string) {
    const valid = deals.filter(
        (row) =>
            row.doMonth &&
            !row.doReversed &&
            row.doMonth >= from &&
            row.doMonth <= to,
    );
    const groups = new Map<
        string,
        {
            id: string;
            name: string;
            districtName: string;
            regionName: string;
            category: 'foa' | 'other' | 'unknown';
            count: number;
        }
    >();
    let foa = 0,
        other = 0,
        unknown = 0;
    for (const deal of valid) {
        const area = deal.snapshot;
        const missing = !area || (!area.districtCode && !area.otherCity);
        const category = missing ? 'unknown' : area.isFoa ? 'foa' : 'other';
        const id = category === 'foa' ? area!.districtCode! : category;
        const name =
            category === 'foa'
                ? `${area!.districtName} · ${area!.regionName.replace('Kabupaten', 'Kab.')}`
                : category === 'other'
                  ? 'Area lain'
                  : 'Kecamatan belum diisi';
        const group = groups.get(id) ?? {
            id,
            name,
            districtName: category === 'foa' ? area!.districtName : '',
            regionName: category === 'foa' ? area!.regionName : '',
            category,
            count: 0,
        };
        group.count++;
        groups.set(id, group);
        if (category === 'foa') foa++;
        else if (category === 'other') other++;
        else unknown++;
    }
    if (!groups.has('other'))
        groups.set('other', {
            id: 'other',
            name: 'Area lain',
            districtName: '',
            regionName: '',
            category: 'other',
            count: 0,
        });
    if (!groups.has('unknown'))
        groups.set('unknown', {
            id: 'unknown',
            name: 'Kecamatan belum diisi',
            districtName: '',
            regionName: '',
            category: 'unknown',
            count: 0,
        });
    const rank = (id: string) =>
        id === 'other' ? 1 : id === 'unknown' ? 2 : 0;
    const rows = [...groups.values()].sort(
        (a, b) =>
            rank(a.id) - rank(b.id) ||
            b.count - a.count ||
            a.name.localeCompare(b.name, 'id'),
    );
    return { total: valid.length, foa, other, unknown, rows };
}
