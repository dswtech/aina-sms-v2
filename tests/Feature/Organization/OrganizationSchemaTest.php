<?php

use Illuminate\Support\Facades\Schema;

it('stores dealers teams and historical team memberships', function () {
    expect(Schema::hasColumns('dealers', [
        'id',
        'public_id',
        'name',
        'timezone',
        'is_active',
    ]))->toBeTrue()
        ->and(Schema::hasColumns('teams', [
            'id',
            'public_id',
            'dealer_id',
            'name',
            'is_active',
        ]))->toBeTrue()
        ->and(Schema::hasColumns('team_memberships', [
            'id',
            'team_id',
            'user_id',
            'role',
            'assigned_by_id',
            'started_at',
            'ended_at',
        ]))->toBeTrue()
        ->and(Schema::hasColumn('users', 'dealer_id'))->toBeTrue();
});
