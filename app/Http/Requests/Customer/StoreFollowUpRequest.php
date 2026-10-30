<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreFollowUpRequest extends FormRequest
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
            'scheduled_at' => ['required', 'date'],
            'plan_notes' => ['required', 'string', 'max:2000'],
        ];
    }
}
