<?php

use App\Models\CsvImportBatch;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    $this->dealer = Dealer::factory()->create();
    $this->actor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id, 'username' => 'csv.sales']);
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->actor, $this->sales] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role, 'ended_at' => null]);
    }
});

function g10Csv(array $changes = [], bool $second = false): UploadedFile
{
    $row = array_replace([
        'name' => 'CSV Customer', 'phone' => '081234567890', 'email' => 'csv@example.test',
        'address' => 'Private address', 'vehicle_model' => 'Model', 'estimated_value' => '100000',
        'source' => 'walk_in', 'notes' => 'Private note', 'contact_channel_preference' => 'whatsapp',
        'sales_username' => 'csv.sales',
    ], $changes);
    $stream = fopen('php://temp', 'w+');
    fputcsv($stream, array_keys($row));
    if ($second) {
        fputcsv($stream, array_values(array_replace($row, ['name' => 'First row', 'phone' => '081234567891', 'sales_username' => 'csv.first'])));
    }
    fputcsv($stream, array_values($row));
    rewind($stream);
    $csv = stream_get_contents($stream);
    fclose($stream);

    return UploadedFile::fake()->createWithContent('g10.csv', $csv);
}

function g10NoImportWrites(): void
{
    test()->assertDatabaseCount('customers', 0);
    test()->assertDatabaseCount('customer_assignments', 0);
    test()->assertDatabaseCount('deal_transactions', 0);
}

it('imports to the supervisors active team and rejects replay with the old session', function () {
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv(['sales_username' => ' csv.sales '])])->assertOk();
    g10NoImportWrites();
    $batch = CsvImportBatch::query()->sole();
    $preview = session('import_preview');
    Storage::disk('local')->assertExists($batch->file_path);
    $this->post(route('imports.commit', $batch))->assertRedirect(route('imports.index'))->assertSessionMissing('import_preview');
    $this->assertDatabaseHas('deal_transactions', ['sales_id' => $this->sales->id, 'team_id' => $this->team->id, 'current_stage' => 'lead']);
    $this->assertDatabaseHas('customers', ['phone' => '+6281234567890', 'created_by_id' => $this->actor->id]);
    expect($batch->fresh()->status)->toBe('completed')->and($batch->fresh()->completed_at)->not->toBeNull();
    $this->get(route('imports.index'))->assertInertia(fn (Assert $page) => $page
        ->where('flash.success', '1 baris berhasil diimport.')->where('preview', null));
    $this->withSession(['import_preview' => $preview])->post(route('imports.commit', $batch))->assertUnprocessable();
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('customer_assignments', 1);
    $this->assertDatabaseCount('deal_transactions', 1);
});

it('rejects commit without the correct actor dealer or session', function (string $case, int $status) {
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv()])->assertOk();
    $batch = CsvImportBatch::query()->sole();
    if ($case === 'actor' || $case === 'dealer') {
        $other = User::factory()->admin()->create(['dealer_id' => $case === 'actor' ? $this->dealer->id : Dealer::factory()->create()->id]);
        $this->actingAs($other);
    } elseif ($case === 'missing') {
        session()->forget('import_preview');
    } else {
        session()->put('import_preview.batch_id', $batch->id + 1);
    }
    $this->post(route('imports.commit', $batch))->assertStatus($status);
    g10NoImportWrites();
    expect($batch->fresh()->status)->toBe('preview');
})->with(['actor' => ['actor', 403], 'dealer' => ['dealer', 403], 'missing' => ['missing', 422], 'mismatch' => ['mismatch', 422]]);

it('does not expose another actors session preview or batch filenames to a supervisor', function () {
    $admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($admin)->post(route('imports.preview'), ['file' => g10Csv()])->assertOk();
    $this->actingAs($this->actor)->get(route('imports.index'))->assertInertia(fn (Assert $p) => $p
        ->where('preview', null)->has('batches', 0));
    expect(session()->has('import_preview'))->toBeFalse();
});

it('keeps uploaded CSV private and omits internal paths from props', function () {
    $response = $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv()])->assertOk();
    $batch = CsvImportBatch::query()->sole();
    $response->assertInertia(fn (Assert $p) => $p->missing('batches.0.file_path')->missing('preview.file_path'));
    $this->get('/storage/'.$batch->file_path)->assertForbidden();
    $this->get('/storage/private/'.$batch->file_path)->assertForbidden();
    g10NoImportWrites();
});

it('revalidates changed import authorization and rolls back earlier rows', function (string $change) {
    $first = User::factory()->sales()->create(['dealer_id' => $this->dealer->id, 'username' => 'csv.first']);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $first->id, 'role' => 'sales', 'ended_at' => null]);
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv(second: true)])->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 2));
    $batch = CsvImportBatch::query()->sole();
    match ($change) {
        'inactive_sales' => $this->sales->update(['is_active' => false]),
        'ended_membership' => $this->sales->activeTeamMemberships()->update(['ended_at' => now()]),
        'inactive_team' => $this->team->update(['is_active' => false]),
        'wrong_sales_role' => $this->sales->activeTeamMemberships()->update(['role' => 'supervisor']),
        'wrong_actor_role' => $this->actor->activeTeamMemberships()->update(['role' => 'sales']),
    };
    $this->from('/imports')->post(route('imports.commit', $batch))->assertRedirect('/imports')->assertSessionHasErrors('import')->assertSessionHas('import_preview');
    g10NoImportWrites();
    expect($batch->fresh()->status)->toBe('preview')->and($batch->fresh()->completed_at)->toBeNull();
})->with(['inactive_sales', 'ended_membership', 'inactive_team', 'wrong_sales_role', 'wrong_actor_role']);

