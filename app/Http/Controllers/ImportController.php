<?php

namespace App\Http\Controllers;

use App\Enums\Occupation;
use App\Enums\UserRole;
use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\CreateLeadTransaction;
use App\Services\TransactionMetadata;
use App\Support\PhoneNormalizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    private const HEADERS = [
        'name',
        'phone',
        'email',
        'address',
        'vehicle_model',
        'estimated_value',
        'source',
        'notes',
        'contact_channel_preference',
        'sales_username',
        'gender',
    ];

    private const OPTIONAL_HEADERS = ['social_media_account', 'source_channel', 'region_code', 'district_code', 'other_city', 'financing_type', 'leasing_id', 'financing_other_name', 'tenor_months', 'insurance_type', 'birth_date', 'occupation'];

    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();

        $preview = $request->session()->get('import_preview');
        if (! is_array($preview) || ! CsvImportBatch::query()
            ->whereKey($preview['batch_id'] ?? null)
            ->where('dealer_id', $actor->dealer_id)
            ->where('user_id', $actor->id)
            ->where('status', 'preview')->exists()) {
            $preview = null;
            $request->session()->forget('import_preview');
        }

        return Inertia::render('imports/index', [
            'batches' => $this->recentBatches($actor),
            'preview' => $preview,
            'flash' => ['success' => $request->session()->get('success')],
        ]);
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, [...self::HEADERS, ...self::OPTIONAL_HEADERS]);
            fputcsv($handle, [
                'Budi Santoso',
                '081234567890',
                'budi@example.com',
                'Jakarta',
                'Creta',
                '300000000',
                'walk_in',
                'Lead dari showroom',
                'whatsapp',
                'sales_username',
                'L',
                '@budi', '', '32.17', '32.17.08', '', 'cash', '', '', '', '', '1990-01-31', 'employee',
            ]);
            fclose($handle);
        }, 'template-import-lead.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function preview(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:2048', 'mimes:csv,txt'],
        ]);

        $file = $validated['file'];
        $storedPath = $file->storeAs('imports', Str::uuid().'_'.$file->getClientOriginalName(), 'local');

        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            abort(422, 'File CSV tidak dapat dibaca.');
        }

        $header = fgetcsv($handle);
        if (! is_array($header)) {
            fclose($handle);
            abort(422, 'Header CSV tidak ditemukan.');
        }

        $header = array_map(fn ($value): string => Str::lower(trim((string) $value)), $header);
        foreach (['name', 'phone', 'vehicle_model', 'source', 'sales_username', 'gender'] as $requiredHeader) {
            if (! in_array($requiredHeader, $header, true)) {
                fclose($handle);
                abort(422, "Header wajib tidak ditemukan: {$requiredHeader}.");
            }
        }

        $rows = [];
        $seenPhones = [];
        $rowNumber = 1;
        while (($line = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if (count(array_filter($line, fn ($value): bool => $value !== null && trim((string) $value) !== '')) === 0) {
                continue;
            }

            $record = [];
            foreach ([...self::HEADERS, ...self::OPTIONAL_HEADERS] as $field) {
                $position = array_search($field, $header, true);
                $record[$field] = $position === false ? null : ($line[$position] ?? null);
            }

            $errors = $this->validateRow($actor, $record);
            if (count($line) !== count($header)) {
                $errors[] = 'Jumlah kolom tidak sesuai header CSV.';
            }
            $normalizedPhone = PhoneNormalizer::normalize($record['phone'] ?? null);
            if ($normalizedPhone !== null && isset($seenPhones[$normalizedPhone])) {
                $errors[] = 'Nomor telepon berulang dalam CSV. Gunakan satu identitas pelanggan.';
            }
            if ($errors === [] && $normalizedPhone !== null) {
                $seenPhones[$normalizedPhone] = true;
            }
            $rows[] = [
                'row_number' => $rowNumber,
                'data' => $record,
                'errors' => $errors,
                'valid' => $errors === [],
            ];
        }
        fclose($handle);

        $batch = CsvImportBatch::create([
            'dealer_id' => $actor->dealer_id,
            'user_id' => $actor->id,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $storedPath,
            'status' => 'preview',
            'total_rows' => count($rows),
            'accepted_count' => count(array_filter($rows, fn (array $row): bool => $row['valid'])),
            'rejected_count' => count(array_filter($rows, fn (array $row): bool => ! $row['valid'])),
            'started_at' => now(),
        ]);

        $preview = [
            'batch_id' => $batch->id,
            'filename' => $file->getClientOriginalName(),
            'rows' => $rows,
            'accepted_count' => $batch->accepted_count,
            'rejected_count' => $batch->rejected_count,
        ];

        $request->session()->put('import_preview', $preview);

        return Inertia::render('imports/index', [
            'batches' => $this->recentBatches($actor),
            'preview' => $preview,
        ]);
    }

    public function commit(Request $request, CsvImportBatch $batch): RedirectResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless($batch->dealer_id === $actor->dealer_id, 403);
        abort_unless($batch->user_id === $actor->id, 403);
        abort_unless($batch->status === 'preview', 422);

        $preview = $request->session()->get('import_preview');
        abort_unless(is_array($preview) && ($preview['batch_id'] ?? null) === $batch->id, 422);

        $validRows = array_filter($preview['rows'] ?? [], fn (array $row): bool => $row['valid'] ?? false);

        DB::transaction(function () use ($actor, $batch, $validRows): void {
            Dealer::query()->whereKey($actor->dealer_id)->lockForUpdate()->firstOrFail();
            $batch->refresh();
            abort_unless($batch->status === 'preview', 422);
            foreach ($validRows as $row) {
                $record = $row['data'];
                $errors = $this->validateRow($actor, $record);
                if ($errors !== []) {
                    throw ValidationException::withMessages(['import' => 'Baris '.$row['row_number'].': '.implode(' ', $errors).' Tidak ada baris yang disimpan; unggah ulang CSV untuk memeriksa data terbaru.']);
                }
                $sales = $this->resolveSales($actor, trim((string) $record['sales_username']));
                app(CreateLeadTransaction::class)->createCustomerLead($actor, [
                    ...$this->metadataRecord($record, (int) $actor->dealer_id),
                    'sales_id' => $sales->id,
                    'name' => trim((string) $record['name']), 'phone' => (string) $record['phone'],
                    'email' => $this->nullableString($record['email']), 'address' => $this->nullableString($record['address']),
                    'gender' => $this->nullableString($record['gender']), 'birth_date' => $this->nullableString($record['birth_date'] ?? null),
                    'occupation' => $this->nullableString($record['occupation'] ?? null),
                    'contact_channel_preference' => $this->nullableString($record['contact_channel_preference']),
                    'notes' => $this->nullableString($record['notes']),
                    'vehicle_model' => trim((string) $record['vehicle_model']),
                    'estimated_value' => $this->nullableInteger($record['estimated_value']),
                ]);
            }

            $batch->update([
                'status' => 'completed',
                'accepted_count' => count($validRows),
                'completed_at' => now(),
            ]);
        });

        $request->session()->forget('import_preview');

        return redirect()->route('imports.index')->with('success', count($validRows).' baris berhasil diimport.');
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<int, string>
     */
    private function validateRow(User $actor, array $record): array
    {
        $record = array_map(fn ($value): ?string => $this->nullableString($value), $record);
        $errors = Validator::make($record, [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'vehicle_model' => ['required', 'string', 'max:255'],
            'estimated_value' => ['nullable', 'integer', 'min:0', 'max:'.PHP_INT_MAX],
            'source' => ['required', 'string', 'max:64'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'contact_channel_preference' => ['nullable', 'in:whatsapp,phone,any'],
            'sales_username' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'birth_date' => ['nullable', 'date_format:Y-m-d', 'before:today'],
            'occupation' => ['nullable', Rule::enum(Occupation::class)],
        ], [], [
            'name' => 'Nama', 'phone' => 'Nomor telepon', 'email' => 'Email',
            'address' => 'Alamat', 'vehicle_model' => 'Model kendaraan',
            'estimated_value' => 'Estimasi nilai', 'source' => 'Sumber', 'notes' => 'Catatan',
            'contact_channel_preference' => 'Preferensi kontak', 'sales_username' => 'Username Sales',
            'gender' => 'Gender', 'birth_date' => 'Tanggal lahir', 'occupation' => 'Pekerjaan',
        ])->errors()->all();

        try {
            TransactionMetadata::normalize($this->metadataRecord($record, (int) $actor->dealer_id), (int) $actor->dealer_id);
        } catch (ValidationException $exception) {
            $errors = [...$errors, ...$exception->validator->errors()->all()];
        }

        $phone = (string) ($record['phone'] ?? '');
        if (! PhoneNormalizer::isValid($phone)) {
            $errors[] = 'Nomor telepon tidak valid.';
        } else {
            $duplicate = Customer::query()
                ->where('dealer_id', $actor->dealer_id)
                ->where('phone', PhoneNormalizer::normalize($phone))
                ->exists();
            if ($duplicate) {
                $errors[] = 'Nomor telepon sudah terdaftar.';
            }
        }

        $salesUsername = trim((string) ($record['sales_username'] ?? ''));
        if ($salesUsername === '') {
            $errors[] = 'Username sales wajib diisi.';
        } else {
            try {
                $this->resolveSales($actor, $salesUsername);
            } catch (\DomainException $exception) {
                $errors[] = $exception->getMessage();
            }
        }

        return $errors;
    }

    /** @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function metadataRecord(array $record, int $dealerId): array
    {
        [$region, $district] = $this->resolveArea(
            $this->nullableString($record['region_code'] ?? null),
            $this->nullableString($record['district_code'] ?? null),
        );

        return [
            'source' => trim((string) ($record['source'] ?? '')),
            'source_channel' => $this->nullableString($record['source_channel'] ?? null),
            'social_media_account' => $this->nullableString($record['social_media_account'] ?? null),
            'area' => [
                'region_code' => $region,
                'district_code' => $district,
                'other_city' => $this->nullableString($record['other_city'] ?? null),
            ],
            'financing' => [
                'type' => $this->nullableString($record['financing_type'] ?? null),
                'leasing_id' => $this->resolveLeasing($this->nullableString($record['leasing_id'] ?? null), $dealerId)
                    ?? ($this->nullableString($record['financing_other_name'] ?? null) !== null ? 'other' : null),
                'other_name' => $this->nullableString($record['financing_other_name'] ?? null),
                'tenor_months' => $this->nullableString($record['tenor_months'] ?? null),
                'insurance_type' => $this->nullableString($record['insurance_type'] ?? null),
            ],
        ];
    }

    /** Official code or exact (case-insensitive) master name; unresolved values pass through so TransactionMetadata rejects them.
     * @return array{0: ?string, 1: ?string}
     */
    private function resolveArea(?string $region, ?string $district): array
    {
        if ($region !== null && $region !== 'other' && ! DB::table('area_regions')->where('code', $region)->exists()) {
            $region = DB::table('area_regions')->whereRaw('lower(name) = ?', [Str::lower($region)])->value('code') ?? $region;
        }
        if ($district !== null && $region !== null) {
            $district = DB::table('area_districts')->where('region_code', $region)
                ->where(fn ($query) => $query->where('code', $district)->orWhereRaw('lower(name) = ?', [Str::lower($district)]))
                ->value('code') ?? $district;
        }

        return [$region, $district];
    }

    private function resolveLeasing(?string $leasing, int $dealerId): ?string
    {
        if ($leasing === null || $leasing === 'other' || ctype_digit($leasing)) {
            return $leasing;
        }
        $id = DB::table('leasing_companies')->where('dealer_id', $dealerId)->where('is_active', true)
            ->whereRaw('lower(name) = ?', [Str::lower($leasing)])->value('id');

        return $id === null ? $leasing : (string) $id;
    }

    private function resolveSales(User $actor, string $username): User
    {
        $sales = User::query()
            ->where('dealer_id', $actor->dealer_id)
            ->where('role', UserRole::Sales)
            ->where('is_active', true)
            ->where('username', $username)
            ->first();

        if ($sales === null) {
            throw new \DomainException('Sales tidak ditemukan atau tidak aktif.');
        }

        if ($actor->role === UserRole::Supervisor && ! $this->salesMemberships($actor, $sales)->exists()) {
            throw new \DomainException('Sales berada di luar tim aktif Supervisor.');
        }

        return $sales;
    }

    /** @return Builder<TeamMembership> */
    private function salesMemberships(User $actor, User $sales): Builder
    {
        $memberships = TeamMembership::query()
            ->where('user_id', $sales->id)->where('role', UserRole::Sales)->whereNull('ended_at')
            ->whereHas('team', fn (Builder $team): Builder => $team->where('dealer_id', $actor->dealer_id)->where('is_active', true));

        if ($actor->role === UserRole::Supervisor) {
            $memberships->whereIn('team_id', $actor->activeTeamMemberships()->where('role', UserRole::Supervisor)->select('team_id'));
        }

        return $memberships;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function nullableInteger(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        return (int) $value;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentBatches(User $actor): array
    {
        return CsvImportBatch::query()
            ->where('dealer_id', $actor->dealer_id)
            ->when($actor->role === UserRole::Supervisor, fn (Builder $query): Builder => $query->where('user_id', $actor->id))
            ->with('user:id,name')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (CsvImportBatch $batch): array => [
                'id' => $batch->id,
                'original_filename' => $batch->original_filename,
                'status' => $batch->status,
                'total_rows' => $batch->total_rows,
                'accepted_count' => $batch->accepted_count,
                'rejected_count' => $batch->rejected_count,
                'created_at' => $batch->created_at->toIso8601String(),
                'actor_name' => $batch->user?->name,
            ])->all();
    }
}
