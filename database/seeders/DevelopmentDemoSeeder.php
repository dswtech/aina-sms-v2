<?php

namespace Database\Seeders;

use App\Enums\ActivityType;
use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\CustomerAssignment;
use App\Models\DealComment;
use App\Models\DealCommentRevision;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\FollowUp;
use App\Models\Invitation;
use App\Models\SalesTarget;
use App\Models\SalesTargetRevision;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\TransactionMasters;
use App\Services\TransactionSnapshots;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Data demo lengkap untuk pengembangan lokal.
 *
 * Seeder ini hanya berjalan pada environment `local` dan tidak dijalankan
 * otomatis pada environment lain. Untuk membuat atau melengkapi data demo:
 *
 *     php artisan db:seed --class=DevelopmentDemoSeeder
 */
class DevelopmentDemoSeeder extends Seeder
{
    public const INITIAL_STAGE_NOTE = 'Lead baru masuk dan siap dihubungi.';

    public const COMMENT_BODIES = [
        'Pelanggan ini butuh perhatian ekstra. Coba tawarkan paket aksesori.',
        'Harga masih bisa dinegosiasikan. Koordinasikan dengan kepala cabang.',
        'Jangan lupa konfirmasi kesiapan dokumen sebelum SPK.',
        'Sudah bagus progresnya. Pastikan follow-up berikutnya tercatat.',
        'Baik, akan saya follow-up hari ini.',
        'Sudah saya sampaikan ke pelanggan, menunggu konfirmasi.',
        'Terima kasih arahan. Saya jadwalkan test drive ulang.',
        'Pelanggan sudah konfirmasi akan test drive akhir pekan ini.',
    ];

    private const CUSTOMER_TOTAL = 72;

    private const DEAL_TOTAL = 168;

    /**
     * @var list<Customer>
     */
    private array $customers = [];

    /**
     * @var array<int, array{sales: User, team_id: int, supervisor: User|null}>
     */
    private array $customerContext = [];

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('DevelopmentDemoSeeder dilewati: hanya untuk environment local.');

