<?php

namespace App\Http\Controllers;

use App\Enums\ActivityType;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\FollowUp;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesCalendarController extends Controller
{
    private const TZ = 'Asia/Jakarta';

    private const ACTIVITY_TYPES = [ActivityType::Call, ActivityType::Whatsapp, ActivityType::Visit, ActivityType::Meeting, ActivityType::Note];

    public function __invoke(Request $request): Response
    {
        $validated = $request->validate([
            'view' => ['sometimes', 'in:month,day'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'team' => ['sometimes', 'string', 'max:64'],
        ]);
        /** @var User $actor */
        $actor = $request->user();
        $now = CarbonImmutable::now(self::TZ);
        $view = $validated['view'] ?? 'month';
        $date = CarbonImmutable::createFromFormat('!Y-m-d', $validated['date'] ?? $now->toDateString(), self::TZ);
        $from = $view === 'month' ? $date->startOfMonth() : $date;
        $until = $view === 'month' ? $from->addMonth() : $from->addDay();

        $teams = [];
        $rows = null;
        $selectedTeam = $validated['team'] ?? null;
        $ownerIds = [$actor->id];

        if ($actor->role === UserRole::Supervisor) {
            $supervised = Team::visibleTo($actor)
                ->whereIn('id', $actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->select('team_id'))
                ->orderBy('name')->get(['id', 'public_id', 'name']);
            $memberships = TeamMembership::query()->active()
                ->where('role', UserRole::Sales)
                ->whereIn('team_id', $supervised->pluck('id'))
                ->whereHas('user', fn ($query) => $query->where('is_active', true))
                ->with('user:id,name')->get(['team_id', 'user_id']);

            $teams = $supervised->map(fn (Team $team) => [
                'id' => $team->public_id,
                'name' => $team->name,
                'count' => $memberships->where('team_id', $team->id)->count(),
            ])->values()->all();

            if ($selectedTeam !== null) {
                $team = $supervised->firstWhere('public_id', $selectedTeam);
                abort_if($team === null, 404);
                $memberships = $memberships->where('team_id', $team->id);
            }

            $teamNames = $supervised->pluck('name', 'id');
            $rows = $memberships->groupBy('user_id')
                ->map(fn ($group) => [
                    'id' => $group->first()->user_id,
                    'name' => $group->first()->user->name,
                    'team' => $group->map(fn (TeamMembership $m) => $teamNames[$m->team_id])->unique()->sort()->implode(', '),
                ])
                ->sortBy('name')->values()->all();
            $ownerIds = array_column($rows, 'id');
        }

        $fromUtc = $from->utc();
        $untilUtc = $until->utc();
        $plans = FollowUp::query()->whereIn('assigned_to_id', $ownerIds)
            ->where('status', '!=', 'cancelled')
            ->where('scheduled_at', '>=', $fromUtc)->where('scheduled_at', '<', $untilUtc)
            ->with('customer:id,public_id,name')->get()
            ->map(fn (FollowUp $f) => [
                ...$this->item('plan-'.$f->id, 'plan', 'plan', 'Rencana', $f->assigned_to_id, $f->scheduled_at, $f->customer, $f->plan_notes,
                    $f->status === 'pending' && $f->scheduled_at->lt($now)),
                'status' => $f->status === 'completed' ? 'completed' : 'pending',
                'follow_up_id' => $f->id,
            ]);
        $done = CustomerActivity::query()->whereIn('user_id', $ownerIds)
            ->whereIn('type', self::ACTIVITY_TYPES)
            ->where('occurred_at', '>=', $fromUtc)->where('occurred_at', '<', $untilUtc)
            ->with('customer:id,public_id,name')->get()
            ->map(fn (CustomerActivity $a) => [
                ...$this->item('done-'.$a->id, 'done', $a->type->value, $a->type->label(), $a->user_id, $a->occurred_at, $a->customer, $a->notes, false),
                'status' => 'completed',
                'follow_up_id' => null,
            ]);

        return Inertia::render('calendar/index', [
            'view' => $view,
            'date' => $date->toDateString(),
            'today' => $now->toDateString(),
            'now' => $now->format('H:i'),
            'teams' => $teams,
            'team' => $selectedTeam,
            'rows' => $rows,
            'items' => $plans->concat($done)->sortBy(['at', 'id'])->map(fn (array $item) => array_diff_key($item, ['at' => true]))->values()->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function item(string $id, string $kind, string $type, string $label, int $userId, CarbonInterface $at, ?Customer $customer, ?string $notes, bool $overdue): array
    {
        $local = CarbonImmutable::instance($at)->setTimezone(self::TZ);

        return [
            'at' => $at->getTimestamp(),
            'id' => $id,
            'kind' => $kind,
            'type' => $type,
            'type_label' => $label,
            'user_id' => $userId,
            'date' => $local->toDateString(),
            'time' => $local->format('H:i'),
            'customer' => $customer->name ?? '',
            'customer_id' => $customer?->public_id,
            'notes' => $notes ?? '',
            'overdue' => $overdue,
        ];
    }
}
