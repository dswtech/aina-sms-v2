<?php

namespace Tests\Feature\Settings;

use App\Models\AuditLog;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UsernameChangeTest extends TestCase
{
    use RefreshDatabase;

    private function change(User $user, string $username)
    {
        return $this->actingAs($user)->patch(route('profile.username.update'), ['username' => $username]);
    }

    public function test_user_can_change_username_once(): void
    {
        $user = User::factory()->create(['username' => 'oldname1']);

        $this->change($user, '  BudiSantoso ')
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertSame('budisantoso', $user->username);
        $this->assertNotNull($user->username_changed_at);
        $this->assertTrue(DB::table('username_reservations')->where('username', 'oldname1')->exists());

        $log = AuditLog::query()->where('action', 'user.username_changed')->sole();
        $this->assertSame('oldname1', $log->metadata['before']['username']);
        $this->assertSame('budisantoso', $log->metadata['after']['username']);
    }

    public function test_second_change_is_rejected(): void
    {
        $user = User::factory()->create(['username' => 'firstname1', 'username_changed_at' => now()]);

        $this->change($user, 'another1')->assertSessionHasErrors('username');

        $this->assertSame('firstname1', $user->refresh()->username);
    }

    /** @return array<string, array{string}> */
    public static function invalidUsernames(): array
    {
        return [
            'too short' => ['abcde'],
            'too long' => ['abcdefghijklm'],
            'starts with digit' => ['1abcdef'],
            'symbol' => ['abc_def1'],
            'banned word inside' => ['myaina123'],
        ];
    }

    #[DataProvider('invalidUsernames')]
    public function test_invalid_usernames_are_rejected(string $username): void
    {
        $user = User::factory()->create(['username' => 'oldname1']);

        $this->change($user, $username)->assertSessionHasErrors('username');

        $user->refresh();
        $this->assertSame('oldname1', $user->username);
        $this->assertNull($user->username_changed_at);
    }

    public function test_current_username_is_rejected(): void
    {
        $user = User::factory()->create(['username' => 'oldname1']);

        $this->change($user, 'OldName1')->assertSessionHasErrors('username');

        $this->assertNull($user->refresh()->username_changed_at);
    }

    public function test_taken_names_are_rejected(): void
    {
        $user = User::factory()->create(['username' => 'oldname1']);
        User::factory()->create(['username' => 'usedname1']);
        DB::table('username_reservations')->insert(['username' => 'heldname1']);
        Invitation::factory()->create(['username' => 'pendname1']);

        foreach (['usedname1', 'heldname1', 'pendname1'] as $taken) {
            $this->change($user, $taken)->assertSessionHasErrors('username');
        }

        $this->assertNull($user->refresh()->username_changed_at);
    }

    public function test_old_name_cannot_be_taken_by_another_user(): void
    {
        $first = User::factory()->create(['username' => 'oldname1']);
        $second = User::factory()->create(['username' => 'second01']);

        $this->change($first, 'newname01')->assertSessionHasNoErrors();
        $this->change($second, 'oldname1')->assertSessionHasErrors('username');

        $this->assertSame('second01', $second->refresh()->username);
    }

    public function test_unique_index_race_returns_validation_error(): void
    {
        $user = User::factory()->create(['username' => 'oldname1']);
        // Validation passes, then another account takes the name just before this one saves.
        $raced = false;
        User::updating(function () use (&$raced) {
            if (! $raced) {
                $raced = true;
                User::factory()->create(['username' => 'racename1']);
            }
        });

        $this->change($user, 'racename1')->assertSessionHasErrors('username');
        $this->assertTrue($raced);

        $this->assertNull($user->refresh()->username_changed_at);
    }

    public function test_profile_page_reports_username_lock(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page->where('usernameLocked', false));

        $user->forceFill(['username_changed_at' => now()])->save();

        $this->actingAs($user)->get(route('profile.edit'))
            ->assertInertia(fn (Assert $page) => $page->where('usernameLocked', true));
    }
}
