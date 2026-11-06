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
            'booking_fee_confirmed' => ['nullable', 'boolean', 'accepted_if:to_stage,spk'],
            'po_confirmed' => ['nullable', 'boolean', 'accepted_if:to_stage,do'],
            'dp_confirmed' => ['nullable', 'boolean', 'accepted_if:to_stage,do'],
            'unit_confirmed' => ['nullable', 'boolean', 'accepted_if:to_stage,do'],
            'do_event_id' => ['nullable', 'integer', 'required_if:to_stage,delivery'],
            'stage_event_id' => ['nullable', 'integer', 'min:0', 'required_if:to_stage,do'],
            'lost_reason' => [
                'nullable',
                'required_if:to_stage,lost',
                new Enum(LostReason::class),
            ],
            'lost_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'booking_fee_confirmed.accepted_if' => 'Konfirmasi booking fee diperlukan untuk tahap SPK.',
            'po_confirmed.accepted_if' => 'Konfirmasi PO diperlukan untuk tahap DO.',
            'dp_confirmed.accepted_if' => 'Konfirmasi DP diperlukan untuk tahap DO.',
            'unit_confirmed.accepted_if' => 'Konfirmasi Unit diperlukan untuk tahap DO.',
        ];
    }
}
