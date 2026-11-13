<?php

namespace App\Support;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use RuntimeException;

final class UsernameExhausted extends RuntimeException
{
    public const MESSAGE = 'Username unik tidak dapat dibuat dari nama ini. Lengkapi atau ubah nama, lalu coba lagi.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function render(Request $request): RedirectResponse|Response
    {
        // Inertia reserves 409 for asset-version reloads, so its forms get a field error instead.
        if ($request->header('X-Inertia')) {
            return back()->withErrors(['name' => self::MESSAGE])->withInput();
        }

        return response(self::MESSAGE, 409);
    }
}
