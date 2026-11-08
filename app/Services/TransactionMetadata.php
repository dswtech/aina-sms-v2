<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class TransactionMetadata
{
    /** @return array<string, mixed> */
    public static function rules(): array
    {
        return [
            'social_media_account' => ['nullable', 'string', 'max:255'],
            'source_channel' => ['nullable', 'string', 'max:32'],
            'area' => ['nullable', 'array:region_code,district_code,other_city'],
            'area.region_code' => ['nullable', 'string', 'max:16'],
            'area.district_code' => ['nullable', 'string', 'max:16'],
            'area.other_city' => ['nullable', 'string', 'max:255'],
            'financing' => ['nullable', 'array:type,leasing_id,other_name'],
            'financing.type' => ['nullable', Rule::in(['cash', 'credit'])],
            'financing.leasing_id' => ['nullable'],
            'financing.other_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function normalize(array $data, int $dealerId, bool $requireArea = false, bool $requireActiveLeasing = true): array
    {
        Validator::make($data, self::rules())->validate();
        $channel = $data['source'] === 'digital_ad' ? ($data['source_channel'] ?? null) : null;
        if ($data['source'] === 'digital_ad' && ! in_array($channel, ['facebook', 'instagram', 'tiktok', 'website', 'other'], true)) {
            throw ValidationException::withMessages(['source_channel' => 'Pilih kanal Digital Ad.']);
        }
        $area = $data['area'] ?? [];
        $region = $area['region_code'] ?? null;
        $district = $area['district_code'] ?? null;
        $city = $area['other_city'] ?? null;
        if ($region === 'other') {
            if (! is_string($city) || trim($city) === '') {
                throw ValidationException::withMessages(['area.other_city' => 'Isi nama Kota Lain.']);
            }
            $district = null;
            $city = trim($city);
        } elseif ($region !== null || $district !== null || $city !== null || $requireArea) {
            if (! DB::table('area_regions')->where('code', $region)->exists()) {
                throw ValidationException::withMessages(['area.region_code' => 'Pilih kabupaten/kota transaksi.']);
            }
            if (! DB::table('area_districts')->where('code', $district)->where('region_code', $region)->exists()) {
                throw ValidationException::withMessages(['area.district_code' => 'Pilih kecamatan yang sesuai kabupaten/kota.']);
            }
            $city = null;
        }
        $financing = $data['financing'] ?? [];
        $type = $financing['type'] ?? null;
        $leasingId = $type === 'credit' ? ($financing['leasing_id'] ?? null) : null;
        $otherName = null;
        if ($leasingId === 'other') {
            $otherName = trim((string) ($financing['other_name'] ?? ''));
            if ($otherName === '') {
                throw ValidationException::withMessages(['financing.other_name' => 'Isi nama leasing Kredit Lain.']);
            }
            $leasingId = null;
        } elseif ($leasingId !== null) {
            if (! (is_int($leasingId) || (is_string($leasingId) && ctype_digit($leasingId))) || ! DB::table('leasing_companies')->where('id', $leasingId)->where('dealer_id', $dealerId)->when($requireActiveLeasing, fn ($query) => $query->where('is_active', true))->exists()) {
                throw ValidationException::withMessages(['financing.leasing_id' => 'Pilih leasing aktif milik dealer.']);
            }
            $leasingId = (int) $leasingId;
        }

        return ['source_channel' => $channel, 'region_code' => $region, 'district_code' => $district, 'other_city' => $city,
            'financing_type' => $type, 'leasing_id' => $leasingId, 'financing_other_name' => $otherName];
    }
}
