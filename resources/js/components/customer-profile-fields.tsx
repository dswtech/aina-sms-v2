import {
    AreaFields,
    Field,
    selectClass,
} from '@/components/transaction-fields';
import { Input } from '@/components/ui/input';
import {
    GENDERS,
    OCCUPATIONS,
    type ProfileDraft,
    type ProfileField,
} from '@/lib/customer-profile';

type Regions = { code: string; name: string }[];
type Districts = { code: string; region_code: string; name: string }[];

/**
 * Customer profile inputs. `errors` holds server keys as sent (flat on lead creation, `customer.*` on a stage
 * change); `errorPrefix` strips the `customer.` part so both read the same.
 */
export function CustomerProfileFields({
    fields,
    value,
    onChange,
    regions,
    districts,
    errors,
    errorPrefix = '',
    idPrefix = '',
    requiredFields = [],
}: {
    fields: ProfileField[];
    value: ProfileDraft;
    onChange: (next: ProfileDraft) => void;
    regions: Regions;
    districts: Districts;
    errors: Record<string, string>;
    errorPrefix?: string;
    idPrefix?: string;
    requiredFields?: ProfileField[];
}) {
    const set = (patch: Partial<ProfileDraft>) =>
        onChange({ ...value, ...patch });
    const error = (key: string) => errors[`${errorPrefix}${key}`];
    const mark = (field: ProfileField, label: string) =>
        requiredFields.includes(field) ? `${label} *` : label;
    const areaErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([key]) => key.startsWith(`${errorPrefix}area.`))
            .map(([key, message]) => [key.slice(errorPrefix.length), message]),
    );

    return (
        <>
            {fields.includes('gender') && (
                <Field
                    id={`${idPrefix}gender`}
                    label={mark('gender', 'Gender')}
                    error={error('gender')}
                >
                    <select
                        id={`${idPrefix}gender`}
                        className={selectClass}
                        value={value.gender}
                        onChange={(e) => set({ gender: e.target.value })}
                    >
                        <option value="">Belum dipilih</option>
                        {GENDERS.map((g) => (
                            <option key={g.value} value={g.value}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {fields.includes('address') && (
                <Field
                    id={`${idPrefix}address`}
                    label={mark('address', 'Alamat')}
                    error={error('address')}
                >
                    <Input
                        id={`${idPrefix}address`}
                        className="min-h-11"
                        maxLength={1000}
                        value={value.address}
                        onChange={(e) => set({ address: e.target.value })}
                    />
                </Field>
            )}
            {fields.includes('birth_date') && (
                <Field
                    id={`${idPrefix}birth-date`}
                    label="Tanggal lahir"
                    error={error('birth_date')}
                >
                    <Input
                        id={`${idPrefix}birth-date`}
                        type="date"
                        className="min-h-11"
                        value={value.birth_date}
                        onChange={(e) => set({ birth_date: e.target.value })}
                    />
                </Field>
            )}
            {fields.includes('occupation') && (
                <Field
                    id={`${idPrefix}occupation`}
                    label={mark('occupation', 'Pekerjaan')}
                    error={error('occupation')}
                >
                    <select
                        id={`${idPrefix}occupation`}
                        className={selectClass}
                        value={value.occupation}
                        onChange={(e) => set({ occupation: e.target.value })}
                    >
                        <option value="">Belum dipilih</option>
                        {OCCUPATIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {fields.includes('area') && (
                <AreaFields
                    idPrefix={`${idPrefix}customer-`}
                    value={{
                        region: value.region,
                        district: value.district,
                        city: value.city,
                        financing: '',
                        leasing: '',
                        otherLeasing: '',
                        tenor: '',
                        insurance: '',
                    }}
                    onChange={(next) =>
                        set({
                            region: next.region,
                            district: next.district,
                            city: next.city,
                        })
                    }
                    regions={regions}
                    districts={districts}
                    errors={areaErrors}
                    districtLabel={mark('area', 'Kecamatan')}
                />
            )}
        </>
    );
}
