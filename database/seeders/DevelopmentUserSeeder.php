<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Support\UsernameGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DevelopmentUserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        DB::table('users')->where('role', 'dealer_admin')->update(['role' => UserRole::Admin->value]);
        DB::table('users')->where('role', 'sales_supervisor')->update(['role' => UserRole::Supervisor->value]);

        $password = Hash::make('password');
        $dealer = Dealer::query()->firstOrCreate(
            ['name' => 'AINA Development Dealer'],
            [
                'public_id' => (string) Str::uuid(),
                'timezone' => 'Asia/Jakarta',
                'is_active' => true,
            ],
        );

        $admin = $this->upsertUser([
            'name' => 'Super Hero',
            'username' => 'superhero',
            'role' => UserRole::Admin,
        ], $password, $dealer->id);

        $this->upsertUser([
            'name' => 'Bima Pratama',
            'username' => UsernameGenerator::fromName('Bima Pratama'),
            'role' => UserRole::BranchManager,
        ], $password, $dealer->id);

        $teams = [
            [
                'supervisor' => 'Ari Ina',
                'sales' => [
                    'Dhany Seskoadi Wibawa',
                    'Sari Nabila Putri',
                    'Fajar Aditya Nugraha',
                    'Nanda Prameswari Utami',
                    'Reza Mahendra Saputra',
                    'Intan Ayu Permata',
                    'Dimas Arga Prakoso',
                    'Laila Nur Azzahra',
                ],
            ],
            [
                'supervisor' => 'Maya Lestari',
                'sales' => [
                    'Bagus Rama Santoso',
                    'Citra Dewi Anggraini',
                    'Eko Budi Hartono',
                    'Gita Laras Maharani',
                    'Hendra Jaya Kusuma',
                    'Kania Putri Ramadhani',
                    'Lukman Hakim Prasetyo',
                    'Nadia Safira Anindita',
                ],
            ],
            [
                'supervisor' => 'Rizky Pranata',
                'sales' => [
                    'Andi Surya Wijaya',
                    'Bella Kirana Sari',
                    'Yoga Dwi Kurniawan',
                    'Rani Puspita Dewi',
                    'Taufik Hidayat Ramadhan',
                    'Vina Melati Putri',
                    'Wahyu Adi Setiawan',
                    'Zahra Niken Larasati',
                ],
            ],
        ];

        foreach ($teams as $team) {
            $supervisorName = $team['supervisor'];
            $teamModel = Team::query()->firstOrCreate(
                [
                    'dealer_id' => $dealer->id,
                    'name' => 'Tim '.$supervisorName,
                ],
                [
                    'public_id' => (string) Str::uuid(),
                    'is_active' => true,
                ],
            );
            $supervisor = $this->upsertUser([
                'name' => $supervisorName,
                'username' => UsernameGenerator::fromName($supervisorName),
                'role' => UserRole::Supervisor,
            ], $password, $dealer->id);
            $this->upsertMembership($teamModel, $supervisor, UserRole::Supervisor, $admin);

            foreach ($team['sales'] as $salesName) {
                $sales = $this->upsertUser([
                    'name' => $salesName,
                    'username' => UsernameGenerator::fromName($salesName),
                    'role' => UserRole::Sales,
                ], $password, $dealer->id);
                $this->upsertMembership($teamModel, $sales, UserRole::Sales, $admin);
            }
        }
    }

    /**
     * @param  array{name: string, username: string, role: UserRole}  $account
     */
    private function upsertUser(array $account, string $password, int $dealerId): User
    {
        $user = User::query()->firstOrNew(['username' => $account['username']]);
        $user->public_id ??= (string) Str::uuid();
        $user->fill([
            'dealer_id' => $dealerId,
            'name' => $account['name'],
            'email' => $account['username'].'@aina.test',
            'email_verified_at' => now(),
            'password' => $password,
            'role' => $account['role'],
            'is_active' => true,
            'supervisor_id' => null,
        ])->save();

        return $user;
    }

    private function upsertMembership(Team $team, User $user, UserRole $role, User $admin): void
    {
        TeamMembership::query()->firstOrCreate(
            [
                'team_id' => $team->id,
                'user_id' => $user->id,
                'ended_at' => null,
            ],
            [
                'role' => $role,
                'assigned_by_id' => $admin->id,
                'started_at' => now(),
            ],
        );
    }
}
