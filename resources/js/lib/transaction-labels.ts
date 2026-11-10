export const CHANNEL_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Website',
    other: 'Lainnya',
};

export type Area = {
    region_code: string | null;
    district_code: string | null;
    region_name: string | null;
    district_name: string | null;
    other_city: string | null;
};
export type RowDetail = {
    source: string;
    source_channel: string | null;
    area: Area;
    financing: {
        type: string | null;
        leasing_id: number | null;
        other_name: string | null;
        leasing_name?: string | null;
        tenor_months?: number | null;
        insurance_type?: string | null;
    };
    supervisors: { id: number; name: string }[];
};

export const formatDate = (value: string | null) =>
    value
        ? new Date(value).toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : '-';
export const sourceLabel = (t: RowDetail) =>
    t.source_channel
        ? `${t.source} · ${CHANNEL_LABELS[t.source_channel] ?? t.source_channel}`
        : t.source;
export const areaLabel = (t: { area: Area }, full = false) => {
    const {
        district_name: district,
        region_name: region,
        other_city: city,
    } = t.area;
    if (city) return city;
    if (!district) return '-';
    // Names repeat across regions (e.g. Cisarua), so the parent is always shown in full mode.
    return full && region ? `${district}, ${region}` : district;
};
export const supervisorLabel = (t: RowDetail) =>
    t.supervisors.map((user) => user.name).join(', ') || '-';
const INSURANCE_LABELS: Record<string, string> = {
    tlo: 'TLO',
    all_risk: 'All Risk',
    combination: 'Kombinasi',
};
export const financingLabel = (t: RowDetail) => {
    if (t.financing.type === 'cash') return 'Cash';
    if (t.financing.type !== 'credit') return 'Belum ditentukan';
    const { leasing_name, other_name, tenor_months, insurance_type } =
        t.financing;

    return [
        'Kredit',
        leasing_name ?? other_name,
        tenor_months ? `${tenor_months} bulan` : null,
        insurance_type
            ? (INSURANCE_LABELS[insurance_type] ?? insurance_type)
            : null,
    ]
        .filter(Boolean)
        .join(' · ');
};
