<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use App\Models\Invitation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreInvitationRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => Str::lower((string) $this->input('email')),
        ]);
    }

    public function authorize(): bool
    {
        return $this->user()?->can('create', Invitation::class) === true;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['name.regex' => 'Nama wajib memuat minimal satu huruf Latin (a–z).'];
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $requiresTeam = in_array($this->input('role'), [UserRole::Sales->value, UserRole::Supervisor->value], true);

        return [
            // The username is built from Latin letters of the name, so at least one is needed.
            'name' => ['required', 'string', 'max:255', 'regex:/[A-Za-z]/'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::enum(UserRole::class)],
            'team_id' => [
                Rule::requiredIf($requiresTeam),
                Rule::prohibitedIf(! $requiresTeam),
                'nullable',
                'integer',
                Rule::exists('teams', 'id')->where(fn ($query) => $query
                    ->where('dealer_id', $this->user()?->dealer_id)
                    ->where('is_active', true)),
            ],
        ];
    }
}
