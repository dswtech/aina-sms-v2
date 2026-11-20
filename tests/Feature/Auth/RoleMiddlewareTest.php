<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware(['web', 'auth', 'role:supervisor,admin'])->get('/_test/role-ok', fn () => 'ok');
    Route::middleware(['web', 'auth', 'role:branchmanager'])->get('/_test/role-typo', fn () => 'ok');
});

it('lets a listed role through and forbids the others', function () {
    $this->actingAs(User::factory()->admin()->create())->get('/_test/role-ok')->assertOk();
    $this->actingAs(User::factory()->create())->get('/_test/role-ok')->assertForbidden();
});

it('fails loudly on a role name that is not a UserRole', function () {
    $this->withoutExceptionHandling();

    $this->actingAs(User::factory()->admin()->create())->get('/_test/role-typo');
})->throws(ValueError::class);
