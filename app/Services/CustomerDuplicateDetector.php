<?php

namespace App\Services;

use App\Models\Customer;
use App\Support\PhoneNormalizer;

class CustomerDuplicateResult
{
    public function __construct(
        public readonly bool $hasDuplicate,
        public readonly ?Customer $customer = null,
        public readonly ?string $message = null,
    ) {}
}

class CustomerDuplicateDetector
{
    public function check(int $dealerId, ?string $phone): CustomerDuplicateResult
    {
        $normalized = PhoneNormalizer::normalize($phone);
        if ($normalized === null) {
            return new CustomerDuplicateResult(false);
        }

        $existing = Customer::query()
            ->where('dealer_id', $dealerId)
            ->where('phone', $normalized)
            ->first();

        if ($existing !== null) {
            return new CustomerDuplicateResult(
                hasDuplicate: true,
                customer: $existing,
                message: "Nomor telepon {$normalized} sudah terdaftar atas nama {$existing->name}.",
            );
        }

        return new CustomerDuplicateResult(false);
    }
}
