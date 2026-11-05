<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'period' => ['sometimes', 'required', 'date_format:Y-m'],
            'mode' => ['sometimes', 'required', Rule::in(['acquisition', 'achievement'])],
            'dimension' => ['nullable', Rule::in(['source', 'model'])],
            'value' => ['nullable', 'string', 'max:255'],
        ];
    }
}
