<?php

return [
    'preview_invitation' => [
        'enabled' => env('AINA_PREVIEW_INVITATION_ENABLED', false),
        'environment' => env('VERCEL_ENV'),
        'branch' => env('VERCEL_GIT_COMMIT_REF'),
        'expires_at' => env('AINA_PREVIEW_INVITATION_EXPIRES_AT', 0),
        'dealer' => env('AINA_PREVIEW_ADMIN_DEALER'),
        'name' => env('AINA_PREVIEW_ADMIN_NAME'),
        'email' => env('AINA_PREVIEW_ADMIN_EMAIL'),
        'username' => env('AINA_PREVIEW_ADMIN_USERNAME'),
    ],
];
