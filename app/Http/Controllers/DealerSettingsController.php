<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\TransactionMasters;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Admin-only dealer masters; the role gate lives on the route group. */
class DealerSettingsController extends Controller
{
    private function actor(Request $request): User
    {
        /** @var User $actor */
        $actor = $request->user();

        return $actor;
    }

    public function edit(Request $request): Response
    {
        $actor = $this->actor($request);

        return Inertia::render('dealer-settings/index', [
            'regions' => DB::table('area_regions')->orderBy('name')->get(['code', 'name']),
            'districts' => DB::table('area_districts')->orderBy('name')->get(['code', 'region_code', 'name']),
            'foa' => DB::table('dealer_foa_districts')->where('dealer_id', $actor->dealer_id)->orderBy('district_code')->pluck('district_code'),
            'leasings' => DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->orderBy('name')
                ->get(['id', 'name', 'is_active', 'is_monitored'])
                ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'is_active' => (bool) $row->is_active, 'is_monitored' => (bool) $row->is_monitored]),
        ]);
    }

    public function updateFoa(Request $request, TransactionMasters $masters): RedirectResponse
    {
        $masters->setFoa($this->actor($request), $request->validate(['districts' => ['present', 'array']])['districts']);

        return back();
    }

    public function storeLeasing(Request $request, TransactionMasters $masters): RedirectResponse
    {
        $masters->createLeasing($this->actor($request), $request->only('name'));

        return back();
    }

    public function updateLeasing(Request $request, TransactionMasters $masters, int $leasing): RedirectResponse
    {
        $masters->updateLeasing($this->actor($request), $leasing, $request->only(['name', 'is_active', 'is_monitored']));

        return back();
    }
}