            return;
        }

        $dealer = Dealer::query()->where('name', 'AINA Development Dealer')->first();

        if ($dealer === null) {
            $this->call(DevelopmentUserSeeder::class);
            $dealer = Dealer::query()->where('name', 'AINA Development Dealer')->firstOrFail();
        }

        $this->call(AreaMasterSeeder::class);
        TransactionMasters::initialize($dealer->id);

        if (Customer::query()->where('dealer_id', $dealer->id)->where('notes', 'like', '[demo]%')->exists()) {
            $this->command?->info('Data demo sudah ada; melengkapi contoh laporan tanpa membuat ulang data.');
            $this->call(DevelopmentReportingSeeder::class);

            return;
        }

        mt_srand(20261104);

        $teams = Team::query()->where('dealer_id', $dealer->id)->orderBy('id')->get();

        if ($teams->isEmpty()) {
            $this->command?->warn('Tidak ada tim. Jalankan DevelopmentUserSeeder terlebih dahulu.');

            return;
        }

        /** @var User $admin */
        $admin = User::query()
            ->where('dealer_id', $dealer->id)
            ->where('role', UserRole::Admin)
            ->orderBy('id')
            ->firstOrFail();

        /** @var User|null $branchManager */
        $branchManager = User::query()
            ->where('dealer_id', $dealer->id)
            ->where('role', UserRole::BranchManager)
            ->orderBy('id')
            ->first();

        $memberships = TeamMembership::query()
            ->whereIn('team_id', $teams->pluck('id'))
            ->whereNull('ended_at')
            ->with('user')
            ->get();

        /** @var array<int, list<User>> $salesByTeam */
        $salesByTeam = [];
        /** @var array<int, User|null> $supervisorByTeam */
        $supervisorByTeam = [];

        foreach ($teams as $team) {
            $salesByTeam[$team->id] = array_values($memberships
                ->where('team_id', $team->id)
                ->where('role', UserRole::Sales->value)
                ->map(fn (TeamMembership $membership): ?User => $membership->user)
                ->filter()
                ->values()
                ->all());

            $supervisorByTeam[$team->id] = $memberships
                ->where('team_id', $team->id)
                ->where('role', UserRole::Supervisor->value)
                ->map(fn (TeamMembership $membership): ?User => $membership->user)
                ->filter()
                ->first();
        }

        $allSales = collect($salesByTeam)->flatten()->filter()->values();

        if ($allSales->isEmpty()) {
            $this->command?->warn('Tidak ada Sales aktif. Jalankan DevelopmentUserSeeder terlebih dahulu.');

            return;
        }

        $this->customers = [];
        $this->customerContext = [];

        DB::transaction(function () use ($dealer, $admin, $branchManager, $teams, $salesByTeam, $supervisorByTeam, $allSales): void {
            $this->seedCustomers($dealer, $teams, $salesByTeam, $supervisorByTeam);
            $dealRecords = $this->seedDeals($dealer, $admin);
            $this->seedFollowUps($admin);
            $this->seedComments($dealRecords, $admin);
            $this->seedTargets($admin, $allSales);
            $this->seedImportBatches($dealer, $admin);
            $this->seedNotifications($admin, $branchManager, $teams, $salesByTeam, $supervisorByTeam);
            $this->seedAuditLogs($dealer, $admin);
            $this->seedInvitations($dealer, $admin, $teams);
        });

        $this->call(DevelopmentReportingSeeder::class);

        $this->command?->info(sprintf(
            'Data demo dibuat: %d pelanggan, %d transaksi.',
            self::CUSTOMER_TOTAL,
            self::DEAL_TOTAL,
        ));
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @param  array<int, list<User>>  $salesByTeam
     * @param  array<int, User|null>  $supervisorByTeam
     */
    private function seedCustomers(
        Dealer $dealer,
        $teams,
        array $salesByTeam,
        array $supervisorByTeam,
    ): void {
        $firstNames = [
            'Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Galih', 'Hana',
            'Indra', 'Joko', 'Kartika', 'Lestari', 'Made', 'Nadia', 'Oki', 'Putri',
            'Rangga', 'Sinta', 'Taufik', 'Umi', 'Vina', 'Wahyu', 'Yoga', 'Zahra',
        ];

        $lastNames = ['Santoso', 'Wijaya', 'Pratama', 'Lestari'];

        $streets = [
            'Melati', 'Anggrek', 'Mawar', 'Kenanga', 'Cempaka', 'Flamboyan',
            'Dahlia', 'Tulip', 'Sakura', 'Kamboja', 'Bougenville', 'Teratai',
        ];

        $cities = ['Jakarta Selatan', 'Depok', 'Bekasi', 'Tangerang', 'Bogor'];

        $preferences = ['whatsapp', 'call'];

        for ($index = 0; $index < self::CUSTOMER_TOTAL; $index++) {
            $team = $teams[$index % $teams->count()];
            $salesList = $salesByTeam[$team->id];
            $sales = $salesList[$index % count($salesList)];
            $supervisor = $supervisorByTeam[$team->id] ?? null;
            $assignmentActor = $supervisor ?? $sales;

            $name = $firstNames[$index % count($firstNames)].' '.$lastNames[intdiv($index, count($firstNames)) % count($lastNames)];

            $customer = Customer::create([
                'public_id' => (string) Str::uuid(),
                'dealer_id' => $dealer->id,
                'created_by_id' => $sales->id,
                'name' => $name,
                'phone' => sprintf('0812%08d', 10000000 + $index),
                'email' => sprintf('demo.%03d@example.test', $index),
                'address' => sprintf(
                    'Jl. %s No. %d, %s',
                    $streets[$index % count($streets)],
                    10 + $index,
                    $cities[$index % count($cities)],
                ),
                'contact_channel_preference' => $preferences[$index % count($preferences)],
                'opt_out' => $index % 23 === 0,
                'last_contact_at' => $index % 9 === 0 ? null : now()->subDays(mt_rand(0, 14)),
                'notes' => '[demo] Pelanggan contoh untuk pengembangan lokal.',
                'gender' => $index % 2 === 0 ? 'L' : 'P',
                'birth_date' => now()->subYears(25 + $index % 30)->subDays($index)->toDateString(),
                'occupation' => ['employee', 'entrepreneur', 'civil-servant', 'teacher', 'farmer', 'others'][$index % 6],
                'region_code' => '32.17', 'district_code' => '32.17.08',
            ]);

            if ($index % 11 === 0 && count($salesList) > 1) {
                $previousSales = $salesList[($index + 3) % count($salesList)];

                CustomerAssignment::create([
                    'customer_id' => $customer->id,
                    'sales_id' => $previousSales->id,
                    'assigned_by_id' => $assignmentActor->id,
                    'started_at' => now()->subDays(75),
                    'ended_at' => now()->subDays(20),
                    'notes' => 'Rotasi wilayah sebelumnya.',
                ]);

                CustomerAssignment::create([
                    'customer_id' => $customer->id,
                    'sales_id' => $sales->id,
                    'assigned_by_id' => $assignmentActor->id,
                    'started_at' => now()->subDays(20),
                    'ended_at' => null,
                    'notes' => 'Penugasan aktif.',
                ]);

                CustomerActivity::create([
                    'customer_id' => $customer->id,
                    'deal_transaction_id' => null,
                    'user_id' => $assignmentActor->id,
                    'type' => ActivityType::AssignmentChange,
                    'notes' => 'Penugasan dipindahkan ke '.$sales->name.' karena penyesuaian wilayah.',
                    'occurred_at' => now()->subDays(20),
                ]);
            } else {
                CustomerAssignment::create([
                    'customer_id' => $customer->id,
                    'sales_id' => $sales->id,
                    'assigned_by_id' => $assignmentActor->id,
                    'started_at' => now()->subDays(mt_rand(30, 90)),
                    'ended_at' => null,
                    'notes' => null,
                ]);
            }

            $this->customers[] = $customer;
            $this->customerContext[$customer->id] = [
                'sales' => $sales,
                'team_id' => $team->id,
                'supervisor' => $supervisor,
            ];
        }
    }

    /**
     * @return list<array{deal: DealTransaction, sales: User, supervisor: User|null}>
     */
    private function seedDeals(Dealer $dealer, User $admin): array
    {
        $stagePlan = array_merge(
            array_fill(0, 34, PipelineStage::Lead),
            array_fill(0, 26, PipelineStage::Prospect),
            array_fill(0, 22, PipelineStage::HotProspect),
            array_fill(0, 18, PipelineStage::Spk),
            array_fill(0, 14, PipelineStage::Do),
            array_fill(0, 30, PipelineStage::Delivery),
            array_fill(0, 24, PipelineStage::Lost),
        );

        shuffle($stagePlan);

        TransactionMasters::initializeVehicles($dealer->id);
        $vehicleModels = array_merge(...array_map(array_keys(...), array_values(TransactionMasters::TOYOTA_CATALOG)));

        $sources = ['walk_in', 'digital_ad', 'referral', 'exhibition', 'call'];

        $activityNotes = [
            ActivityType::Call->value => [
                'Menghubungi pelanggan untuk konfirmasi kebutuhan unit.',
                'Follow-up telepon terkait simulasi kredit.',
                'Konfirmasi jadwal test drive melalui telepon.',
            ],
            ActivityType::Whatsapp->value => [
                'Mengirim brosur dan daftar harga terbaru.',
                'Membalas pertanyaan pelanggan soal warna unit.',
                'Mengirim reminder jadwal test drive.',
            ],
            ActivityType::Visit->value => [
                'Kunjungan ke rumah pelanggan untuk pendekatan awal.',
                'Bertemu pelanggan di kantor untuk membahas penawaran.',
            ],
            ActivityType::Meeting->value => [
                'Test drive di showroom bersama keluarga.',
                'Pertemuan di showroom untuk negosiasi harga.',
            ],
            ActivityType::Note->value => [
                'Pelanggan mempertimbangkan tipe tertinggi.',
                'Menunggu keputusan pembelian bersama pasangan.',
            ],
        ];

        $activityTypes = [
            ActivityType::Call,
            ActivityType::Whatsapp,
            ActivityType::Visit,
            ActivityType::Meeting,
            ActivityType::Note,
        ];

        $lostReasons = LostReason::cases();

        /** @var list<array{deal: DealTransaction, sales: User, supervisor: User|null}> $records */
        $records = [];

        for ($index = 0; $index < self::DEAL_TOTAL; $index++) {
            $customer = $this->customers[$index % self::CUSTOMER_TOTAL];
            $context = $this->customerContext[$customer->id];
            $sales = $context['sales'];
            $stage = $stagePlan[$index];

            $createdAt = $index % 3 === 0
                ? $this->randomThisMonth()
                : now()->subDays(mt_rand(20, 180))->subMinutes(mt_rand(0, 1440));

            $finalAt = match (true) {
                in_array($stage, [PipelineStage::Do, PipelineStage::Delivery], true) => $this->randomThisMonth(),
                $stage === PipelineStage::Lost => $this->clamp($createdAt->copy()->addDays(mt_rand(4, 25)), $createdAt, now()),
                $index % 9 === 4 => now()->subDays(mt_rand(4, 12)),
                default => now()->subHours(mt_rand(1, 96)),
            };

            if ($finalAt->lt($createdAt)) {
                $finalAt = $this->clamp($createdAt->copy()->addHours(2), $createdAt, now());
            }

            $estimatedValue = mt_rand(150, 500) * 1_000_000;

            $bookingFeeConfirmedAt = in_array($stage, [PipelineStage::Spk, PipelineStage::Do, PipelineStage::Delivery], true)
                ? $this->clamp($createdAt->copy()->addDays(3), $createdAt, $finalAt)
                : null;

            $lostReason = $stage === PipelineStage::Lost
                ? $lostReasons[$index % count($lostReasons)]
                : null;

            $deal = DealTransaction::create([
                'public_id' => (string) Str::uuid(),
                'dealer_id' => $dealer->id,
                'customer_id' => $customer->id,
                'sales_id' => $sales->id,
                'team_id' => $context['team_id'],
                'vehicle_model' => $vehicleModels[$index % count($vehicleModels)],
                'estimated_value' => $estimatedValue,
                'source' => $sources[$index % count($sources)],
                'source_channel' => $sources[$index % count($sources)] === 'digital_ad' ? 'instagram' : null,
                'notes' => '[demo] Catatan transaksi contoh.',
                'region_code' => '32.17', 'district_code' => '32.17.08',
                'financing_type' => $index % 2 === 0 ? 'cash' : 'credit',
                'leasing_id' => $index % 2 === 0 ? null : DB::table('leasing_companies')->where('dealer_id', $dealer->id)->where('code', 'acc')->value('id'),
                'tenor_months' => $index % 2 === 0 ? null : [12, 24, 36, 48, 60][$index % 5],
                'insurance_type' => $index % 2 === 0 ? null : ['tlo', 'all_risk', 'combination'][$index % 3],
                'current_stage' => $stage,
                'booking_fee_confirmed_at' => $bookingFeeConfirmedAt,
                'lost_reason' => $lostReason,
                'lost_notes' => $lostReason !== null
                    ? 'Pelanggan '.strtolower($lostReason->label()).'.'
                    : null,
                'last_activity_at' => $finalAt,
            ]);

            $deal->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $finalAt,
                'progress_at' => $finalAt,
            ])->saveQuietly();

            $this->seedStageHistories($deal, $stage, $createdAt, $finalAt, $sales, $context['supervisor']);

            $activityCount = 2 + ($index % 3);

            for ($activityIndex = 0; $activityIndex < $activityCount; $activityIndex++) {
                $type = $activityTypes[$activityIndex % count($activityTypes)];
                $notes = $activityNotes[$type->value];

                CustomerActivity::create([
                    'customer_id' => $customer->id,
                    'deal_transaction_id' => $deal->id,
                    'user_id' => $sales->id,
                    'type' => $type,
                    'notes' => $notes[$index % count($notes)],
                    'occurred_at' => $this->randomBetween($createdAt, $finalAt),
                ]);
            }

            $records[] = [
                'deal' => $deal,
                'sales' => $sales,
                'supervisor' => $context['supervisor'],
            ];
        }

        return $records;
    }

    private function seedStageHistories(
        DealTransaction $deal,
        PipelineStage $stage,
        CarbonInterface $createdAt,
        CarbonInterface $finalAt,
        User $sales,
        ?User $supervisor,
    ): void {
        $paths = [
            PipelineStage::Lead->value => [PipelineStage::Lead],
            PipelineStage::Prospect->value => [PipelineStage::Lead, PipelineStage::Prospect],
            PipelineStage::HotProspect->value => [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect],
            PipelineStage::Spk->value => [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect, PipelineStage::Spk],
            PipelineStage::Do->value => [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect, PipelineStage::Spk, PipelineStage::Do],
            PipelineStage::Delivery->value => [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect, PipelineStage::Spk, PipelineStage::Do, PipelineStage::Delivery],
            PipelineStage::Lost->value => [PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::Lost],
        ];

        $path = $paths[$stage->value];
        $steps = count($path);
        $interval = max(1, intdiv(max(1, (int) $createdAt->diffInSeconds($finalAt)), $steps));

        $notes = [
            PipelineStage::Lead->value => self::INITIAL_STAGE_NOTE,
            PipelineStage::Prospect->value => 'Pelanggan menunjukkan minat pada unit.',
            PipelineStage::HotProspect->value => 'Sudah test drive dan meminta simulasi kredit.',
            PipelineStage::Spk->value => 'Booking fee diterima, SPK dibuat.',
            PipelineStage::Do->value => 'PO, DP, dan Unit dikonfirmasi.',
            PipelineStage::Delivery->value => 'Pengiriman unit dikonfirmasi.',
            PipelineStage::Lost->value => 'Peluang ditutup karena alasan yang tercatat.',
        ];

        $previousStage = null;

        foreach ($path as $pathIndex => $toStage) {
            $at = $pathIndex === $steps - 1
                ? $finalAt->copy()
                : $createdAt->copy()->addSeconds($interval * ($pathIndex + 1));

            if ($at->gt($finalAt)) {
                $at = $finalAt->copy();
            }

            if ($toStage === PipelineStage::Do && $stage === PipelineStage::Delivery) {
                $monthStart = $finalAt->copy()->setTimezone('Asia/Jakarta')->startOfMonth()->utc();
                if ($at->lt($monthStart)) {
                    $at = $monthStart;
                }
            }

            $actor = $toStage === PipelineStage::Spk && $supervisor !== null
                ? $supervisor
                : $sales;

            StageHistory::create([
                'deal_transaction_id' => $deal->id,
                'from_stage' => $previousStage,
                'to_stage' => $toStage,
                'actor_id' => $actor->id,
                'notes' => $notes[$toStage->value],
                'created_at' => $at,
                'po_confirmed' => $toStage === PipelineStage::Do ? true : null,
                'dp_confirmed' => $toStage === PipelineStage::Do ? true : null,
                'unit_confirmed' => $toStage === PipelineStage::Do ? true : null,
                ...($toStage === PipelineStage::Do ? DB::transaction(fn () => TransactionSnapshots::capture($deal)) : []),
            ]);

            $previousStage = $toStage;
        }
    }

    private function seedFollowUps(User $admin): void
    {
        $plans = [
            'Konfirmasi ulang jadwal test drive.',
            'Kirim simulasi kredit dengan tenor 3 tahun.',
            'Tanyakan kesiapan dokumen pembelian.',
            'Follow-up hasil negosiasi harga.',
            'Ingatkan jadwal serah terima unit.',
        ];

        foreach ($this->customers as $index => $customer) {
            if ($index % 2 !== 0) {
                continue;
            }

            $context = $this->customerContext[$customer->id];
            $sales = $context['sales'];
            $creator = $context['supervisor'] ?? $admin;

            $isOverdue = $index % 6 === 0;

            FollowUp::create([
                'customer_id' => $customer->id,
                'deal_transaction_id' => null,
                'assigned_to_id' => $sales->id,
                'created_by_id' => $creator->id,
                'scheduled_at' => $isOverdue
                    ? now()->subDays(mt_rand(1, 5))
                    : now()->addDays(mt_rand(1, 14)),
                'plan_notes' => $plans[$index % count($plans)],
                'status' => 'pending',
                'completed_at' => null,
            ]);

            if ($index % 9 === 0) {
                FollowUp::create([
                    'customer_id' => $customer->id,
                    'deal_transaction_id' => null,
                    'assigned_to_id' => $sales->id,
                    'created_by_id' => $creator->id,
                    'scheduled_at' => now()->subDays(mt_rand(7, 20)),
                    'plan_notes' => 'Follow-up sebelumnya sudah selesai.',
                    'status' => 'completed',
                    'completed_at' => now()->subDays(mt_rand(1, 6)),
                ]);
            }
        }
    }

    /**
     * @param  list<array{deal: DealTransaction, sales: User, supervisor: User|null}>  $records
     */
    private function seedComments(array $records, User $admin): void
    {
        $coachingBodies = array_slice(self::COMMENT_BODIES, 0, 4);
        $replyBodies = array_slice(self::COMMENT_BODIES, 4, 3);

        /** @var array<int, list<array{deal: DealTransaction, sales: User, supervisor: User|null}>> $byCustomer */
        $byCustomer = [];

        foreach ($records as $record) {
            $byCustomer[$record['deal']->customer_id][] = $record;
        }

        $seeded = 0;

        foreach ($byCustomer as $customerId => $customerRecords) {
            // Customer detail menampilkan komentar pada deal aktif, jadi komentar
            // ditempelkan ke deal yang sama agar terlihat saat demo.
            $record = collect($customerRecords)
                ->sortByDesc(fn (array $item): int => $item['deal']->id)
                ->sortBy(fn (array $item): int => $item['deal']->current_stage->isClosed() ? 1 : 0)
                ->first();

            $deal = $record['deal'];
            $sales = $record['sales'];
            $supervisor = $record['supervisor'] ?? $admin;
            $variant = $seeded % count($coachingBodies);

            $createdAt = $this->clamp(
                $deal->last_activity_at?->copy()->subDays(2) ?? now()->subDays(2),
                $deal->created_at ?? now()->subDays(5),
                now(),
            );

            $comment = DealComment::create([
                'deal_transaction_id' => $deal->id,
                'user_id' => $supervisor->id,
                'parent_id' => null,
                'body' => $coachingBodies[$variant],
                'edited_at' => null,
            ]);

            $comment->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();

            $repliedAt = $this->clamp($createdAt->copy()->addMinutes(mt_rand(30, 240)), $createdAt, now());

            $reply = DealComment::create([
                'deal_transaction_id' => $deal->id,
                'user_id' => $sales->id,
                'parent_id' => $comment->id,
                'body' => $replyBodies[$variant % count($replyBodies)],
                'edited_at' => null,
            ]);

            $reply->forceFill([
                'created_at' => $repliedAt,
                'updated_at' => $repliedAt,
            ])->saveQuietly();

            if ($seeded % 18 === 0) {
                $editedAt = now()->subMinutes(mt_rand(10, 40));

                $edited = DealComment::create([
                    'deal_transaction_id' => $deal->id,
                    'user_id' => $sales->id,
                    'parent_id' => null,
                    'body' => self::COMMENT_BODIES[7],
                    'edited_at' => $editedAt,
                ]);

                $edited->forceFill([
                    'created_at' => $editedAt->copy()->subMinutes(3),
                    'updated_at' => $editedAt,
                ])->saveQuietly();

                DealCommentRevision::create([
                    'deal_comment_id' => $edited->id,
                    'edited_by_id' => $sales->id,
                    'old_body' => 'Pelanggan akan test drive minggu ini.',
                    'edited_at' => $editedAt,
                ]);
            }

            $seeded++;
        }
    }

    /**
     * @param  Collection<int, User>  $allSales
     */
    private function seedTargets(User $admin, $allSales): void
    {
        $currentPeriod = now()->startOfMonth()->toDateString();
        $previousPeriod = now()->startOfMonth()->subMonth()->toDateString();

        foreach ($allSales as $index => $sales) {
            $previousUnits = 6 + ($index % 7);
            $currentUnits = 8 + ($index % 9);

            foreach ([$previousPeriod => $previousUnits, $currentPeriod => $currentUnits] as $period => $units) {
                $target = SalesTarget::create([
                    'user_id' => $sales->id,
                    'period' => $period,
                    'target_units' => $units,
                    'target_value' => $units * 250_000_000,
                    'created_by_id' => $admin->id,
                ]);

                if ($index % 4 === 0) {
                    SalesTargetRevision::create([
                        'sales_target_id' => $target->id,
                        'changed_by_id' => $admin->id,
                        'old_target_units' => max(1, $units - 3),
                        'old_target_value' => max(1, $units - 3) * 250_000_000,
                        'new_target_units' => $units,
                        'new_target_value' => $units * 250_000_000,
                    ]);
                }
            }
        }
    }

    private function seedImportBatches(Dealer $dealer, User $admin): void
    {
        $batches = [
            ['lead-november-2026.csv', 'completed', 48, 44, 4],
            ['lead-oktober-2026.csv', 'completed', 62, 60, 2],
            ['prospek-showroom.csv', 'preview', 25, 25, 0],
            ['migrasi-customer-lama.csv', 'completed', 120, 112, 8],
            ['lead-pameran.csv', 'failed', 30, 0, 30],
            ['follow-up-ulang.csv', 'completed', 18, 18, 0],
            ['data-duplikat.csv', 'preview', 12, 9, 3],
            ['lead-digital-ads.csv', 'completed', 76, 71, 5],
        ];

        foreach ($batches as $index => [$filename, $status, $total, $accepted, $rejected]) {
            $startedAt = now()->subDays(20 - $index * 2)->subMinutes(mt_rand(0, 180));

            $batch = CsvImportBatch::create([
                'dealer_id' => $dealer->id,
                'user_id' => $admin->id,
                'original_filename' => $filename,
                'file_path' => 'imports/demo/'.$filename,
                'status' => $status,
                'total_rows' => $total,
                'accepted_count' => $accepted,
                'rejected_count' => $rejected,
                'started_at' => $startedAt,
                'completed_at' => $status === 'preview' ? null : $startedAt->copy()->addMinutes(mt_rand(1, 6)),
            ]);

            $batch->forceFill([
                'created_at' => $startedAt,
                'updated_at' => $startedAt,
            ])->saveQuietly();
        }
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @param  array<int, list<User>>  $salesByTeam
     * @param  array<int, User|null>  $supervisorByTeam
     */
    private function seedNotifications(
        User $admin,
        ?User $branchManager,
        $teams,
        array $salesByTeam,
        array $supervisorByTeam,
    ): void {
        $samples = [
            ['Komentar baru pada transaksi', 'Supervisor menambahkan arahan pada pelanggan Andi Santoso.', '/transactions'],
            ['Target bulan ini diperbarui', 'Target unit tim Anda berubah menjadi 42 unit.', '/dashboard'],
            ['Import selesai', 'File lead-november-2026.csv selesai diimpor (44 baris).', '/imports'],
            ['Pelanggan stagnan', 'Ada transaksi tanpa aktivitas lebih dari 3 hari.', '/transactions'],
            ['Undangan baru', 'Undangan untuk Sales baru sudah dikirim.', '/users'],
        ];

        $recipients = [[$admin, 4]];

        if ($branchManager !== null) {
            $recipients[] = [$branchManager, 2];
        }

        foreach ($teams as $team) {
            $supervisor = $supervisorByTeam[$team->id] ?? null;

            if ($supervisor !== null) {
                $recipients[] = [$supervisor, 2];
            }

            foreach (array_slice($salesByTeam[$team->id], 0, 2) as $sales) {
                $recipients[] = [$sales, 1];
            }
        }

        foreach ($recipients as $recipientIndex => [$user, $count]) {
            for ($notificationIndex = 0; $notificationIndex < $count; $notificationIndex++) {
                $sample = $samples[($recipientIndex + $notificationIndex) % count($samples)];
                $createdAt = now()->subHours(mt_rand(1, 72));

                DB::table('notifications')->insert([
                    'id' => (string) Str::uuid(),
                    'type' => 'App\\Notifications\\DemoNotification',
                    'notifiable_type' => User::class,
                    'notifiable_id' => $user->id,
                    'data' => json_encode([
                        'title' => $sample[0],
                        'message' => $sample[1],
                        'url' => $sample[2],
                    ]),
                    'read_at' => $notificationIndex === $count - 1 && $recipientIndex % 3 === 0
                        ? $createdAt->copy()->addHours(2)
                        : null,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }

    private function seedAuditLogs(Dealer $dealer, User $admin): void
    {
        $actions = [
            'customer.created',
            'customer.reassigned',
            'deal.stage_changed',
            'target.updated',
            'user.invited',
            'import.completed',
        ];

        foreach ($this->customers as $index => $customer) {
            if ($index % 3 !== 0) {
                continue;
            }

            $log = AuditLog::create([
                'dealer_id' => $dealer->id,
                'actor_id' => $admin->id,
                'action' => $actions[$index % count($actions)],
                'subject_type' => Customer::class,
                'subject_public_id' => $customer->public_id,
                'metadata' => [
                    'customer_name' => $customer->name,
                    'source' => 'development-demo-seeder',
                ],
            ]);

            $log->forceFill([
                'created_at' => now()->subDays(mt_rand(1, 30)),
            ])->saveQuietly();
        }
    }

    /**
     * @param  Collection<int, Team>  $teams
     */
    private function seedInvitations(Dealer $dealer, User $admin, $teams): void
    {
        $invitations = [
            ['Rizky Ramadhan', 'rizkyramadhn', UserRole::Sales, 'valid'],
            ['Salsa Nabila', 'salsanabila', UserRole::Sales, 'valid'],
            ['Bayu Setiawan', 'bayusetiaw', UserRole::Supervisor, 'expired'],
            ['Mira Ayu Lestari', 'miraayules', UserRole::Sales, 'revoked'],
        ];

        foreach ($invitations as $index => [$name, $username, $role, $state]) {
            Invitation::create([
                'public_id' => (string) Str::uuid(),
                'dealer_id' => $dealer->id,
                'team_id' => $teams[$index % $teams->count()]->id,
                'invited_by_id' => $admin->id,
                'name' => $name,
                'username' => $username,
                'email' => $username.'@example.test',
                'role' => $role,
                'token_hash' => hash('sha256', Str::random(40)),
                'expires_at' => match ($state) {
                    'expired' => now()->subDays(2),
                    default => now()->addDays(3),
                },
                'accepted_at' => null,
                'revoked_at' => $state === 'revoked' ? now()->subDay() : null,
            ]);
        }
    }

    private function randomThisMonth(): CarbonInterface
    {
        $start = now('Asia/Jakarta')->startOfMonth()->utc();
        $seconds = max(1, (int) $start->diffInSeconds(now()));

        return $start->copy()->addSeconds(mt_rand(1, $seconds));
    }

    private function randomBetween(CarbonInterface $start, CarbonInterface $end): CarbonInterface
    {
        $seconds = (int) $start->diffInSeconds($end);

        if ($seconds <= 1) {
            return $end->copy();
        }

        return $start->copy()->addSeconds(mt_rand(1, $seconds));
    }

    private function clamp(CarbonInterface $value, CarbonInterface $min, CarbonInterface $max): CarbonInterface
    {
        if ($value->lt($min)) {
            return $min->copy();
        }

        if ($value->gt($max)) {
            return $max->copy();
        }

        return $value;
    }
}
