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
        ]);
    }

    public function leasing(Request $request): Response
    {
        $actor = $this->actor($request);

        return Inertia::render('dealer-settings/leasing', [
            'leasings' => DB::table('leasing_companies')->where('dealer_id', $actor->dealer_id)->orderBy('name')
                ->get(['id', 'name', 'is_active', 'is_monitored'])
                ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'is_active' => (bool) $row->is_active, 'is_monitored' => (bool) $row->is_monitored]),
        ]);
    }

    public function vehicles(Request $request): Response
    {
        $actor = $this->actor($request);

        return Inertia::render('dealer-settings/vehicles', [
            'vehicleTypes' => DB::table('vehicle_types')->where('dealer_id', $actor->dealer_id)->orderBy('name')->get(['id', 'name', 'is_active'])
                ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'is_active' => (bool) $row->is_active]),
            'vehicleModels' => DB::table('vehicle_models')->where('dealer_id', $actor->dealer_id)->orderBy('name')->get(['id', 'vehicle_type_id', 'name', 'price_min', 'price_max', 'is_active'])
                ->map(fn ($row) => ['id' => $row->id, 'vehicle_type_id' => $row->vehicle_type_id, 'name' => $row->name, 'price_min' => $row->price_min, 'price_max' => $row->price_max, 'is_active' => (bool) $row->is_active]),
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

    public function storeVehicleType(Request $request, TransactionMasters $masters): RedirectResponse
    {
        $masters->createVehicleType($this->actor($request), $request->only('name'));

        return back();
    }

    public function updateVehicleType(Request $request, TransactionMasters $masters, int $type): RedirectResponse
    {
        $masters->updateVehicleType($this->actor($request), $type, $request->only(['name', 'is_active']));

        return back();
    }

    public function storeVehicleModel(Request $request, TransactionMasters $masters): RedirectResponse
    {
        $masters->createVehicleModel($this->actor($request), $request->only(['vehicle_type_id', 'name', 'price_min', 'price_max']));

        return back();
    }

    public function updateVehicleModel(Request $request, TransactionMasters $masters, int $model): RedirectResponse
    {
        $masters->updateVehicleModel($this->actor($request), $model, $request->only(['vehicle_type_id', 'name', 'price_min', 'price_max', 'is_active']));

        return back();
    }

    public function updateLeasing(Request $request, TransactionMasters $masters, int $leasing): RedirectResponse
    {
        $masters->updateLeasing($this->actor($request), $leasing, $request->only(['name', 'is_active', 'is_monitored']));

        return back();
    }
}
