export type Financing = 'cash' | 'credit' | null;
export type Leasing = {
    id: string;
    name: string;
    active: boolean;
    primary: boolean;
};
export type FinancingDeal = {
    id: number;
    prospectMonth: string;
    doMonth?: string;
    financing: Financing;
    leasingId: string | null;
    otherName: string;
    snapshot?: {
        financing: Financing;
        leasingId: string | null;
        leasingName: string;
        primary: boolean;
    };
};
export type FinancingMode = 'prospect' | 'do';

export const initialLeasing: Leasing[] = [
    ['maybank', 'MayBank'],
    ['muf', 'Mandiri Utama Finance'],
    ['acc', 'ACC'],
    ['taf', 'TAF'],
    ['mtf', 'Mandiri Tunas Finance'],
    ['bca', 'BCA Finance'],
    ['niaga', 'Niaga Finance'],
    ['adira', 'Adira Finance'],
].map(([id, name]) => ({ id, name, active: true, primary: true }));

const creditChoices: (string | null)[] = [
    ...initialLeasing.flatMap((lender, index) =>
        Array<string>([12, 10, 9, 7, 6, 5, 4, 4][index]).fill(lender.id),
    ),
    ...Array<string>(5).fill('other'),
    ...Array<null>(3).fill(null),
];

// Entirely synthetic fixtures. No operational customer or transaction data is read.
export const syntheticDeals: FinancingDeal[] = Array.from(
    { length: 160 },
    (_, index) => {
        const slot = index % 100;
        const financing = slot < 10 ? null : slot < 35 ? 'cash' : 'credit';
        const leasingId =
            financing !== 'credit' ? null : creditChoices[slot - 35];
        const lender = initialLeasing.find((row) => row.id === leasingId);
        const realized =
            index % 3 === 0 &&
            financing !== null &&
            (financing === 'cash' || leasingId !== null);
        return {
            id: index + 1,
            prospectMonth: index < 100 ? '2026-11' : '2026-10',
            financing,
            leasingId,
            otherName: leasingId === 'other' ? 'Leasing Contoh Nusantara' : '',
            ...(realized
                ? {
                      doMonth: '2026-11',
                      snapshot: {
                          financing,
                          leasingId,
                          leasingName: lender?.name ?? 'Kredit Lain',
                          primary: lender?.primary ?? false,
                      },
                  }
                : {}),
        };
    },
);

export function updateFinancing(
    deal: FinancingDeal,
    financing: Financing,
    leasingId: string | null,
    otherName: string,
): FinancingDeal {
    if (deal.doMonth) throw new Error('Pembiayaan sudah dikunci saat DO.');
    if (financing === 'credit' && leasingId === 'other' && !otherName.trim())
        throw new Error('Isi nama leasing untuk Kredit Lain.');
    return {
        ...deal,
        financing,
        leasingId: financing === 'credit' ? leasingId : null,
        otherName:
            financing === 'credit' && leasingId === 'other'
                ? otherName.trim()
                : '',
    };
}

export function summarizeFinancing(
    deals: FinancingDeal[],
    lenders: Leasing[],
    period: string,
    mode: FinancingMode,
    endPeriod = period,
) {
    const cohort = deals.filter((row) => {
        const month = mode === 'do' ? row.doMonth : row.prospectMonth;
        return !!month && month >= period && month <= endPeriod;
    });
    const groups = new Map<
        string,
        { id: string; name: string; count: number }
    >();
    if (mode === 'prospect') {
        for (const lender of lenders.filter((row) => row.primary))
            groups.set(lender.id, {
                id: lender.id,
                name: lender.name,
                count: 0,
            });
    }
    let cash = 0;
    let credit = 0;
    let unknown = 0;
    for (const deal of cohort) {
        const value =
            mode === 'do' ? (deal.snapshot?.financing ?? null) : deal.financing;
        if (value === 'cash') {
            cash++;
            continue;
        }
        if (value !== 'credit') {
            unknown++;
            continue;
        }
        credit++;
        const lenderId =
            mode === 'do' ? deal.snapshot?.leasingId : deal.leasingId;
        const lender = lenders.find((row) => row.id === lenderId);
        const primary =
            mode === 'do' ? deal.snapshot?.primary : lender?.primary;
        const id = !lenderId ? 'unselected' : primary ? lenderId : 'other';
        const name =
            id === 'unselected'
                ? 'Leasing belum dipilih'
                : id === 'other'
                  ? 'Kredit Lain'
                  : mode === 'do'
                    ? (deal.snapshot?.leasingName ?? 'Leasing')
                    : (lender?.name ?? 'Leasing');
        const group = groups.get(id) ?? { id, name, count: 0 };
        group.count++;
        groups.set(id, group);
    }
    for (const [id, name] of [
        ['other', 'Kredit Lain'],
        ['unselected', 'Leasing belum dipilih'],
    ]) {
        if (!groups.has(id)) groups.set(id, { id, name, count: 0 });
    }
    return {
        total: cohort.length,
        cash,
        credit,
        unknown,
        leasing: [...groups.values()].sort(
            (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'),
        ),
    };
}
