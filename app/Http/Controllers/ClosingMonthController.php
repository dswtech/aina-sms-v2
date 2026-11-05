<?php

namespace App\Http\Controllers;

use App\Models\DealTransaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ClosingMonthController extends Controller
{
    public function update(Request $request, DealTransaction $transaction): RedirectResponse
    {
        $this->authorize('update', $transaction);
        $validated = $request->validate(['expected_closing_month' => ['present', 'nullable', 'date_format:Y-m']]);
        $transaction->update(['expected_closing_month' => isset($validated['expected_closing_month']) ? $validated['expected_closing_month'].'-01' : null]);

        return back();
    }
}
