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

function importPreview($test, User $admin, string $csv)
{
    return $test->actingAs($admin)->post('/imports/preview', ['file' => UploadedFile::fake()->createWithContent('x.csv', $csv)]);
}

function importAdmin(): User
{
    $dealer = Dealer::factory()->create();
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.core']);

    return User::factory()->admin()->create(['dealer_id' => $dealer->id]);
}

it('keeps old templates working and exposes new columns in the template', function () {
    $admin = importAdmin();
    $body = $this->actingAs($admin)->get(route('imports.template'))->streamedContent();
    foreach (['social_media_account', 'source_channel', 'region_code', 'district_code', 'other_city', 'financing_type', 'leasing_id', 'financing_other_name'] as $column) {
        expect($body)->toContain($column);
    }
    importPreview($this, $admin, "name,phone,vehicle_model,source,sales_username\nBudi,081234567890,Avanza,walk_in,csv.core\n")
        ->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1));
});

it('resolves area and leasing by exact name and imports them', function () {
    $admin = importAdmin();
    $leasing = DB::table('leasing_companies')->where('dealer_id', $admin->dealer_id)->where('code', 'acc')->first();
    $region = DB::table('area_regions')->where('code', '32.17')->value('name');
    $district = DB::table('area_districts')->where('code', '32.17.08')->value('name');
    $csv = "name,phone,vehicle_model,source,sales_username,region_code,district_code,financing_type,leasing_id\n"
        ."Budi,081234567890,Avanza,walk_in,csv.core,{$region},{$district},credit,{$leasing->name}\n"
        ."Sari,081234567891,Avanza,walk_in,csv.core,32.17,32.17.08,credit,{$leasing->id}\n";
    importPreview($this, $admin, $csv)->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 2));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();
    foreach (DealTransaction::query()->get() as $deal) {
        expect($deal->district_code)->toBe('32.17.08')->and($deal->region_code)->toBe('32.17')
            ->and($deal->leasing_id)->toBe($leasing->id)->and($deal->financing_type)->toBe('credit');
    }
});

it('imports Kota Lain and other leasing', function () {
    $admin = importAdmin();
    $csv = "name,phone,vehicle_model,source,sales_username,region_code,other_city,financing_type,leasing_id,financing_other_name\n"
        ."Budi,081234567890,Avanza,walk_in,csv.core,other,Garut,credit,other,Leasing X\n";
    importPreview($this, $admin, $csv)->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();
    $deal = DealTransaction::query()->sole();
    expect($deal->other_city)->toBe('Garut')->and($deal->district_code)->toBeNull()->and($deal->financing_other_name)->toBe('Leasing X');
});

it('gives clear per row errors without blocking valid rows', function () {
    $admin = importAdmin();
    $csv = "name,phone,vehicle_model,source,sales_username,source_channel,region_code,district_code,financing_type,leasing_id,social_media_account\n"
        ."A,081234567890,Avanza,walk_in,csv.core,instagram,,,,,\n"          // channel on non-digital
        ."B,081234567891,Avanza,walk_in,csv.core,,32.17,,,,\n"               // partial area
        ."C,081234567892,Avanza,walk_in,csv.core,,,,credit,Tidak Ada,\n"     // unknown leasing
        ."D,081234567893,Avanza,digital_ad,csv.core,youtube,,,,,\n"          // bad channel
        .'E,081234567894,Avanza,walk_in,csv.core,,,,,,'.str_repeat('x', 256)."\n"
        ."F,081234567895,Avanza,digital_ad,csv.core,tiktok,,,cash,,@f\n";
    importPreview($this, $admin, $csv)->assertInertia(fn (Assert $p) => $p
        ->where('preview.accepted_count', 2)->where('preview.rejected_count', 4)
        ->where('preview.rows.0.valid', true)
        ->where('preview.rows.3.errors.0', fn ($e) => str_contains(strtolower($e), 'kanal'))
        ->where('preview.rows.5.valid', true));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();
    $this->assertDatabaseCount('deal_transactions', 2);
    // A channel on a non-digital source is cleared, exactly like the manual form.
    expect(DealTransaction::query()->whereRelation('customer', 'name', 'A')->sole()->source_channel)->toBeNull();
});

it('keeps a Kredit Lain name when the CSV leaves the leasing id empty', function () {
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'csv.sales']);
    $csv = "name,phone,vehicle_model,source,sales_username,financing_type,financing_other_name\nZeta,081234567890,Model,walk_in,csv.sales,credit,Zeta Finance\n";
    $this->actingAs($admin)->post('/imports/preview', ['file' => UploadedFile::fake()->createWithContent('other.csv', $csv)])
        ->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1));
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertSessionHasNoErrors();

    expect(DealTransaction::query()->sole()->financing_other_name)->toBe('Zeta Finance');
});
