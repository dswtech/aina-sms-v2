<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;

class PublicRegistrationDisabledTest extends TestCase
{
    public function test_public_registration_routes_are_disabled(): void
    {
        $this->get('/register')->assertNotFound();

        $this->post('/register', [
            'name' => 'Example User',
            'email' => 'example@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertNotFound();
    }
}
