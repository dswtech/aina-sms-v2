<?php

use App\Http\Controllers\Admin\InvitationLifecycleController;
use App\Http\Controllers\Admin\TeamController;
use App\Http\Controllers\Admin\TeamMembershipController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\ClosingMonthController;
use App\Http\Controllers\Customer\CustomerController;
use App\Http\Controllers\Customer\CustomerHistoryController;
use App\Http\Controllers\Customer\DealCommentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DealerSettingsController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TargetController;
use App\Http\Controllers\TargetPlanController;
use App\Http\Controllers\TransactionController;
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
    Route::post('transactions/{transaction}/cancel-do', [CustomerController::class, 'cancelDo'])
        ->middleware('role:admin')->name('transactions.cancel-do');

    Route::middleware('role:sales,supervisor,admin')->group(function () {
        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::get('customers/{customer}/history', CustomerHistoryController::class)->name('customers.history');
        Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
        Route::post('customers/{customer}/activities', [CustomerController::class, 'storeActivity'])->name('customers.activities.store');
        Route::post('customers/{customer}/follow-ups', [CustomerController::class, 'storeFollowUp'])->name('customers.follow-ups.store');
        Route::post('customers/{customer}/transactions', [CustomerController::class, 'storeTransaction'])->name('customers.transactions.store');
        Route::patch('customers/{customer}/assignment', [CustomerController::class, 'reassign'])->name('customers.reassign');
        Route::patch('customers/{customer}/contact-preferences', [CustomerController::class, 'updateContactPreferences'])->name('customers.contact-preferences.update');
        Route::patch('transactions/{transaction}/stage', [CustomerController::class, 'updateStage'])->name('transactions.stage');
        Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
        Route::post('transactions/{transaction}/comments', [DealCommentController::class, 'store'])->name('deals.comments.store');
        Route::patch('comments/{comment}', [DealCommentController::class, 'update'])->name('comments.update');

        Route::patch('transactions/{transaction}/closing-month', [ClosingMonthController::class, 'update'])->name('transactions.closing-month');
        Route::patch('transactions/{transaction}', [TransactionController::class, 'update'])->name('transactions.update');
        Route::get('transactions', [TransactionController::class, 'index'])->name('transactions.index');
        Route::get('transactions/export.csv', [TransactionController::class, 'export'])->name('transactions.export');
        Route::get('transactions/create', [TransactionController::class, 'create'])->name('transactions.create');
        Route::post('transactions', [TransactionController::class, 'store'])->name('transactions.store');
        Route::get('transactions/customer-search', [TransactionController::class, 'customerSearch'])->name('transactions.customer-search');
        Route::get('transactions/{transaction}', [TransactionController::class, 'show'])->name('transactions.show');
        Route::get('transactions/{transaction}/coaching', [DealCommentController::class, 'index'])->name('transactions.coaching');
    });

    Route::get('targets', [DashboardController::class, 'targets'])
        ->middleware('role:supervisor,admin')
        ->name('targets.index');

    Route::post('team-targets', [TargetController::class, 'storeTeam'])->middleware(['role:supervisor,admin', 'throttle:20,1'])->name('team-targets.store');

    Route::post('targets', [TargetController::class, 'store'])
        ->middleware(['role:supervisor,admin', 'throttle:20,1'])
        ->name('targets.store');

    Route::post('target-plans', [TargetPlanController::class, 'store'])
        ->middleware(['role:supervisor,admin', 'throttle:20,1'])->name('target-plans.store');

    Route::get('team-performance', [DashboardController::class, 'teams'])
        ->middleware('role:branch_manager')
        ->name('team-performance.index');

    Route::middleware('role:supervisor,branch_manager,admin')->group(function () {
        Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
        Route::get('analytics/export.csv', [AnalyticsController::class, 'csv'])->name('analytics.csv');
        Route::get('analytics/financing', [ReportController::class, 'financing'])->name('analytics.financing');
        Route::get('analytics/mapping-area', [ReportController::class, 'mappingArea'])->name('analytics.mapping-area');
    });

    Route::middleware('role:supervisor,admin')->group(function () {
        Route::get('imports', [ImportController::class, 'index'])->name('imports.index');
        Route::get('imports/template', [ImportController::class, 'template'])->name('imports.template');
        Route::post('imports/preview', [ImportController::class, 'preview'])->middleware('throttle:10,1')->name('imports.preview');
        Route::post('imports/{batch}/commit', [ImportController::class, 'commit'])->middleware('throttle:10,1')->name('imports.commit');
    });

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
        Route::get('dealer-settings', [DealerSettingsController::class, 'edit'])->name('dealer-settings.edit');
        Route::patch('dealer-settings/area-foa', [DealerSettingsController::class, 'updateFoa'])->name('dealer-settings.area-foa');
        Route::post('dealer-settings/leasing', [DealerSettingsController::class, 'storeLeasing'])->name('dealer-settings.leasing.store');
        Route::patch('dealer-settings/leasing/{leasing}', [DealerSettingsController::class, 'updateLeasing'])->whereNumber('leasing')->name('dealer-settings.leasing.update');
        Route::post('dealer-settings/vehicle-types', [DealerSettingsController::class, 'storeVehicleType'])->name('dealer-settings.vehicle-types.store');
        Route::patch('dealer-settings/vehicle-types/{type}', [DealerSettingsController::class, 'updateVehicleType'])->whereNumber('type')->name('dealer-settings.vehicle-types.update');
        Route::post('dealer-settings/vehicle-models', [DealerSettingsController::class, 'storeVehicleModel'])->name('dealer-settings.vehicle-models.store');
        Route::patch('dealer-settings/vehicle-models/{model}', [DealerSettingsController::class, 'updateVehicleModel'])->whereNumber('model')->name('dealer-settings.vehicle-models.update');
    });

    Route::inertia('notifications', 'module-status', [
        'module' => 'notifications',
    ])->name('notifications.index');
});

require __DIR__.'/settings.php';
