import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { amount } from '@/components/team-performance';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    benchmark,
    equalShare,
    prorata,
    scaled,
} from '@/lib/target-allocation';

export type TargetPlan = {
    team_id: string;
    name: string;
    period: string;
    version: number;
    legacy: boolean;
    target_units: number | null;
    markup_percent: number;
    benchmark_units: number | null;
    members: {
        user_id: number;
        name: string;
        username: string;
        active: boolean;
        target_units: number | null;
        allocated: boolean;
        remaining_workdays: number;
        period_workdays: number;
    }[];
};

export function TargetPlanEditor({ plans }: { plans: TargetPlan[] }) {
    const [teamId, setTeamId] = useState(plans[0]?.team_id ?? '');
    const plan = plans.find((item) => item.team_id === teamId) ?? plans[0];
    if (!plan)
        return (
            <p className="text-sm text-muted-foreground">
                Belum ada tim aktif yang dapat diberi target.
            </p>
        );
    return (
        <section
            className="min-w-0 rounded-xl border bg-card"
            aria-label="Editor rencana target"
        >
            <div className="grid gap-4 border-b p-5 sm:grid-cols-2 sm:items-end">
                <div>
                    <h2 className="text-base font-semibold">
                        Rencana target bulanan
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Target management → benchmark tim → alokasi Sales.
                    </p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="target-plan-team">
                        Tim penerima target
                    </Label>
                    <Combobox
                        id="target-plan-team"
                        value={plan.team_id}
                        options={plans.map((item) => ({
                            value: item.team_id,
                            label: item.name,
                        }))}
                        onValueChange={(id) => {
                            if (
                                id !== plan.team_id &&
                                window.confirm(
                                    'Ganti tim? Perubahan yang belum disimpan akan dibuang.',
                                )
                            )
                                setTeamId(id);
                        }}
                    />
                </div>
            </div>
            <PlanForm
                key={`${plan.team_id}-${plan.period}-${plan.version}`}
                plan={plan}
            />
        </section>
    );
}

