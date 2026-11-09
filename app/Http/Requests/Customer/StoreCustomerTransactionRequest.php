<?php

namespace App\Http\Requests\Customer;

use App\Services\TransactionMasters;
use App\Services\TransactionMetadata;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...TransactionMetadata::rules(),
            'vehicle_model' => ['nullable', 'string', 'max:255', TransactionMasters::vehicleRule((int) $this->user()?->dealer_id)],
            'expected_closing_month' => ['nullable', 'date_format:Y-m'],
            'estimated_value' => ['nullable', 'integer', 'min:0'],
            'source' => ['required', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