it('rejects invalid field details before commit', function (array $changes) {
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv($changes)])->assertInertia(fn (Assert $p) => $p
        ->where('preview.accepted_count', 0)->where('preview.rejected_count', 1)
        ->where('preview.rows.0.row_number', 2)->where('preview.rows.0.valid', false)
        ->where('preview.rows.0.errors', fn ($errors) => count($errors) > 0));
    g10NoImportWrites();
})->with([
    'long name' => [['name' => str_repeat('n', 256)]],
    'long model' => [['vehicle_model' => str_repeat('m', 256)]],
    'long email' => [['email' => str_repeat('a', 245).'@example.test']],
    'long address' => [['address' => str_repeat('a', 1001)]],
    'long notes' => [['notes' => str_repeat('n', 2001)]],
    'fraction' => [['estimated_value' => '1.5']],
    'scientific' => [['estimated_value' => '1e3']],
    'overflow' => [['estimated_value' => '999999999999999999999999']],
    'negative' => [['estimated_value' => '-1']],
    'bad phone' => [['phone' => 'abc']],
    'bad source' => [['source' => str_repeat('s', 65)]],
    'bad preference' => [['contact_channel_preference' => 'fax']],
]);

it('lets corrected invalid rows be uploaded again without duplicating the valid import', function () {
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => g10Csv(['phone' => 'bad'])])->assertOk();
    $bad = CsvImportBatch::query()->sole();
    $this->post(route('imports.preview'), ['file' => g10Csv()])->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1));
    $good = CsvImportBatch::query()->latest('id')->firstOrFail();
    $this->post(route('imports.commit', $bad))->assertUnprocessable();
    $this->post(route('imports.commit', $good))->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('customers', 1);
    expect($bad->fresh()->status)->toBe('preview')->and($good->fresh()->status)->toBe('completed');
});

it('blocks import routes for unauthorized roles', function (string $role) {
    $actor = $role === 'guest' ? null : User::factory()->create(['dealer_id' => $this->dealer->id, 'role' => $role]);
    if ($actor) {
        $this->actingAs($actor);
    }
    foreach (['/imports', '/imports/template'] as $url) {
        $response = $this->get($url);
        $role === 'guest' ? $response->assertRedirect('/login') : $response->assertForbidden();
    }
    $response = $this->post('/imports/preview', ['file' => g10Csv()]);
    $role === 'guest' ? $response->assertRedirect('/login') : $response->assertForbidden();
    g10NoImportWrites();
    $this->assertDatabaseCount('csv_import_batches', 0);
})->with(['guest', 'sales', 'branch_manager']);

it('validates the complete template and imports its example after choosing a real Sales', function () {
    $response = $this->actingAs($this->actor)->get(route('imports.template'))->assertOk()->assertDownload('template-import-lead.csv');
    $rows = array_map('str_getcsv', explode("\n", trim($response->streamedContent())));
    expect($rows[0])->toBe(['name', 'phone', 'email', 'address', 'vehicle_model', 'estimated_value', 'source', 'notes', 'contact_channel_preference', 'sales_username', 'social_media_account', 'source_channel', 'region_code', 'district_code', 'other_city', 'financing_type', 'leasing_id', 'financing_other_name']);
    expect($rows[1])->toHaveCount(18)->and($rows[1][6])->toBe('walk_in')->and($rows[1][8])->toBe('whatsapp');
    $csv = str_replace(',sales_username,@budi', ',csv.sales,@budi', $response->streamedContent());
    $this->post(route('imports.preview'), ['file' => UploadedFile::fake()->createWithContent('template.csv', $csv)])
        ->assertInertia(fn (Assert $p) => $p->where('preview.accepted_count', 1)->where('preview.rejected_count', 0));
    g10NoImportWrites();
    $this->post(route('imports.commit', CsvImportBatch::query()->sole()))->assertRedirect()->assertSessionHasNoErrors();
    $this->assertDatabaseCount('customers', 1);
});

it('reports malformed CSV records instead of discarding extra cells', function () {
    $csv = "name,phone,vehicle_model,source,sales_username\nName,081234567890,Model,walk_in,csv.sales,unexpected\n";
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => UploadedFile::fake()->createWithContent('malformed.csv', $csv)])
        ->assertInertia(fn (Assert $p) => $p->where('preview.rows.0.valid', false)->where('preview.rows.0.row_number', 2)
            ->where('preview.rows.0.errors', fn ($errors) => count($errors) > 0));
    g10NoImportWrites();
});

it('rejects a CSV missing its required headers without creating a batch', function () {
    $this->actingAs($this->actor)->post(route('imports.preview'), ['file' => UploadedFile::fake()->createWithContent('bad.csv', "name,phone\nName,081234567890\n")])->assertUnprocessable();
    $this->assertDatabaseCount('csv_import_batches', 0);
    g10NoImportWrites();
});
