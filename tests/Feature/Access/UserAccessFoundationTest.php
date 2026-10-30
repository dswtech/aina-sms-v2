<?php

use Illuminate\Support\Facades\Schema;

it('stores a username role and active status for every user', function () {
    expect(Schema::hasColumns('users', ['public_id', 'username', 'role', 'is_active', 'supervisor_id']))->toBeTrue();
});
