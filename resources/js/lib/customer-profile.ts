// Pure helpers for the customer profile. No `@/` imports: node --test runs this file directly.

export const GENDERS = [
    { value: 'L', label: 'Laki-laki' },
    { value: 'P', label: 'Perempuan' },
];

export const OCCUPATIONS = [
    { value: 'farmer', label: 'Petani' },
    { value: 'employee', label: 'Karyawan' },
    { value: 'civil-servant', label: 'PNS' },
    { value: 'teacher', label: 'Guru' },
    { value: 'entrepreneur', label: 'Wiraswasta' },
    { value: 'others', label: 'Lainnya' },
];

export const TENORS = [12, 24, 36, 48, 60];

export const INSURANCES = [
    { value: 'tlo', label: 'TLO' },
    { value: 'all_risk', label: 'All Risk' },
    { value: 'combination', label: 'Kombinasi' },
];

export type ProfileField =
    | 'gender'
    | 'address'
    | 'birth_date'
    | 'occupation'
    | 'area';

export type CustomerProfile = {
    gender: string | null;
    address: string | null;
    birth_date: string | null;
    occupation: string | null;
    region_code: string | null;
    district_code: string | null;
    other_city: string | null;
};

export type ProfileDraft = {
    gender: string;
    address: string;
    birth_date: string;
    occupation: string;
    region: string; // '' = not filled, 'other' = Kota Lain
    district: string;
    city: string;
};

export const draftFromProfile = (
    p?: Partial<CustomerProfile> | null,
): ProfileDraft => ({
    gender: p?.gender ?? '',
    address: p?.address ?? '',
    birth_date: p?.birth_date ?? '',
    occupation: p?.occupation ?? '',
    region: p?.region_code ?? '',
    district: p?.district_code ?? '',
    city: p?.other_city ?? '',
});

const hasArea = (p: ProfileDraft) =>
    p.district !== '' || (p.region === 'other' && p.city.trim() !== '');

/** Mirrors Customer::assertProfileFor: gender and address from Prospect, area and occupation at SPK. */
export function requiredProfileFields(stage: string): ProfileField[] {
    const fromProspect = ['prospect', 'hot_prospect', 'spk'].includes(stage);

    return [
        ...(fromProspect ? (['gender', 'address'] as const) : []),
        ...(stage === 'spk' ? (['occupation', 'area'] as const) : []),
    ];
}

/** Required fields the saved profile does not hold yet: the ones the stage dialog must ask for. */
export function missingProfileFields(
    stage: string,
    saved: Partial<CustomerProfile> | null | undefined,
): ProfileField[] {
    const draft = draftFromProfile(saved);

    return requiredProfileFields(stage).filter((field) =>
        field === 'area' ? !hasArea(draft) : draft[field].trim() === '',
    );
}

export type ProfilePayload = {
    gender?: string;
    address?: string;
    birth_date?: string;
    occupation?: string;
    area?: {
        region_code: string;
        district_code: string | null;
        other_city: string | null;
    };
};

/** `customer` block of the stage request: only fields that carry a value, as the server never blanks. */
export function profilePayload(
    draft: ProfileDraft,
    fields: ProfileField[],
): ProfilePayload | undefined {
    const out: ProfilePayload = {};
    for (const field of fields) {
        if (field === 'area') {
            if (draft.region)
                out.area = {
                    region_code: draft.region,
                    district_code:
                        draft.region === 'other'
                            ? null
                            : draft.district || null,
                    other_city: draft.region === 'other' ? draft.city : null,
                };
        } else if (draft[field].trim() !== '') out[field] = draft[field].trim();
    }

    return Object.keys(out).length > 0 ? out : undefined;
}
