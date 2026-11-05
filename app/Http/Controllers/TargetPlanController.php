<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\TeamTargetAllocation;
use App\Models\User;
use App\Support\TargetUnits;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TargetPlanController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless(in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true), 403);
        $decimal = ['required', 'numeric', 'min:0', 'max:110000', 'regex:/^\d+(\.\d{1,4})?$/'];
        $validated = $request->validate([
            'team_id' => ['required', 'uuid'], 'period' => ['required', 'date_format:Y-m'],
            'version' => ['required', 'integer', 'min:0'],
            'target_units' => [...$decimal, 'max:10000'], 'markup_percent' => [...$decimal, 'max:1000'],
            'allocations' => ['present', 'array', 'max:1000'],
            'allocations.*.user_id' => ['required', 'integer', 'distinct'],
            'allocations.*.target_units' => $decimal,
        ]);
        $team = Team::query()->visibleTo($actor)->active()->where('public_id', $validated['team_id'])->first();
        abort_unless($team !== null, 403);
        if ($actor->role === UserRole::Supervisor) {
            abort_unless($actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->where('team_id', $team->id)->exists(), 403);
        }
        $rows = $request->collect('allocations');
        DB::transaction(function () use ($actor, $team, $validated, $rows): void {
            $candidateIds = TeamMembership::query()->where('team_id', $team->id)->whereNull('ended_at')->pluck('user_id');
            $savedIds = TeamTargetAllocation::query()->whereHas('target', fn ($q) => $q->where('team_id', $team->id)->whereDate('period', $validated['period'].'-01'))->pluck('user_id');
            // Membership administration locks users before teams; share that order, then re-read membership.
            User::query()->where('dealer_id', $actor->dealer_id)->whereIn('id', $candidateIds->merge($savedIds)->merge($rows->pluck('user_id'))->push($actor->id)->unique())
                ->orderBy('id')->lockForUpdate()->get();
            $actor->refresh();
            abort_unless($actor->is_active && in_array($actor->role, [UserRole::Admin, UserRole::Supervisor], true), 403);
            abort_unless(Team::query()->visibleTo($actor)->active()->whereKey($team->id)->lockForUpdate()->first() !== null, 403);
            $target = TeamTarget::query()->where('team_id', $team->id)->whereDate('period', $validated['period'].'-01')->first()
                ?? new TeamTarget(['team_id' => $team->id, 'period' => $validated['period'].'-01', 'created_by_id' => $actor->id]);
            if (($target->version ?? 0) !== (int) $validated['version']) {
                throw ValidationException::withMessages(['version' => 'Target sudah berubah. Muat ulang halaman sebelum menyimpan.']);
            }
            $currentIds = TeamMembership::query()->where('team_id', $team->id)->whereNull('ended_at')->where('role', UserRole::Sales)
                ->whereHas('user', fn ($q) => $q->where('dealer_id', $actor->dealer_id)->where('is_active', true)->where('role', UserRole::Sales))
                ->pluck('user_id')->unique()->all();
            $existing = $target->exists ? $target->allocations()->orderBy('user_id')->get() : collect();
            $submitted = $rows->keyBy('user_id');
            $requiredIds = $target->version > 0 ? $existing->pluck('user_id')->all() : $currentIds;
            $allowedIds = array_unique([...$currentIds, ...$existing->pluck('user_id')->all()]);
            if (array_diff($submitted->keys()->all(), $allowedIds) !== [] || array_diff($requiredIds, $submitted->keys()->all()) !== []) {
                throw ValidationException::withMessages(['allocations' => 'Anggota tim berubah atau alokasi tidak lengkap. Muat ulang dan tinjau pembagian.']);
            }
            foreach ($existing as $allocation) {
                if (! in_array($allocation->user_id, $currentIds) && TargetUnits::scaled($submitted[$allocation->user_id]['target_units']) !== TargetUnits::scaled($allocation->target_units)) {
                    throw ValidationException::withMessages(['allocations' => 'Target anggota yang keluar tetap disimpan tanpa perubahan.']);
                }
            }
            $benchmark = TargetUnits::benchmark(TargetUnits::scaled($validated['target_units']), TargetUnits::scaled($validated['markup_percent']));
            $total = $submitted->sum(fn ($row) => TargetUnits::scaled($row['target_units']));
            if ($total < $benchmark) {
                throw ValidationException::withMessages(['allocations' => 'Total alokasi harus minimal 100% dari benchmark tim.']);
            }
            $oldPlan = $target->exists ? $this->snapshot($target) : null;
            $oldUnits = $target->exists ? $target->target_units : null;
            $oldValue = $target->exists ? $target->target_value : null;
            $target->fill(['target_units' => $validated['target_units'], 'markup_percent' => $validated['markup_percent'],
                'benchmark_units' => TargetUnits::number($benchmark), 'version' => ($target->version ?? 0) + 1])->save();
            foreach ($submitted as $row) {
                $target->allocations()->updateOrCreate(['user_id' => $row['user_id']], ['target_units' => $row['target_units']]);
            }
            $target->revisions()->create(['changed_by_id' => $actor->id,
                'old_target_units' => $oldUnits, 'new_target_units' => $target->target_units,
                'old_target_value' => $oldValue, 'new_target_value' => $target->target_value ?? 0,
                'old_plan' => $oldPlan, 'new_plan' => $this->snapshot($target)]);
        });

        return back();
    }

    /** @return array<string, mixed> */
    private function snapshot(TeamTarget $target): array
    {
        return ['target_units' => $target->target_units, 'markup_percent' => (float) $target->markup_percent,
            'benchmark_units' => $target->benchmark_units === null ? null : (float) $target->benchmark_units, 'version' => $target->version,
            'allocations' => $target->allocations()->orderBy('user_id')->get()->map(fn ($row) => [
                'user_id' => $row->user_id, 'target_units' => TargetUnits::number(TargetUnits::scaled($row->target_units)),
            ])->all()];
    }
}
