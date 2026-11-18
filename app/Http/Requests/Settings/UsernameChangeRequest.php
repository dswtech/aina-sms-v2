<?php

namespace App\Http\Requests\Settings;

use App\Services\UsernameReservations;
use App\Support\UsernameGenerator;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

class UsernameChangeRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('username'))) {
            $this->merge(['username' => Str::lower(trim($this->input('username')))]);
        }
    }

    /** @return array<string, array<int, ValidationRule|Closure|string>> */
    public function rules(): array
    {
        return [
            'username' => [
                'bail',
                'required',
                'string',
                'regex:/^[a-z][a-z0-9]{5,11}$/',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($value === $this->user()->username) {
                        $fail('Username baru harus berbeda dari username saat ini.');
                    } elseif (UsernameGenerator::isBanned($value)) {
                        $fail('Username ini tidak boleh dipakai.');
                    } elseif (app(UsernameReservations::class)->taken($value)) {
                        $fail('Username ini sudah dipakai.');
                    }
                },
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'username.required' => 'Username wajib diisi.',
            'username.regex' => 'Username harus 6–12 karakter, diawali huruf, dan hanya berisi huruf atau angka.',
        ];
    }

    /** @return array<int, Closure(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->user()->username_changed_at !== null) {
                    $validator->errors()->add('username', 'Username sudah pernah diganti dan tidak bisa diubah lagi.');
                }
            },
        ];
    }
}
