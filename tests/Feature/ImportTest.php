<?php

use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('previews and imports valid csv rows', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'sales.one']);

    $csv = "name,phone,email,address,vehicle_model,estimated_value,source,notes,contact_channel_preference,sales_username\n"
        ."Budi,081234567890,budi@example.com,Jakarta,Creta,300000000,walk_in,lead,whatsapp,sales.one\n"
        ."Bad,,Jakarta,Ioniq,100,walk_in,,any,sales.one\n";

    $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

    $this->actingAs($admin)
        ->post(route('imports.preview'), ['file' => $file])
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('imports/index')
            ->where('preview.accepted_count', 1)
            ->where('preview.rejected_count', 1)
        );

    $batch = CsvImportBatch::query()->firstOrFail();
    $this->actingAs($admin)
        ->post(route('imports.commit', $batch))
        ->assertRedirect(route('imports.index'));

    expect(Customer::count())->toBe(1)
        ->and(DealTransaction::count())->toBe(1);
});

it('rejects sales outside supervisor team', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $otherSales = User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'other.sales']);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'started_at' => now()]);

    $csv = "name,phone,vehicle_model,source,sales_username\n"
        ."Budi,081234567890,Creta,walk_in,other.sales\n";

    $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

    $this->actingAs($supervisor)
        ->post(route('imports.preview'), ['file' => $file])
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('preview.rejected_count', 1)
        );
});

it('downloads csv template', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)
        ->get(route('imports.template'))
        ->assertOk();
});