function PlanForm({ plan }: { plan: TargetPlan }) {
    const form = useForm({
        team_id: plan.team_id,
        period: plan.period,
        version: plan.version,
        target_units:
            plan.target_units === null ? '' : String(plan.target_units),
        markup_percent: String(plan.markup_percent),
        allocations: plan.members.map((member) => ({
            user_id: member.user_id,
            target_units:
                member.target_units === null ? '' : String(member.target_units),
        })),
    });
    const [manual, setManual] = useState(
        plan.version > 0 ||
            plan.legacy ||
            plan.members.some((m) => m.allocated),
    );
    const [saved, setSaved] = useState(plan.version > 0);
    const bench = benchmark(form.data.target_units, form.data.markup_percent);
    const activeCount = plan.members.filter((m) => m.active).length;
    const originalCount =
        plan.members.filter((m) => m.allocated).length || activeCount;
    const included = form.data.allocations.filter(
        (row) => row.target_units !== '',
    );
    const numbers = included.map((row) => scaled(row.target_units));
    const total = numbers.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const activeTotal = form.data.allocations.reduce(
        (sum, row, index) =>
            sum +
            (plan.members[index].active ? (scaled(row.target_units) ?? 0) : 0),
        0,
    );
    const incomplete = form.data.allocations.some(
        (row, index) =>
            row.target_units === '' &&
            (plan.version === 0 || plan.members[index].allocated),
    );
    const valid =
        bench !== null &&
        !incomplete &&
        numbers.every((n) => n !== null) &&
        total >= bench;
    const changeBase = (
        field: 'target_units' | 'markup_percent',
        value: string,
    ) => {
        setSaved(false);
        const data = { ...form.data, [field]: value };
        const next = benchmark(data.target_units, data.markup_percent);
        if (!manual && next !== null && activeCount > 0) {
            data.allocations = data.allocations.map((row, index) => ({
                ...row,
                target_units: plan.members[index].active
                    ? equalShare(next, activeCount)!
                    : row.target_units,
            }));
        }
        form.setData(data);
    };
    const changeAllocation = (index: number, value: string) => {
        setManual(true);
        setSaved(false);
        form.setData(
            'allocations',
            form.data.allocations.map((row, i) =>
                i === index ? { ...row, target_units: value } : row,
            ),
        );
    };
    const error = (name: string) =>
        (form.errors as Record<string, string>)[name];
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (!valid) return;
                setSaved(false);
                form.transform((data) => ({
                    ...data,
                    target_units: data.target_units.replace(',', '.'),
                    markup_percent: data.markup_percent.replace(',', '.'),
                    allocations: data.allocations
                        .filter((row) => row.target_units !== '')
                        .map((row) => ({
                            ...row,
                            target_units: row.target_units.replace(',', '.'),
                        })),
                }));
                form.post('/target-plans', {
                    preserveScroll: true,
                    onSuccess: () => setSaved(true),
                });
            }}
        >
            <fieldset disabled={form.processing} className="min-w-0">
                <legend className="sr-only">
                    Target {plan.name} periode {plan.period}
                </legend>
                <div className="grid gap-5 p-5 sm:grid-cols-3">
                    <div className="grid content-start gap-2">
                        <Label htmlFor="management-target">
                            Target management (unit)
                        </Label>
                        <Input
                            id="management-target"
                            inputMode="decimal"
                            value={form.data.target_units}
                            aria-invalid={!!error('target_units')}
                            aria-describedby="management-error"
                            onChange={(event) =>
                                changeBase('target_units', event.target.value)
                            }
                        />
                        <InputError
                            id="management-error"
                            message={error('target_units')}
                        />
                    </div>
                    <div className="grid content-start gap-2">
                        <Label htmlFor="target-markup">Markup SPV (%)</Label>
                        <Input
                            id="target-markup"
                            inputMode="decimal"
                            value={form.data.markup_percent}
                            aria-invalid={!!error('markup_percent')}
                            aria-describedby="markup-error"
                            onChange={(event) =>
                                changeBase('markup_percent', event.target.value)
                            }
                        />
                        <InputError
                            id="markup-error"
                            message={error('markup_percent')}
                        />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Benchmark tim (unit)
                        </p>
                        <output
                            data-testid="benchmark"
                            className="mt-2 block text-2xl font-semibold tabular-nums"
                        >
                            {amount(bench === null ? null : bench / 10000, '—')}
                        </output>
                    </div>
                </div>
                {plan.legacy && (
                    <p className="mx-5 mb-5 text-sm text-muted-foreground">
                        Target lama dipertahankan. Tinjau markup dan alokasi
                        sebelum menyimpan sebagai rencana baru.
                    </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-y px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Alokasi personal Sales
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {activeCount} Sales aktif · Maksimal 4 angka
                            desimal; koma atau titik diterima.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={bench === null || activeCount === 0}
                        onClick={() => {
                            if (
                                manual &&
                                !window.confirm(
                                    'Bagi ulang ke Sales aktif? Penyesuaian personal aktif akan diganti; target anggota keluar tetap.',
                                )
                            )
                                return;
                            const retained = form.data.allocations.reduce(
                                (sum, row, index) =>
                                    sum +
                                    (!plan.members[index].active
                                        ? (scaled(row.target_units) ?? 0)
                                        : 0),
                                0,
                            );
                            form.setData(
                                'allocations',
                                form.data.allocations.map((row, index) => ({
                                    ...row,
                                    target_units: plan.members[index].active
                                        ? equalShare(
                                              Math.max(0, bench! - retained),
                                              activeCount,
                                          )!
                                        : row.target_units,
                                })),
                            );
                            setManual(true);
                            setSaved(false);
                        }}
                    >
                        Bagi rata
                    </Button>
                </div>
                {plan.members.length === 0 && (
                    <p className="p-5 text-sm text-muted-foreground">
                        Tim belum mempunyai Sales aktif. Target positif
                        memerlukan alokasi Sales.
                    </p>
                )}
                <div>
                    {plan.members.map((member, index) => {
                        const suggestion =
                            bench === null
                                ? null
                                : prorata(
                                      bench,
                                      originalCount,
                                      member.remaining_workdays,
                                      member.period_workdays,
                                  );
                        return (
                            <div
                                key={member.user_id}
                                className="striped-row grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)] sm:items-center"
                            >
                                <div className="min-w-0">
                                    <Label
                                        htmlFor={`allocation-${member.user_id}`}
                                        className="break-words"
                                    >
                                        {member.name}
                                    </Label>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {!member.active
                                            ? 'Anggota keluar · target tetap'
                                            : !member.allocated &&
                                                plan.version > 0
                                              ? 'Anggota baru · tentukan target sesuai kesiapan'
                                              : member.username}
                                    </p>
                                    {member.active &&
                                        !member.allocated &&
                                        plan.version > 0 &&
                                        suggestion !== null && (
                                            <div className="mt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        changeAllocation(
                                                            index,
                                                            suggestion,
                                                        )
                                                    }
                                                >
                                                    Pakai saran{' '}
                                                    {amount(Number(suggestion))}{' '}
                                                    unit
                                                </Button>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {member.remaining_workdays}/
                                                    {member.period_workdays}{' '}
                                                    hari Senin–Jumat tersisa,
                                                    tanpa hari libur.
                                                </p>
                                            </div>
                                        )}
                                </div>
                                <div className="grid gap-1">
                                    <Input
                                        id={`allocation-${member.user_id}`}
                                        inputMode="decimal"
                                        readOnly={!member.active}
                                        value={
                                            form.data.allocations[index]
                                                .target_units
                                        }
                                        placeholder="Belum dialokasikan"
                                        aria-invalid={
                                            !!error(
                                                `allocations.${index}.target_units`,
                                            )
                                        }
                                        aria-describedby={`allocation-error-${member.user_id}`}
                                        onChange={(event) =>
                                            changeAllocation(
                                                index,
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        id={`allocation-error-${member.user_id}`}
                                        message={error(
                                            `allocations.${index}.target_units`,
                                        )}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="grid gap-4 border-t p-5">
                    <div
                        aria-live="polite"
                        aria-atomic="true"
                        className="text-sm tabular-nums"
                        data-testid="allocation-summary"
                    >
                        <p className="font-semibold">
                            Total alokasi {amount(total / 10000)} unit ·{' '}
                            {bench !== null && bench > 0
                                ? amount(
                                      Math.round((total / bench) * 10000) / 100,
                                  ) + '%'
                                : '—'}
                        </p>
                        <p
                            className={
                                bench !== null && total < bench
                                    ? 'mt-1 text-destructive'
                                    : 'mt-1 text-muted-foreground'
                            }
                        >
                            {bench === null
                                ? 'Isi target management dan markup yang valid.'
                                : total < bench
                                  ? `Kurang ${amount((bench - total) / 10000)} unit dari benchmark.`
                                  : total > bench
                                    ? `Melebihi benchmark ${amount((total - bench) / 10000)} unit.`
                                    : 'Alokasi memenuhi benchmark tim.'}
                        </p>
                        {incomplete && (
                            <p className="mt-1 text-destructive">
                                Lengkapi alokasi Sales; gunakan 0 jika tidak
                                dibebankan target.
                            </p>
                        )}
                        {numbers.some((n) => n === null) && (
                            <p className="mt-1 text-destructive">
                                Target Sales harus angka nonnegatif, maksimal
                                110.000 unit dan 4 desimal.
                            </p>
                        )}
                        {bench !== null &&
                            activeTotal < bench &&
                            activeTotal < total && (
                                <p className="mt-1 text-destructive">
                                    Risiko kapasitas: alokasi anggota aktif
                                    hanya {amount(activeTotal / 10000)} unit;
                                    benchmark tetap.
                                </p>
                            )}
                    </div>
                    <InputError message={error('allocations')} />
                    <InputError message={error('version')} />
                    {error('version') && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Muat ulang target
                        </Button>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            type="submit"
                            disabled={!valid || form.processing}
                        >
                            {form.processing
                                ? 'Menyimpan…'
                                : 'Simpan rencana target'}
                        </Button>
                        <p
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            {saved
                                ? 'Rencana target tersimpan.'
                                : 'Perubahan belum disimpan sampai Anda menekan Simpan.'}
                        </p>
                    </div>
                </div>
            </fieldset>
        </form>
    );
}
