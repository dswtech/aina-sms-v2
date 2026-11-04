<?php

namespace App\Http\Requests\Customer;

use App\Models\DealComment;
use App\Models\DealTransaction;
use Illuminate\Foundation\Http\FormRequest;

class StoreDealCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $comment = $this->route('comment');
        if ($comment instanceof DealComment) {
            return $this->user()?->can('update', $comment) ?? false;
        }

        $deal = $this->route('transaction');

        return $deal instanceof DealTransaction
            && ($this->user()?->can('create', [DealComment::class, $deal]) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
            'parent_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
