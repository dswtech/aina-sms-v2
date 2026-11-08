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

it('marks repeated normalized phone numbers in the CSV before commit', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.sales']);
    $file = UploadedFile::fake()->createWithContent('duplicates.csv', "name,phone,vehicle_model,source,sales_username\nFirst,081234567890,Model,walk_in,csv.sales\nSecond,+6281234567890,Model,walk_in,csv.sales\n");
    $this->actingAs($admin)->post('/imports/preview', ['file' => $file])->assertInertia(fn (Assert $p) => $p
        ->where('preview.accepted_count', 1)->where('preview.rejected_count', 1)
        ->where('preview.rows.0.valid', true)->where('preview.rows.1.valid', false));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('deal_transactions', 1);
});

it('rechecks duplicates at import commit and rolls back the whole pending batch', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.sales']);
    $file = UploadedFile::fake()->createWithContent('stale.csv', "name,phone,vehicle_model,source,sales_username\nFirst,081234567890,Model,walk_in,csv.sales\nSecond,081234567891,Model,walk_in,csv.sales\n");
    $this->actingAs($admin)->post('/imports/preview', ['file' => $file])->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 2));
    Customer::factory()->create(['dealer_id' => $dealer->id, 'phone' => '+6281234567891']);
    $batch = CsvImportBatch::query()->sole();
    $this->from('/imports')->post(route('imports.commit', $batch))->assertRedirect('/imports')->assertSessionHasErrors('import');
    expect($batch->fresh()->status)->toBe('preview');
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('customer_assignments', 0);
    $this->assertDatabaseCount('deal_transactions', 0);
});

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

it('imports metadata through the shared lead service and creates initial history', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.core']);
    $csv = "name,phone,vehicle_model,source,sales_username,source_channel,social_media_account,region_code,district_code,notes\n"
        ."Budi,081234567890,Avanza,digital_ad,csv.core,instagram,@budi,32.17,32.17.08,Catatan transaksi\n";
    $this->actingAs($admin)->post('/imports/preview', ['file' => UploadedFile::fake()->createWithContent('foundation.csv', $csv)])
        ->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();
    $customer = Customer::query()->sole();
    $deal = DealTransaction::query()->sole();
    expect($customer->social_media_account)->toBe('@budi')->and($customer->notes)->toBeNull()
        ->and($deal->notes)->toBe('Catatan transaksi')->and($deal->district_code)->toBe('32.17.08')
        ->and($deal->stageHistories()->sole()->to_stage->value)->toBe('lead');
});

it('rejects digital imports without channel in preview', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.core']);
    $csv = "name,phone,vehicle_model,source,sales_username\nBudi,081234567890,Avanza,digital_ad,csv.core\n";
    $this->actingAs($admin)->post('/imports/preview', ['file' => UploadedFile::fake()->createWithContent('digital.csv', $csv)])
        ->assertInertia(fn (Assert $p) => $p->where('preview.rejected_count', 1));
});
