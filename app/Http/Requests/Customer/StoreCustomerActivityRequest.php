<?php

namespace App\Http\Requests\Customer;

use App\Enums\ActivityType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreCustomerActivityRequest extends FormRequest
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
            'deal_transaction_id' => ['nullable', 'integer', 'exists:deal_transactions,id'],
            'type' => ['required', new Enum(ActivityType::class)],
            'notes' => ['required', 'string', 'max:2000'],
            'occurred_at' => ['nullable', 'date'],
        ];
    }
}
