<?php

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;

function g10ExportDeal(Dealer $dealer, Team $team, User $sales, string $source, string $model, string $created, array $events): void
{
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'PRIVATE_CUSTOMER', 'notes' => 'PRIVATE_NOTES', 'address' => 'PRIVATE_ADDRESS']);
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'team_id' => $team->id, 'sales_id' => $sales->id,
        'customer_id' => $customer->id, 'vehicle_model' => $model, 'source' => $source,
        'current_stage' => 'lead', 'created_at' => $created,
    ]);
    $deal->forceFill(['created_at' => $created])->save();
    foreach ($events as [$stage, $at]) {
        $deal->stageHistories()->create([
            'to_stage' => $stage, 'actor_id' => $sales->id, 'created_at' => $at,
            'po_confirmed' => $stage === 'do', 'dp_confirmed' => $stage === 'do', 'unit_confirmed' => $stage === 'do',
        ]);
    }
    $deal->comments()->create(['user_id' => $sales->id, 'body' => 'PRIVATE_COACHING']);
}

function g10ParseCsv(string $csv): array
{
    $handle = fopen('php://temp', 'w+');
    fwrite($handle, str_starts_with($csv, "\xEF\xBB\xBF") ? substr($csv, 3) : $csv);
    rewind($handle);
    $rows = [];
    while (($row = fgetcsv($handle, separator: ';')) !== false) {
        $rows[] = $row;
    }
    fclose($handle);

    return $rows;
}

it('reconciles every exported cell against an independent Jakarta ledger', function (string $role, string $mode) {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $actor = User::factory()->role(UserRole::from($role))->create(['dealer_id' => $dealer->id]);
    TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $actor->id, 'role' => $actor->role, 'ended_at' => null]);
    g10ExportDeal($dealer, $team, $sales, 'walk_in', 'Model A', '2026-10-31 17:00:00', [['spk', '2026-11-01 00:00:00'], ['spk', '2026-11-02 00:00:00'], ['do', '2026-11-30 16:59:59'], ['delivery', '2026-11-30 17:00:00']]);
    g10ExportDeal($dealer, $team, $sales, 'walk_in', 'Model A', '2026-11-30 16:59:59', [['do', '2026-11-30 16:59:59']]);
    g10ExportDeal($dealer, $team, $sales, 'old', 'Model B', '2026-10-01 00:00:00', [['delivery', '2026-10-31 17:00:00']]);
    g10ExportDeal($dealer, $team, $sales, 'excluded_prior', 'Excluded prior', '2026-10-31 16:59:59', [['delivery', '2026-10-31 16:59:59']]);
    g10ExportDeal($dealer, $team, $sales, 'excluded_next', 'Excluded next', '2026-11-30 17:00:00', [['delivery', '2026-11-30 17:00:00']]);
    $other = Team::factory()->create(['dealer_id' => $dealer->id]);
    g10ExportDeal($dealer, $other, $sales, 'other_team', 'Model C', '2026-11-05 00:00:00', [['do', '2026-11-05 00:00:00'], ['delivery', '2026-11-05 00:00:00']]);
    $foreign = Dealer::factory()->create();
    g10ExportDeal($foreign, Team::factory()->create(['dealer_id' => $foreign->id]), User::factory()->sales()->create(['dealer_id' => $foreign->id]), 'FOREIGN', 'Foreign model', '2026-11-05 00:00:00', [['delivery', '2026-11-05 00:00:00']]);
    $supervisor = $role === 'supervisor';
    $achievement = $mode === 'achievement';
    $share = $achievement ? ($supervisor ? '66.7' : '50') : ($supervisor ? '100' : '66.7');
    $minorShare = $achievement ? ($supervisor ? '33.3' : '25') : '33.3';
    $expected = [
        ['Analisis Sumber'],
        ['Sumber', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery', 'Conversion (%)'],
        ['walk_in', '2', $share, '1', '2', $achievement ? '0' : '1', $achievement ? '' : '100'],
    ];
    if ($achievement) {
        $expected[] = ['old', '1', $minorShare, '0', '0', '1', ''];
    }
    if (! $supervisor) {
        $expected[] = ['other_team', '1', $minorShare, '0', '1', '1', $achievement ? '' : '100'];
    }
    array_push($expected, [null], ['Analisis Model'], ['Model', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery'], ['Model A', '2', $share, '1', '2', $achievement ? '0' : '1']);
    if ($achievement) {
        $expected[] = ['Model B', '1', $minorShare, '0', '0', '1'];
    }
    if (! $supervisor) {
        $expected[] = ['Model C', '1', $minorShare, '0', '1', '1'];
    }
    $response = $this->actingAs($actor)->get(route('analytics.csv', ['period' => '2026-11', 'mode' => $mode, 'dimension' => 'source', 'value' => 'walk_in']))
        ->assertOk()->assertDownload("analisis-2026-11-{$mode}.csv");
    $csv = $response->streamedContent();
    expect(g10ParseCsv($csv))->toBe($expected);
    foreach (['PRIVATE_CUSTOMER', 'PRIVATE_NOTES', 'PRIVATE_ADDRESS', 'PRIVATE_COACHING', 'FOREIGN', 'excluded_prior', 'excluded_next', $sales->name] as $private) {
        expect($csv)->not->toContain($private);
    }
})->with(['supervisor', 'admin', 'branch_manager'])->with(['acquisition', 'achievement']);

it('preserves CSV quoting while neutralizing spreadsheet formulas in category labels', function (string $label) {
    $dealer = Dealer::factory()->create();
    $actor = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    g10ExportDeal($dealer, Team::factory()->create(['dealer_id' => $dealer->id]), User::factory()->sales()->create(['dealer_id' => $dealer->id]), $label, $label, '2026-11-05 00:00:00', []);
    $response = $this->actingAs($actor)->get('/analytics/export.csv?period=2026-11&mode=acquisition')->assertOk();
    $rows = g10ParseCsv($response->streamedContent());
    $safe = preg_match('/^[\s]*[=+\-@]/u', $label) || preg_match('/^[\t\r\n]/', $label) ? "'".$label : $label;
    expect($rows[2][0])->toBe($safe)->and($rows[6][0])->toBe($safe);
})->with(['=1+1', '+1+1', '-1+1', '@SUM(1)', "\t=1+1", "\r=1+1", 'Model, "quoted"', "Model\nMultiline", '  =1+1', 'Normal Model']);

it('exports empty aggregate sections without contacts', function () {
    $admin = User::factory()->admin()->create(['dealer_id' => Dealer::factory()->create()->id]);
    $response = $this->actingAs($admin)->get('/analytics/export.csv?period=2026-11&mode=achievement')->assertOk();
    expect(g10ParseCsv($response->streamedContent()))->toBe([
        ['Analisis Sumber'], ['Sumber', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery', 'Conversion (%)'],
        [null], ['Analisis Model'], ['Model', 'Jumlah', 'Porsi (%)', 'SPK', 'DO', 'Delivery'],
    ]);
});

it('requires authentication and a reporting role to export analytics', function () {
    $url = route('analytics.csv');
    $this->get($url)->assertRedirect('/login');
    $sales = User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]);
    $this->actingAs($sales)->get($url)->assertForbidden();
});
