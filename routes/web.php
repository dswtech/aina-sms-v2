<?php

use App\Http\Controllers\Admin\InvitationLifecycleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\InvitationController;
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
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::middleware('role:sales,supervisor,admin')->group(function () {
        Route::inertia('customers', 'module-status', [
            'module' => 'customers',
        ])->name('customers.index');
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
        Route::inertia('teams', 'module-status', ['module' => 'teams'])->name('teams.index');
        Route::inertia('dealer-settings', 'module-status', ['module' => 'dealer-settings'])->name('dealer-settings.edit');
    });

    Route::inertia('notifications', 'module-status', [
        'module' => 'notifications',
    ])->name('notifications.index');
});

require __DIR__.'/settings.php';
