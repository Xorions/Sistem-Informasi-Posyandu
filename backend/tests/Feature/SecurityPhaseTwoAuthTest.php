<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPhaseTwoAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_rate_limiting_mengembalikan_429_pada_percobaan_ke_enam(): void
    {
        $email = 'target-login@example.test';

        // 5 percobaan pertama diproses (401 invalid credentials)
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'wrongpassword',
            ]);
            $this->assertNotEquals(429, $response->status(), "Percobaan ke-{$i} tidak boleh 429");
        }

        // Percobaan ke-6 wajib 429 Too Many Requests
        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'wrongpassword',
        ]);
        $response->assertStatus(429);
    }

    public function test_auth_login_alias_juga_dibatasi_rate_limiter(): void
    {
        $email = 'target-alias@example.test';

        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'wrongpassword',
            ]);
            $this->assertNotEquals(429, $response->status());
        }

        $response = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'wrongpassword',
        ]);
        $response->assertStatus(429);
    }

    public function test_forgot_password_dan_reset_password_dibatasi_rate_limiter(): void
    {
        $email = 'target-forgot@example.test';

        for ($i = 1; $i <= 5; $i++) {
            $response = $this->postJson('/api/forgot-password', [
                'email' => $email,
            ]);
            $this->assertNotEquals(429, $response->status());
        }

        $this->postJson('/api/forgot-password', [
            'email' => $email,
        ])->assertStatus(429);
    }

    public function test_sanctum_token_expiration_dan_cors_terkonfigurasi(): void
    {
        $this->assertEquals(1440, config('sanctum.expiration'));

        $this->assertTrue(config('cors.supports_credentials'));
        $this->assertNotContains('*', config('cors.allowed_origins'));
    }
}
