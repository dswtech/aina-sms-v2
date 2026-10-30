<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\TeamMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeamMembershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', TeamMembership::class) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'user_id' => [
                'required', 'uuid',
                Rule::exists('users', 'public_id')->where(fn ($query) => $query
                    ->where('dealer_id', $this->user()?->dealer_id)
                    ->where('is_active', true)
                    ->whereIn('role', [UserRole::Sales->value, UserRole::Supervisor->value])),
            ],
            'team_id' => [
                'required', 'uuid',
                Rule::exists('teams', 'public_id')->where(fn ($query) => $query
                    ->where('dealer_id', $this->user()?->dealer_id)
                    ->where('is_active', true)),
            ],
        ];
    }
}
