<?php

namespace App\Http\Requests\Customer;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Services\TransactionMasters;
use App\Services\TransactionMetadata;
use App\Support\PhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('create', Customer::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...TransactionMetadata::rules(),
            'existing_customer_id' => ['nullable', 'uuid'],
            'sales_id' => $this->user()?->role === UserRole::Sales
                ? ['prohibited']
                : ['nullable', 'integer', Rule::requiredIf(! $this->filled('existing_customer_id'))],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! PhoneNormalizer::isValid((string) $value)) {
                    $fail('Nomor telepon tidak valid.');
                }
            }],
            'email' => ['nullable', 'email', 'max:255'],
            ...Customer::profileRules(),
            'gender' => [Rule::requiredIf(! $this->filled('existing_customer_id')), 'nullable', Rule::in(['L', 'P'])],
            'vehicle_model' => ['nullable', 'string', 'max:255', TransactionMasters::vehicleRule((int) $this->user()?->dealer_id)],
            'expected_closing_month' => ['nullable', 'date_format:Y-m'],
            'estimated_value' => ['nullable', 'integer', 'min:0'],
            'source' => ['required', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'contact_channel_preference' => ['nullable', 'string', 'in:whatsapp,phone,any'],
            'opt_out' => ['sometimes', 'boolean'],
        ];
    }
}
