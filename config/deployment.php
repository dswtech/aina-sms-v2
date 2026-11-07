<?php

return [
    'production_setup' => [
        'enabled' => env('AINA_PRODUCTION_SETUP_ENABLED', false),
        'environment' => env('VERCEL_ENV'),
        'branch' => env('VERCEL_GIT_COMMIT_REF'),
        'source_commit' => env('VERCEL_GIT_COMMIT_SHA'),
        'approved_commit' => env('AINA_PRODUCTION_SETUP_COMMIT'),
        'expires_at' => env('AINA_PRODUCTION_SETUP_EXPIRES_AT', 0),
        'expected_host' => env('PGHOST_UNPOOLED'),
        'expected_database' => env('PGDATABASE'),
        'domain' => env('AINA_PRODUCTION_DOMAIN'),
        'dealer' => env('AINA_PRODUCTION_ADMIN_DEALER'),
        'name' => env('AINA_PRODUCTION_ADMIN_NAME'),
        'email' => env('AINA_PRODUCTION_ADMIN_EMAIL'),
        'username' => env('AINA_PRODUCTION_ADMIN_USERNAME'),
    ],
    'preview_invitation' => [
        'enabled' => env('AINA_PREVIEW_INVITATION_ENABLED', false),
        'environment' => env('VERCEL_ENV'),
        'branch' => env('VERCEL_GIT_COMMIT_REF'),
        'expires_at' => env('AINA_PREVIEW_INVITATION_EXPIRES_AT', 0),
        'database_url' => env('DATABASE_URL_UNPOOLED', env('POSTGRES_URL_NON_POOLING')),
        'dealer' => env('AINA_PREVIEW_ADMIN_DEALER'),
        'name' => env('AINA_PREVIEW_ADMIN_NAME'),
        'email' => env('AINA_PREVIEW_ADMIN_EMAIL'),
        'username' => env('AINA_PREVIEW_ADMIN_USERNAME'),
    ],
];
