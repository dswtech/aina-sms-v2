<?php

namespace App\Http\Requests\Customer;

use App\Models\Customer;
use App\Support\PhoneNormalizer;
use Illuminate\Foundation\Http\FormRequest;

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
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! PhoneNormalizer::isValid((string) $value)) {
                    $fail('Nomor telepon tidak valid.');
                }
            }],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'vehicle_model' => ['required', 'string', 'max:255'],
            'estimated_value' => ['nullable', 'integer', 'min:0'],
            'source' => ['required', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'contact_channel_preference' => ['nullable', 'string', 'in:whatsapp,phone,any'],
        ];
    }
}
