<?php

namespace App\Http\Controllers;

use App\Support\Releases;
use Inertia\Inertia;
use Inertia\Response;

class ReleaseLogController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('releases/index', [
            'releases' => array_map(
                fn (array $release): array => array_intersect_key($release, array_flip(['version', 'date', 'items'])),
                Releases::all(),
            ),
        ]);
    }
}
