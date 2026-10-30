<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Models\AuditLog;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive', 'invited'])],
        ]);
        $query = trim((string) ($filters['q'] ?? ''));
        $status = (string) ($filters['status'] ?? 'all');
        $actor = $request->user();

        $users = User::query()
            ->visibleTo($actor)
            ->when($status === 'active', fn (Builder $builder) => $builder->where('is_active', true))
            ->when($status === 'inactive', fn (Builder $builder) => $builder->where('is_active', false))
            ->when($status === 'invited', fn (Builder $builder) => $builder->whereRaw('1 = 0'))
            ->when($query !== '', fn (Builder $builder) => $builder->where(function (Builder $builder) use ($query): void {
                $builder->whereLike('name', "%{$query}%")
                    ->orWhereLike('username', "%{$query}%")
                    ->orWhereLike('email', "%{$query}%");
            }))
            ->orderBy('id')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->public_id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role->value,
                'status' => $user->is_active ? 'active' : 'inactive',
                'is_self' => $user->is($actor),
            ]);

        $invitations = Invitation::query()
            ->visibleTo($actor)
            ->when(in_array($status, ['active', 'inactive'], true), fn (Builder $builder) => $builder->whereRaw('1 = 0'))
            ->when($query !== '', fn (Builder $builder) => $builder->where(function (Builder $builder) use ($query): void {
                $builder->whereLike('name', "%{$query}%")
                    ->orWhereLike('username', "%{$query}%")
                    ->orWhereLike('email', "%{$query}%");
            }))
            ->orderBy('id')
            ->get()
            ->map(fn (Invitation $invitation) => [
                'id' => $invitation->public_id,
                'name' => $invitation->name,
                'username' => $invitation->username,
                'email' => $invitation->email,
                'role' => $invitation->role->value,
                'status' => $invitation->state(),
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'invitations' => $invitations,
            'teams' => Team::query()->visibleTo($actor)->active()->orderBy('name')->get(['id', 'name']),
            'filters' => ['q' => $query, 'status' => $status],
        ]);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): RedirectResponse
    {
        $active = $request->boolean('is_active');

        if ($request->user()->is($user) && ! $active) {
            throw ValidationException::withMessages(['user' => 'Anda tidak dapat menonaktifkan akun sendiri.']);
        }

        if ($user->is_active === $active) {
            return back();
        }

        DB::transaction(function () use ($active, $request, $user): void {
            $user->update(['is_active' => $active]);
            AuditLog::query()->create([
                'dealer_id' => $user->dealer_id,
                'actor_id' => $request->user()->id,
                'action' => $active ? 'user.reactivated' : 'user.deactivated',
                'subject_type' => 'user',
                'subject_public_id' => $user->public_id,
                'metadata' => ['role' => $user->role->value],
            ]);
        });

        return back()->with('status', $active ? 'Akun diaktifkan kembali.' : 'Akun dinonaktifkan.');
    }
}
