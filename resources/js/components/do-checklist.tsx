const confirmations = {
    po_confirmed: 'PO',
    dp_confirmed: 'DP',
    unit_confirmed: 'Unit',
} as const;

export const emptyDoChecklist = {
    po_confirmed: false,
    dp_confirmed: false,
    unit_confirmed: false,
};

type Checklist = typeof emptyDoChecklist;

export function DoChecklist({
    value,
    onChange,
}: {
    value: Checklist;
    onChange: (value: Checklist) => void;
}) {
    return (
        <fieldset className="rounded-lg border px-3">
            <legend className="px-1 text-sm font-medium">Checklist DO</legend>
            {(Object.keys(confirmations) as (keyof Checklist)[]).map((key) => (
                <label
                    key={key}
                    className="flex min-h-11 items-center gap-2 text-sm"
                >
                    <input
                        type="checkbox"
                        required
                        checked={value[key]}
                        onChange={(event) =>
                            onChange({ ...value, [key]: event.target.checked })
                        }
                    />
                    {confirmations[key]}
                </label>
            ))}
        </fieldset>
    );
}
