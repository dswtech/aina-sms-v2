<?php

namespace App\Http\Requests\Customer;

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateDealStageRequest extends FormRequest
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
            'to_stage' => ['required', new Enum(PipelineStage::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'booking_fee_confirmed' => ['nullable', 'boolean'],
            'lost_reason' => [
                'nullable',
                'required_if:to_stage,lost',
                new Enum(LostReason::class),
            ],
            'lost_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
