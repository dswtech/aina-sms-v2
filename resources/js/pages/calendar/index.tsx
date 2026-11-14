import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    UsersRound,
} from 'lucide-react';
import { DayAgenda } from '@/components/calendar/day-agenda';
import { MonthGrid } from '@/components/calendar/month-grid';
import { EmptyState, Legend, PlanActions } from '@/components/calendar/parts';
import { PlanDialog } from '@/components/calendar/plan-dialog';
import {
    TeamGrid,
    type CalendarRow,
    type TeamColumn,
} from '@/components/calendar/team-grid';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    FIRST_HOUR,
    LAST_HOUR,
    formatDay,
    formatMonth,
    isWeekend,
    monthDays,
    shiftDate,
    weekdayLetter,
    type CalendarItem,
    type CalendarView,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

type Props = {
    view: CalendarView;
    date: string;
    today: string;
    now: string;
    teams: { id: string; name: string; count: number }[];
    team: string | null;
    rows: CalendarRow[] | null;
    items: CalendarItem[];
};

export default function Calendar({
    view,
    date,
    today,
    now,
    teams,
    team,
    rows,
    items,
}: Props) {
    const { auth } = usePage().props;
    const [plan, setPlan] = useState<CalendarItem | null>(null);
    const supervisor = auth.user.role === 'supervisor';
    const unit = view === 'month' ? 'Bulan' : 'Hari';

    function go(
        next: Partial<{
            view: CalendarView;
            date: string;
            team: string | null;
        }>,
    ) {
        const params = { view, date, team, ...next };
        router.get(
            '/kalender',
            {
                view: params.view === 'day' ? 'day' : undefined,
                date: params.date === today ? undefined : params.date,
                team: params.team ?? undefined,
            },
            { preserveScroll: true, replace: true },
        );
    }

    const openDay = (day: string) => go({ view: 'day', date: day });
    const columns: TeamColumn[] =
        view === 'month'
            ? monthDays(date).map((day) => ({
                  key: day,
                  label: String(Number(day.slice(8))),
                  sub: weekdayLetter(day),
                  weekend: isWeekend(day),
                  today: day === today,
                  date: day,
              }))
            : Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => {
                  const hour = FIRST_HOUR + i;

                  return {
                      key: String(hour),
                      label: `${String(hour).padStart(2, '0')}:00`,
                      weekend: false,
                      today: date === today && Number(now.slice(0, 2)) === hour,
                  };
              });
    const selectedTeam = teams.find((t) => t.id === team);

    return (
        <>
            <Head title="Kalender" />
            <PlanDialog item={plan} onClose={() => setPlan(null)} />
            <PlanActions.Provider value={setPlan}>
                <div className="mx-auto grid w-full max-w-screen-2xl min-w-0 flex-1 content-start gap-4 px-4 pt-6 pb-28 sm:px-8 sm:pt-8 md:pb-12 lg:px-10">
                    <header>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Kalender
                        </h1>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {supervisor
                                ? 'Rencana dan realisasi kegiatan Sales di tim Anda.'
                                : 'Rencana follow-up dan kegiatan yang sudah Anda catat.'}
                        </p>
                    </header>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <ToggleGroup
                                type="single"
                                value={view}
                                onValueChange={(value) =>
                                    value && go({ view: value as CalendarView })
                                }
                                aria-label="Tampilan kalender"
                                className="w-full gap-0.5 rounded-[10px] bg-muted p-[3px] sm:w-auto"
                            >
                                {(['month', 'day'] as const).map((v) => (
                                    <ToggleGroupItem
                                        key={v}
                                        value={v}
                                        className="h-11 flex-1 rounded-[7px] px-4 text-[13px] font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:h-[30px]"
                                    >
                                        {v === 'month' ? 'Bulanan' : 'Harian'}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <Button
                                variant="outline"
                                onClick={() => go({ date: today })}
                            >
                                Hari ini
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label={`${unit} sebelumnya`}
                                onClick={() =>
                                    go({ date: shiftDate(date, view, -1) })
                                }
                            >
                                <ChevronLeft aria-hidden="true" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label={`${unit} berikutnya`}
                                onClick={() =>
                                    go({ date: shiftDate(date, view, 1) })
                                }
                            >
                                <ChevronRight aria-hidden="true" />
                            </Button>
                            <h2
                                aria-live="polite"
                                className="ml-1 text-lg font-semibold"
                            >
                                {view === 'month'
                                    ? formatMonth(date)
                                    : formatDay(date)}
                            </h2>
                            {view === 'day' && date === today && (
                                <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                                    Hari ini
                                </span>
                            )}
                            {view === 'day' && isWeekend(date) && (
                                <span className="calendar-weekend inline-flex h-6 items-center rounded-full border bg-muted/50 px-2.5 text-[11.5px] font-semibold text-muted-foreground">
                                    Akhir pekan
                                </span>
                            )}
                        </div>
                        <Legend mix={supervisor && view === 'month'} />
                    </div>

                    {supervisor && rows ? (
                        <section
                            aria-label={
                                view === 'month'
                                    ? 'Grid kegiatan tim'
                                    : 'Kegiatan tim per jam'
                            }
                            className="min-w-0 overflow-hidden rounded-[14px] border bg-card"
                        >
                            {teams.length > 1 && (
                                <div
                                    role="group"
                                    aria-label="Filter tim"
                                    className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
                                >
                                    {[
                                        {
                                            id: null,
                                            name: 'Semua',
                                            count: teams.reduce(
                                                (sum, t) => sum + t.count,
                                                0,
                                            ),
                                        },
                                        ...teams,
                                    ].map((t) => (
                                        <button
                                            key={t.id ?? 'all'}
                                            type="button"
                                            aria-pressed={team === t.id}
                                            onClick={() => go({ team: t.id })}
                                            className={cn(
                                                'h-11 cursor-pointer rounded-full border bg-card px-4 text-[12.5px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:px-3.5',
                                                team === t.id &&
                                                    'border-accent bg-accent text-accent-foreground',
                                            )}
                                        >
                                            {t.name} · {t.count}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {rows.length === 0 ? (
                                <EmptyState
                                    icon={
                                        <UsersRound
                                            aria-hidden="true"
                                            className="size-6"
                                        />
                                    }
                                    title={
                                        selectedTeam
                                            ? `${selectedTeam.name} belum punya anggota`
                                            : 'Tim Anda belum punya anggota Sales'
                                    }
                                    description="Agenda Sales akan tampil di sini setelah ada anggota yang ditambahkan ke tim ini."
                                />
                            ) : (
                                <>
                                    {items.length === 0 && (
                                        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-[10px] bg-muted px-3.5 py-3">
                                            <CalendarDays
                                                aria-hidden="true"
                                                className="mt-px size-5 shrink-0 text-muted-foreground"
                                            />
                                            <div>
                                                <div className="text-[13px] font-semibold">
                                                    Belum ada kegiatan di{' '}
                                                    {view === 'month'
                                                        ? 'bulan'
                                                        : 'hari'}{' '}
                                                    ini
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Rencana dan realisasi akan
                                                    muncul setelah Sales
                                                    mencatat follow-up.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <TeamGrid
                                        view={view}
                                        rows={rows}
                                        columns={columns}
                                        items={items}
                                        date={date}
                                        onOpenDay={openDay}
                                    />
                                    <p className="px-4 py-2.5 text-xs text-muted-foreground">
                                        {view === 'month'
                                            ? 'Klik tanggal di header untuk membuka tampilan Harian. Di layar kecil, geser ke samping untuk melihat tanggal lain.'
                                            : 'Arahkan kursor atau ketuk kegiatan untuk melihat keterangan.'}
                                    </p>
                                </>
                            )}
                        </section>
                    ) : view === 'month' ? (
                        <MonthGrid
                            date={date}
                            today={today}
                            items={items}
                            onOpenDay={openDay}
                        />
                    ) : (
                        <DayAgenda
                            items={items}
                            now={date === today ? now : null}
                        />
                    )}
                </div>
            </PlanActions.Provider>
        </>
    );
}

Calendar.layout = {
    breadcrumbs: [{ title: 'Kalender', href: '/kalender' }],
};
