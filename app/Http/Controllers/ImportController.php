<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\DealTransaction;
use App\Models\TeamMembership;
use App\Models\User;
use App\Support\PhoneNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
    ];

    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = $request->user();

        $batches = CsvImportBatch::query()
            ->where('dealer_id', $actor->dealer_id)
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

        $preview = $request->session()->get('import_preview');

        return Inertia::render('imports/index', [
            'batches' => $batches,
            'preview' => $preview,
        ]);
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                return;
            }

            fputcsv($handle, self::HEADERS);
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
        foreach (['name', 'phone', 'vehicle_model', 'source', 'sales_username'] as $requiredHeader) {
            if (! in_array($requiredHeader, $header, true)) {
                fclose($handle);
                abort(422, "Header wajib tidak ditemukan: {$requiredHeader}.");
            }
        }

        $rows = [];
        $rowNumber = 1;
        while (($line = fgetcsv($handle)) !== false) {
            $rowNumber++;
            if (count(array_filter($line, fn ($value): bool => $value !== null && trim((string) $value) !== '')) === 0) {
                continue;
            }

            $record = [];
            foreach (self::HEADERS as $index => $field) {
                $position = array_search($field, $header, true);
                $record[$field] = $position === false ? null : ($line[$position] ?? null);
            }

            $errors = $this->validateRow($actor, $record);
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
            foreach ($validRows as $row) {
                $record = $row['data'];
                $sales = $this->resolveSales($actor, (string) $record['sales_username']);
                $customer = Customer::create([
                    'dealer_id' => $actor->dealer_id,
                    'created_by_id' => $actor->id,
                    'name' => trim((string) $record['name']),
                    'phone' => (string) $record['phone'],
                    'email' => $this->nullableString($record['email']),
                    'address' => $this->nullableString($record['address']),
                    'contact_channel_preference' => $this->nullableString($record['contact_channel_preference']),
                    'notes' => $this->nullableString($record['notes']),
                ]);

                $customer->assignTo($sales, $actor, 'Import CSV');

                DealTransaction::create([
                    'dealer_id' => $actor->dealer_id,
                    'customer_id' => $customer->id,
                    'sales_id' => $sales->id,
                    'team_id' => $sales->activeTeamMemberships()->value('team_id'),
                    'vehicle_model' => trim((string) $record['vehicle_model']),
                    'estimated_value' => $this->nullableInteger($record['estimated_value']),
                    'source' => trim((string) $record['source']),
                    'current_stage' => 'lead',
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
        $errors = [];

        if (trim((string) ($record['name'] ?? '')) === '') {
            $errors[] = 'Nama wajib diisi.';
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

        if (trim((string) ($record['vehicle_model'] ?? '')) === '') {
            $errors[] = 'Model kendaraan wajib diisi.';
        }

        $source = trim((string) ($record['source'] ?? ''));
        if ($source === '' || strlen($source) > 64) {
            $errors[] = 'Sumber wajib diisi maksimal 64 karakter.';
        }

        $email = $this->nullableString($record['email']);
        if ($email !== null && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email tidak valid.';
        }

        $estimatedValue = $record['estimated_value'] ?? null;
        if ($estimatedValue !== null && $estimatedValue !== '' && (! is_numeric($estimatedValue) || (int) $estimatedValue < 0)) {
            $errors[] = 'Estimasi nilai harus angka positif.';
        }

        $preference = $this->nullableString($record['contact_channel_preference']);
        if ($preference !== null && ! in_array($preference, ['whatsapp', 'phone', 'any'], true)) {
            $errors[] = 'Preferensi kontak tidak valid.';
        }

        $salesUsername = trim((string) ($record['sales_username'] ?? ''));
        if ($salesUsername === '') {
            $errors[] = 'Username sales wajib diisi.';
        } else {
            try {
                $this->resolveSales($actor, $salesUsername);
            } catch (\Throwable $exception) {
                $errors[] = $exception->getMessage();
            }
        }

        return $errors;
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
            throw new \RuntimeException('Sales tidak ditemukan atau tidak aktif.');
        }

        if ($actor->role === UserRole::Supervisor) {
            $teamIds = $actor->activeTeamMemberships()->select('team_id');
            $allowed = TeamMembership::query()
                ->whereIn('team_id', $teamIds)
                ->where('user_id', $sales->id)
                ->whereNull('ended_at')
                ->exists();

            if (! $allowed) {
                throw new \RuntimeException('Sales berada di luar tim Supervisor.');
            }
        }

        return $sales;
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
