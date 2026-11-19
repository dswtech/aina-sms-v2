<?php

use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('renders the stage achievement report for a supervisor', function () {
    $dealer = Dealer::factory()->create();
    $this->actingAs(User::factory()->supervisor()->create(['dealer_id' => $dealer->id]));

    $this->get('/analytics/stage-achievement?from=2026-11&to=2026-11')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('analytics/stage-achievement')
        ->where('report.from', '2026-11')
        ->where('report.to', '2026-11')
        ->has('report.rows')
        ->where('report.totals.lead', 0)
        ->where('report.stages', ['lead', 'prospect', 'hot_prospect', 'spk', 'do']));
});

it('forbids Sales from the stage achievement report', function () {
    $this->actingAs(User::factory()->sales()->create());

    $this->get('/analytics/stage-achievement?from=2026-11&to=2026-11')->assertForbidden();
});

it('rejects invalid and over-long stage achievement ranges', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->get('/analytics/stage-achievement?from=2025-01&to=2026-12')->assertSessionDoesntHaveErrors('to');
    $this->get('/analytics/stage-achievement?from=2025-01&to=2027-01')->assertSessionHasErrors('to');
    $this->get('/analytics/stage-achievement?from=2026-11&to=2026-10')->assertSessionHasErrors('to');
    $this->get('/analytics/stage-achievement?from=bad&to=2026-10')->assertSessionHasErrors('from');
});
