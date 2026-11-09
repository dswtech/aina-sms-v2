<?php

namespace App\Services;

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use App\Support\AuditRecorder;
use App\Support\PhoneNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class CreateLeadTransaction
{
    /** @param array<string, mixed> $validated */
    public function createCustomerLead(User $actor, array $validated): Customer
    {
        Gate::forUser($actor)->authorize('create', Customer::class);
        $dealerId = (int) $actor->dealer_id;

        return DB::transaction(function () use ($actor, $dealerId, $validated): Customer {
            // The same dealer lock serializes manual creation and CSV imports.
            Dealer::query()->whereKey($dealerId)->lockForUpdate()->firstOrFail();
            if (isset($validated['existing_customer_id'])) {
                $customer = Customer::query()->where('dealer_id', $dealerId)
                    ->where('phone', PhoneNormalizer::normalize($validated['phone']))
                    ->where('public_id', $validated['existing_customer_id'])->lockForUpdate()->first();
                if ($customer === null) {
                    throw ValidationException::withMessages(['existing_customer_id' => 'Pelanggan tidak cocok dengan nomor ini. Periksa kembali.']);
                }
                Gate::forUser($actor)->authorize('update', $customer);
                $this->createLeadTransaction($actor, $customer, $validated);

                return $customer;
            }
            if (app(CustomerDuplicateDetector::class)->check($dealerId, $validated['phone'])->hasDuplicate) {
                throw ValidationException::withMessages(['duplicate_customer' => 'Nomor telepon sudah terdaftar. Periksa pelanggan sebelum menyimpan.']);
            }
            $sales = $this->resolveLeadSales($actor, $validated);
            $customer = Customer::create([
                'dealer_id' => $dealerId,
                'created_by_id' => $actor->id,
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'address' => $validated['address'] ?? null,
                'contact_channel_preference' => $validated['contact_channel_preference'] ?? null,
                'opt_out' => $validated['opt_out'] ?? false,
                'social_media_account' => $validated['social_media_account'] ?? null,
            ]);
            $customer->assignTo($sales, $actor, 'Penugasan saat pembuatan lead');
            $this->createLeadTransaction($actor, $customer, $validated);

            return $customer;
        });
    }

    /** @param array<string, mixed> $validated */
    private function resolveLeadSales(User $actor, array $validated): User
    {
        $role = $actor->role;
        $dealerId = $actor->dealer_id;
        $salesId = $role === UserRole::Sales ? $actor->id : (int) $validated['sales_id'];
        // Membership administration also locks users before changing placement.
        User::query()->where('dealer_id', $dealerId)->whereIn('id', [$actor->id, $salesId])->orderBy('id')->lockForUpdate()->get();
        $actor->refresh();
        abort_unless($actor->is_active && $actor->role === $role && $actor->dealer_id === $dealerId, 403);
        $sales = User::query()->whereKey($salesId)->where('dealer_id', $dealerId)->where('role', UserRole::Sales)->where('is_active', true)->first();
        $allowed = $sales !== null;
        if ($allowed && $role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->select('team_id');
            $allowed = $sales->activeTeamMemberships()->where('role', UserRole::Sales)->whereIn('team_id', $teamIds)
                ->whereHas('team', fn ($query) => $query->where('is_active', true))->exists();
        }
        if (! $allowed) {
            throw ValidationException::withMessages(['sales_id' => 'Pilih Sales aktif dalam cakupan Anda.']);
        }

        return $sales;
    }

    /** @param array<string, mixed> $validated */
    public function createLeadTransaction(User $actor, Customer $customer, array $validated): DealTransaction
    {
        return DB::transaction(function () use ($actor, $customer, $validated): DealTransaction {
            Dealer::query()->whereKey($actor->dealer_id)->lockForUpdate()->firstOrFail();
            $customer = Customer::query()->whereKey($customer->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('update', $customer);
            $customer->unsetRelation('assignedSales');
            $sales = $customer->assignedSales;
            if ($sales === null) {
                throw ValidationException::withMessages(['sales_id' => 'Pelanggan harus memiliki penugasan Sales aktif sebelum transaksi dibuat.']);
            }
            User::query()->whereKey($sales->id)->lockForUpdate()->firstOrFail();
            $sales->refresh();
            if ($sales->role !== UserRole::Sales || ! $sales->is_active) {
                throw ValidationException::withMessages(['sales_id' => 'Pelanggan harus memiliki penugasan Sales aktif sebelum transaksi dibuat.']);
            }
            $membership = $sales->activeTeamMemberships()->where('role', UserRole::Sales)->with('team')->first();
            if ($membership !== null && ! $membership->team->is_active) {
                throw ValidationException::withMessages(['sales_id' => 'Tim Sales tidak aktif. Perbarui penempatan sebelum membuat transaksi.']);
            }

            $metadata = TransactionMetadata::normalize($validated, $customer->dealer_id);

            $deal = $customer->transactions()->create([
                ...$metadata,
                'notes' => $validated['notes'] ?? null,
                'dealer_id' => $customer->dealer_id,
                'sales_id' => $sales->id,
                'team_id' => $membership?->team_id,
                'vehicle_model' => $validated['vehicle_model'] ?? null,
                'estimated_value' => $validated['estimated_value'] ?? null,
                'expected_closing_month' => isset($validated['expected_closing_month']) ? $validated['expected_closing_month'].'-01' : null,
                'source' => $validated['source'],
                'current_stage' => PipelineStage::Lead,
                'last_activity_at' => now(),
            ]);

            $deal->stageHistories()->create([
                'from_stage' => null,
                'to_stage' => PipelineStage::Lead,
                'actor_id' => $actor->id,
                'notes' => 'Transaksi baru dibuat',
                'created_at' => now(),
            ]);

            AuditRecorder::record($actor, 'transaction.created', $customer, [], ['transaction_public_id' => $deal->public_id]);

            return $deal;
        });
    }
}
