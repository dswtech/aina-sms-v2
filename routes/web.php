<?php

use App\Http\Controllers\Admin\InvitationLifecycleController;
use App\Http\Controllers\Admin\TeamController;
use App\Http\Controllers\Admin\TeamMembershipController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Customer\CustomerController;
use App\Http\Controllers\Customer\DealCommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::get('activate/{token}', [InvitationController::class, 'show'])
    ->middleware('guest')
    ->name('invitations.show');
Route::post('activate/{token}', [InvitationController::class, 'accept'])
    ->middleware(['guest', 'throttle:6,1'])
    ->name('invitations.accept');

Route::get('/', fn () => auth()->check()
    ? redirect()->route('dashboard')
    : redirect()->route('login'))->name('home');

Route::middleware(['auth', 'active', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('role:sales,supervisor,admin')->group(function () {
        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
        Route::post('customers/{customer}/activities', [CustomerController::class, 'storeActivity'])->name('customers.activities.store');
        Route::post('customers/{customer}/follow-ups', [CustomerController::class, 'storeFollowUp'])->name('customers.follow-ups.store');
        Route::post('customers/{customer}/transactions', [CustomerController::class, 'storeTransaction'])->name('customers.transactions.store');
        Route::patch('customers/{customer}/assignment', [CustomerController::class, 'reassign'])->name('customers.reassign');
        Route::patch('transactions/{transaction}/stage', [CustomerController::class, 'updateStage'])->name('transactions.stage');
        Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('transactions/{transaction}/comments', [DealCommentController::class, 'store'])->name('deals.comments.store');
        Route::patch('comments/{comment}', [DealCommentController::class, 'update'])->name('comments.update');

        Route::inertia('transactions', 'module-status', [
            'module' => 'transactions',
        ])->name('transactions.index');
    });

    Route::inertia('targets', 'module-status', ['module' => 'targets'])
        ->middleware('role:supervisor')
        ->name('targets.index');

    Route::inertia('team-performance', 'module-status', ['module' => 'team-performance'])
        ->middleware('role:branch_manager')
        ->name('team-performance.index');

    Route::inertia('analytics', 'module-status', ['module' => 'analytics'])
        ->middleware('role:supervisor,branch_manager,admin')
        ->name('analytics.index');

    Route::inertia('imports', 'module-status', ['module' => 'imports'])
        ->middleware('role:supervisor,admin')
        ->name('imports.index');

    Route::middleware('role:admin')->group(function () {
        Route::post('invitations', [InvitationController::class, 'store'])->name('invitations.store');
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');
        Route::post('invitations/{invitation}/resend', [InvitationLifecycleController::class, 'resend'])->name('invitations.resend');
        Route::patch('invitations/{invitation}/revoke', [InvitationLifecycleController::class, 'revoke'])->name('invitations.revoke');
        Route::get('teams', [TeamController::class, 'index'])->name('teams.index');
        Route::post('teams', [TeamController::class, 'store'])->name('teams.store');
        Route::patch('teams/{team}', [TeamController::class, 'update'])->name('teams.update');
        Route::post('team-memberships', [TeamMembershipController::class, 'store'])->name('team-memberships.store');
        Route::delete('team-memberships/{user}', [TeamMembershipController::class, 'destroy'])->name('team-memberships.destroy');
        Route::inertia('dealer-settings', 'module-status', ['module' => 'dealer-settings'])->name('dealer-settings.edit');
    });

    Route::inertia('notifications', 'module-status', [
        'module' => 'notifications',
    ])->name('notifications.index');
});

require __DIR__.'/settings.php';
