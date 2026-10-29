<?php

use Illuminate\Support\Facades\Route;

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
        Route::inertia('users', 'module-status', ['module' => 'users'])->name('users.index');
        Route::inertia('teams', 'module-status', ['module' => 'teams'])->name('teams.index');
        Route::inertia('dealer-settings', 'module-status', ['module' => 'dealer-settings'])->name('dealer-settings.edit');
    });

    Route::inertia('notifications', 'module-status', [
        'module' => 'notifications',
    ])->name('notifications.index');
});

require __DIR__.'/settings.php';
