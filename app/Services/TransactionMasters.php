<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\User;
use App\Support\AuditRecorder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

final class TransactionMasters
{
    public static function initialize(int $dealerId): void
    {
        foreach (['maybank' => 'MayBank', 'muf' => 'Mandiri Utama Finance', 'acc' => 'ACC', 'taf' => 'TAF', 'mtf' => 'Mandiri Tunas Finance', 'bca' => 'BCA Finance', 'niaga' => 'Niaga Finance', 'adira' => 'Adira Finance'] as $code => $name) {
            DB::table('leasing_companies')->insertOrIgnore(['dealer_id' => $dealerId, 'code' => $code, 'name' => $name]);
        }
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
            DB::table('leasing_companies')->where('id', $id)->update($validated);
            AuditRecorder::record($actor, 'dealer.leasing_updated', $actor, (array) $before, $validated, ['leasing_id' => $id]);
        });
    }

    private function lockDealer(User $actor): void
    {
        $dealerId = $actor->dealer_id;
        Dealer::query()->whereKey($dealerId)->lockForUpdate()->firstOrFail();
        $actor->refresh();
        abort_unless($actor->is_active && $actor->role === UserRole::Admin && $actor->dealer_id === $dealerId, 403);
    }
}
