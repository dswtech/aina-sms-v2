import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const selectClass =
    'border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm';

export function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

export type AreaFinancing = {
    region: string; // '' = not filled, 'other' = Kota Lain
    district: string;
    city: string;
    financing: string; // '' = undecided, 'cash' | 'credit'
    leasing: string; // master id, 'other' or ''
    otherLeasing: string;
};
export const emptyAreaFinancing: AreaFinancing = {
    region: '',
    district: '',
    city: '',
    financing: '',
    leasing: '',
    otherLeasing: '',
};

type Regions = { code: string; name: string }[];
type Districts = { code: string; region_code: string; name: string }[];
type Leasings = { id: number; name: string }[];
type Errors = Record<string, string>;

// Same shapes the shared transaction service validates (TransactionMetadata).
export const areaPayload = (v: AreaFinancing) =>
    v.region
        ? {
              region_code: v.region,
              district_code: v.region === 'other' ? null : v.district || null,
              other_city: v.region === 'other' ? v.city : null,
          }
        : null;
export const financingPayload = (v: AreaFinancing) =>
    v.financing
        ? {
              type: v.financing,
              leasing_id: v.financing === 'credit' ? v.leasing || null : null,
              other_name: v.leasing === 'other' ? v.otherLeasing : null,
          }
        : null;

export function FinancingFields({
    value,
    onChange,
    leasings,
    errors,
    idPrefix = '',
}: {
    value: AreaFinancing;
    onChange: (next: AreaFinancing) => void;
    leasings: Leasings;
    errors: Errors;
    idPrefix?: string;
}) {
    const set = (patch: Partial<AreaFinancing>) =>
        onChange({ ...value, ...patch });

    return (
        <>
            <Field
                id={`${idPrefix}financing`}
                label="Pembiayaan"
                error={errors['financing.type']}
            >
                <select
                    id={`${idPrefix}financing`}
                    className={selectClass}
                    value={value.financing}
                    onChange={(e) => set({ financing: e.target.value })}
                >
                    <option value="">Belum ditentukan</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Kredit</option>
                </select>
            </Field>
            {value.financing === 'credit' && (
                <Field
                    id={`${idPrefix}leasing`}
                    label="Leasing"
                    error={errors['financing.leasing_id']}
                >
                    <select
                        id={`${idPrefix}leasing`}
                        className={selectClass}
                        value={value.leasing}
                        onChange={(e) => set({ leasing: e.target.value })}
                    >
                        <option value="">Leasing belum dipilih</option>
                        {leasings.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                        <option value="other">Kredit Lain</option>
                    </select>
                </Field>
            )}
            {value.financing === 'credit' && value.leasing === 'other' && (
                <Field
                    id={`${idPrefix}other-leasing`}
                    label="Nama leasing"
                    error={errors['financing.other_name']}
                >
                    <Input
                        id={`${idPrefix}other-leasing`}
                        className="min-h-11"
                        value={value.otherLeasing}
                        onChange={(e) => set({ otherLeasing: e.target.value })}
                    />
                </Field>
            )}
        </>
    );
}

export function AreaFields({
    value,
    onChange,
    regions,
    districts,
    errors,
    idPrefix = '',
}: {
    value: AreaFinancing;
    onChange: (next: AreaFinancing) => void;
    regions: Regions;
    districts: Districts;
    errors: Errors;
    idPrefix?: string;
}) {
    const set = (patch: Partial<AreaFinancing>) =>
        onChange({ ...value, ...patch });

    return (
        <>
            <Field
                id={`${idPrefix}region`}
                label="Kabupaten/Kota"
                error={errors['area.region_code']}
            >
                <select
                    id={`${idPrefix}region`}
                    className={selectClass}
                    value={value.region}
                    onChange={(e) =>
                        set({ region: e.target.value, district: '' })
                    }
                >
                    <option value="">Belum diisi</option>
                    {regions.map((r) => (
                        <option key={r.code} value={r.code}>
                            {r.name}
                        </option>
                    ))}
                    <option value="other">Kota Lain</option>
                </select>
            </Field>
            {value.region !== '' && value.region !== 'other' && (
                <Field
                    id={`${idPrefix}district`}
                    label="Kecamatan"
                    error={errors['area.district_code']}
                >
                    <select
                        id={`${idPrefix}district`}
                        className={selectClass}
                        value={value.district}
                        onChange={(e) => set({ district: e.target.value })}
                    >
                        <option value="">Pilih kecamatan</option>
                        {districts
                            .filter((d) => d.region_code === value.region)
                            .map((d) => (
                                <option key={d.code} value={d.code}>
                                    {d.name}
                                </option>
                            ))}
                    </select>
                </Field>
            )}
            {value.region === 'other' && (
                <Field
                    id={`${idPrefix}city`}
                    label="Nama kota"
                    error={errors['area.other_city']}
                >
                    <Input
                        id={`${idPrefix}city`}
                        className="min-h-11"
                        value={value.city}
                        onChange={(e) => set({ city: e.target.value })}
                    />
                </Field>
            )}
        </>
    );
}
