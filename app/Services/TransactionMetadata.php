<?php

namespace App\Services;

use App\Enums\InsuranceType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class TransactionMetadata
{
    public const TENORS = [12, 24, 36, 48, 60];

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
            'financing' => ['nullable', 'array:type,leasing_id,other_name,tenor_months,insurance_type'],
            'financing.type' => ['nullable', Rule::in(['cash', 'credit'])],
            'financing.leasing_id' => ['nullable'],
            'financing.other_name' => ['nullable', 'string', 'max:255'],
            'financing.tenor_months' => ['nullable', Rule::in(self::TENORS)],
            'financing.insurance_type' => ['nullable', Rule::enum(InsuranceType::class)],
        ];
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function normalize(array $data, int $dealerId, bool $requireArea = false, bool $requireActiveLeasing = true, bool $requireCreditDetails = true): array
    {
        Validator::make($data, self::rules())->validate();
        $channel = $data['source'] === 'digital_ad' ? ($data['source_channel'] ?? null) : null;
        if ($data['source'] === 'digital_ad' && ! in_array($channel, ['facebook', 'instagram', 'tiktok', 'website', 'other'], true)) {
            throw ValidationException::withMessages(['source_channel' => 'Pilih kanal Digital Ad.']);
        }
        ['region_code' => $region, 'district_code' => $district, 'other_city' => $city] = self::normalizeArea($data['area'] ?? [], $requireArea);
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

        $tenor = $type === 'credit' ? ($financing['tenor_months'] ?? null) : null;
        $insurance = $type === 'credit' ? ($financing['insurance_type'] ?? null) : null;
        if ($type === 'credit' && $requireCreditDetails) {
            $tenor ?? throw ValidationException::withMessages(['financing.tenor_months' => 'Pilih tenor kredit.']);
            $insurance ?? throw ValidationException::withMessages(['financing.insurance_type' => 'Pilih jenis asuransi.']);
        }

        return ['source_channel' => $channel, 'region_code' => $region, 'district_code' => $district, 'other_city' => $city,
            'financing_type' => $type, 'leasing_id' => $leasingId, 'financing_other_name' => $otherName,
            'tenor_months' => $tenor !== null ? (int) $tenor : null, 'insurance_type' => $insurance];
    }

    /**
     * @param  array<string, mixed>  $area
     * @return array{region_code: ?string, district_code: ?string, other_city: ?string}
     */
    public static function normalizeArea(array $area, bool $require = false, string $field = 'area'): array
    {
        $region = $area['region_code'] ?? null;
        $district = $area['district_code'] ?? null;
        $city = $area['other_city'] ?? null;
        if ($region === 'other') {
            if (! is_string($city) || trim($city) === '') {
                throw ValidationException::withMessages(["$field.other_city" => 'Isi nama Kota Lain.']);
            }
            $district = null;
            $city = trim($city);
        } elseif ($region !== null || $district !== null || $city !== null || $require) {
            if (! DB::table('area_regions')->where('code', $region)->exists()) {
                throw ValidationException::withMessages(["$field.region_code" => 'Pilih kabupaten/kota.']);
            }
            if (! DB::table('area_districts')->where('code', $district)->where('region_code', $region)->exists()) {
                throw ValidationException::withMessages(["$field.district_code" => 'Pilih kecamatan yang sesuai kabupaten/kota.']);
            }
            $city = null;
        }

        return ['region_code' => $region, 'district_code' => $district, 'other_city' => $city];
    }
}
