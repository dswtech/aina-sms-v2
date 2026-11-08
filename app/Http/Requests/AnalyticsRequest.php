<?php

namespace App\Http\Requests;

use App\Support\ReportingPeriod;
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
            // A range needs its start month; a bare period stays a single month.
            'period' => $this->has('to') ? ['required', 'date_format:Y-m'] : ['sometimes', 'required', 'date_format:Y-m'],
            'to' => ['sometimes', 'required', 'date_format:Y-m', ...($this->filled('period') ? ['after_or_equal:period', ReportingPeriod::maxRangeRule('period')] : [])],
            'mode' => ['sometimes', 'required', Rule::in(['acquisition', 'achievement'])],
            'dimension' => ['nullable', Rule::in(['source', 'model'])],
            'value' => ['nullable', 'string', 'max:255'],
        ];
    }
}
