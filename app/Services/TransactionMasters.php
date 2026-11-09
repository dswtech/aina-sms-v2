<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\User;
use App\Support\AuditRecorder;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class TransactionMasters
{
    public static function initialize(int $dealerId): void
    {
        foreach (['maybank' => 'MayBank', 'muf' => 'Mandiri Utama Finance', 'acc' => 'ACC', 'taf' => 'TAF', 'mtf' => 'Mandiri Tunas Finance', 'bca' => 'BCA Finance', 'niaga' => 'Niaga Finance', 'adira' => 'Adira Finance'] as $code => $name) {
            DB::table('leasing_companies')->insertOrIgnore(['dealer_id' => $dealerId, 'code' => $code, 'name' => $name]);
        }
    }

    /** Temporary dealer default (owner decision): all Kabupaten Bandung Barat districts. Admin edits it later. */
    public static function initializeFoa(int $dealerId): void
    {
        DB::statement(
            'INSERT INTO dealer_foa_districts (dealer_id, district_code) SELECT ?, code FROM area_districts WHERE region_code = ? ON CONFLICT DO NOTHING',
            [$dealerId, '32.17'],
        );
    }

    /** @param list<string> $districts */
    public function setFoa(User $actor, array $districts): void
    {
        DB::transaction(function () use ($actor, $districts): void {
            $this->lockDealer($actor);
            Validator::make(['districts' => $districts], ['districts' => ['array'], 'districts.*' => ['required', 'string', 'distinct', Rule::exists('area_districts', 'code')]])->validate();
            $before = DB::table('dealer_foa_districts')->where('dealer_id', $actor->dealer_id)->orderBy('district_code')->pluck('district_code')->all();
            DB::table('dealer_foa_districts')->where('dealer_id', $actor->dealer_id)->delete();
            foreach ($districts as $code) {
                DB::table('dealer_foa_districts')->insert(['dealer_id' => $actor->dealer_id, 'district_code' => $code]);
            }
            AuditRecorder::record($actor, 'dealer.foa_updated', $actor, ['districts' => $before], ['districts' => $districts]);
        });
    }

    /** @param array<string, mixed> $data */
    public function createLeasing(User $actor, array $data): void
    {
        DB::transaction(function () use ($actor, $data): void {
            $this->lockDealer($actor);
            $name = trim((string) Validator::make($data, ['name' => ['required', 'string', 'max:255']])->validate()['name']);
            $this->assertUniqueName($actor->dealer_id, $name);
            $code = Str::slug($name) ?: 'leasing';
            for ($i = 2; DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->where('code', $code)->exists(); $i++) {
                $code = Str::slug($name).'-'.$i;
            }
            $id = DB::table('leasing_companies')->insertGetId(['dealer_id' => $actor->dealer_id, 'code' => $code, 'name' => $name]);
            AuditRecorder::record($actor, 'dealer.leasing_created', $actor, [], ['name' => $name], ['leasing_id' => $id]);
        });
    }

    private function assertUniqueName(int $dealerId, string $name, ?int $exceptId = null): void
    {
        $exists = DB::table('leasing_companies')->where('dealer_id', $dealerId)->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => 'Nama leasing sudah ada.']);
        }
    }

    /** @param array<string, mixed> $data */
    public function updateLeasing(User $actor, int $id, array $data): void
    {
        DB::transaction(function () use ($actor, $id, $data): void {
            $this->lockDealer($actor);
            $validated = Validator::make($data, [
                'name' => ['sometimes', 'required', 'string', 'max:255'],
                'is_active' => ['sometimes', 'boolean'], 'is_monitored' => ['sometimes', 'boolean'],
            ])->validate();
            $before = DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->where('id', $id)->first();
            abort_if($before === null, 404);
            if (isset($validated['name'])) {
                $this->assertUniqueName($actor->dealer_id, trim($validated['name']), $id);
            }
            DB::table('leasing_companies')->where('id', $id)->update($validated);
            AuditRecorder::record($actor, 'dealer.leasing_updated', $actor, (array) $before, $validated, ['leasing_id' => $id]);
        });
    }

    /** Validation rule: the name must be an active model of an active type in this dealer's master. */
    public static function vehicleRule(int $dealerId): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($dealerId): void {
            $exists = DB::table('vehicle_models as m')->join('vehicle_types as t', 't.id', '=', 'm.vehicle_type_id')
                ->where('m.dealer_id', $dealerId)->where('m.name', $value)->where('m.is_active', true)->where('t.is_active', true)->exists();
            if (! $exists) {
                $fail('Model kendaraan harus dipilih dari master kendaraan yang aktif.');
            }
        };
    }

    /**
     * Active models grouped by active type, for the selectable list in lead and stage forms.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function vehicleOptions(int $dealerId): array
    {
        return DB::table('vehicle_models as m')->join('vehicle_types as t', 't.id', '=', 'm.vehicle_type_id')
            ->where('m.dealer_id', $dealerId)->where('m.is_active', true)->where('t.is_active', true)
            ->orderBy('t.name')->orderBy('m.name')->get(['t.name as type', 'm.name', 'm.price_min', 'm.price_max'])
            ->groupBy('type')
            ->map(fn ($rows, $type): array => ['type' => $type, 'models' => $rows->map(fn ($r): array => ['name' => $r->name, 'price_min' => $r->price_min, 'price_max' => $r->price_max])->all()])
            ->values()->all();
    }

    /** @param array<string, mixed> $data */
    public function createVehicleType(User $actor, array $data): void
    {
        DB::transaction(function () use ($actor, $data): void {
            $this->lockDealer($actor);
            $name = trim((string) Validator::make($data, ['name' => ['required', 'string', 'max:100']])->validate()['name']);
            $this->assertUniqueVehicleName('vehicle_types', $actor->dealer_id, $name, 'Jenis kendaraan sudah ada.');
            $id = DB::table('vehicle_types')->insertGetId(['dealer_id' => $actor->dealer_id, 'name' => $name]);
            AuditRecorder::record($actor, 'dealer.vehicle_type_created', $actor, [], ['name' => $name], ['vehicle_type_id' => $id]);
        });
    }

    /** @param array<string, mixed> $data */
    public function updateVehicleType(User $actor, int $id, array $data): void
    {
        DB::transaction(function () use ($actor, $id, $data): void {
            $this->lockDealer($actor);
            $validated = Validator::make($data, ['name' => ['sometimes', 'required', 'string', 'max:100'], 'is_active' => ['sometimes', 'boolean']])->validate();
            $before = DB::table('vehicle_types')->where('dealer_id', $actor->dealer_id)->where('id', $id)->first();
            abort_if($before === null, 404);
            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
                $this->assertUniqueVehicleName('vehicle_types', $actor->dealer_id, $validated['name'], 'Jenis kendaraan sudah ada.', $id);
            }
            DB::table('vehicle_types')->where('id', $id)->update($validated);
            AuditRecorder::record($actor, 'dealer.vehicle_type_updated', $actor, (array) $before, $validated, ['vehicle_type_id' => $id]);
        });
    }

    /** @param array<string, mixed> $data */
    public function createVehicleModel(User $actor, array $data): void
    {
        DB::transaction(function () use ($actor, $data): void {
            $this->lockDealer($actor);
            $validated = $this->validateVehicleModel($actor, $data, required: true);
            $validated['name'] = trim($validated['name']);
            $this->assertUniqueVehicleName('vehicle_models', $actor->dealer_id, $validated['name'], 'Model kendaraan sudah ada.');
            $row = [...$validated, 'dealer_id' => $actor->dealer_id, 'price_min' => $validated['price_min'] ?? null, 'price_max' => $validated['price_max'] ?? null];
            $id = DB::table('vehicle_models')->insertGetId($row);
            AuditRecorder::record($actor, 'dealer.vehicle_model_created', $actor, [], $validated, ['vehicle_model_id' => $id]);
        });
    }

    /** @param array<string, mixed> $data */
    public function updateVehicleModel(User $actor, int $id, array $data): void
    {
        DB::transaction(function () use ($actor, $id, $data): void {
            $this->lockDealer($actor);
            $before = DB::table('vehicle_models')->where('dealer_id', $actor->dealer_id)->where('id', $id)->first();
            abort_if($before === null, 404);
            $validated = $this->validateVehicleModel($actor, $data, required: false, current: (array) $before);
            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
                $this->assertUniqueVehicleName('vehicle_models', $actor->dealer_id, $validated['name'], 'Model kendaraan sudah ada.', $id);
            }
            DB::table('vehicle_models')->where('id', $id)->update($validated);
            AuditRecorder::record($actor, 'dealer.vehicle_model_updated', $actor, (array) $before, $validated, ['vehicle_model_id' => $id]);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>|null  $current
     * @return array<string, mixed>
     */
    private function validateVehicleModel(User $actor, array $data, bool $required, ?array $current = null): array
    {
        $presence = $required ? ['required'] : ['sometimes', 'required'];
        $validated = Validator::make($data, [
            'vehicle_type_id' => [...$presence, 'integer', Rule::exists('vehicle_types', 'id')->where('dealer_id', $actor->dealer_id)],
            'name' => [...$presence, 'string', 'max:255'],
            'price_min' => ['nullable', 'integer', 'min:0'],
            'price_max' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ])->validate();
        // The range is checked against the values that will be stored after this write.
        $min = array_key_exists('price_min', $validated) ? $validated['price_min'] : $current['price_min'] ?? null;
        $max = array_key_exists('price_max', $validated) ? $validated['price_max'] : $current['price_max'] ?? null;
        if ($min !== null && $max !== null && $max < $min) {
            throw ValidationException::withMessages(['price_max' => 'Harga maksimum tidak boleh lebih kecil dari harga minimum.']);
        }

        return $validated;
    }

    private function assertUniqueVehicleName(string $table, int $dealerId, string $name, string $message, ?int $exceptId = null): void
    {
        $exists = DB::table($table)->where('dealer_id', $dealerId)->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => $message]);
        }
    }

    private function lockDealer(User $actor): void
    {
        $dealerId = $actor->dealer_id;
        Dealer::query()->whereKey($dealerId)->lockForUpdate()->firstOrFail();
        $actor->refresh();
        abort_unless($actor->is_active && $actor->role === UserRole::Admin && $actor->dealer_id === $dealerId, 403);
    }
}
