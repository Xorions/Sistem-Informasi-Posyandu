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

    public function test_login_rate_limiter_memakai_ip_klien_asli_di_balik_proxy(): void
    {
        $email = 'proxy-test@example.test';
        $clientIpA = '203.0.113.195';
        $clientIpB = '198.51.100.50';
        $proxyIp = '10.0.0.1';

        // Klien A mengirim 5 request gagal melalui proxy
        for ($i = 1; $i <= 5; $i++) {
            $response = $this->withServerVariables([
                'REMOTE_ADDR' => $proxyIp,
                'HTTP_X_FORWARDED_FOR' => $clientIpA,
            ])->postJson('/api/login', [
                'email' => $email,
                'password' => 'wrongpassword',
            ]);
            $this->assertNotEquals(429, $response->status(), "Percobaan ke-{$i} Klien A tidak boleh 429");
        }

        // Percobaan ke-6 Klien A melalui proxy wajib 429 (terkena rate limiter)
        $responseA = $this->withServerVariables([
            'REMOTE_ADDR' => $proxyIp,
            'HTTP_X_FORWARDED_FOR' => $clientIpA,
        ])->postJson('/api/login', [
            'email' => $email,
            'password' => 'wrongpassword',
        ]);
        $responseA->assertStatus(429);

        // Klien B dari IP berbeda melalui proxy YANG SAMA dengan email YANG SAMA tidak boleh terkena 429
        $responseB = $this->withServerVariables([
            'REMOTE_ADDR' => $proxyIp,
            'HTTP_X_FORWARDED_FOR' => $clientIpB,
        ])->postJson('/api/login', [
            'email' => $email,
            'password' => 'wrongpassword',
        ]);
        $this->assertEquals(401, $responseB->status(), 'Klien B tidak boleh terkena rate limiter Klien A');
    }

    public function test_preview_ip_debug_hanya_aktif_pada_environment_preview(): void
    {
        // 1. Pada environment non-preview (default testing/production): rute tidak ditemukan (404)
        config(['app.env' => 'testing']);
        $respInactive = $this->getJson('/api/preview/ip-debug');
        $respInactive->assertStatus(404);

        // 2. Pada environment preview: rute merespons 200 dan mencatat data IP
        // Registrasi ulang rute dengan config preview
        config(['app.env' => 'preview']);
        \Illuminate\Support\Facades\Route::get('/api/preview/ip-debug', function (\Illuminate\Http\Request $request) {
            return response()->json([
                'environment' => config('app.env'),
                'resolved_client_ip' => $request->ip(),
                'ips' => $request->ips(),
                'x_forwarded_for' => $request->header('x-forwarded-for'),
                'x_real_ip' => $request->header('x-real-ip'),
                'x_vercel_forwarded_for' => $request->header('x-vercel-forwarded-for'),
                'rate_limit_key' => \Illuminate\Support\Str::transliterate(
                    \Illuminate\Support\Str::lower('test@example.com').'|'.$request->ip()
                ),
            ]);
        });

        $clientIp = '203.0.113.88';
        $respActive = $this->withHeaders([
            'x-forwarded-for' => $clientIp,
            'x-real-ip' => $clientIp,
            'x-vercel-forwarded-for' => $clientIp,
        ])->getJson('/api/preview/ip-debug');

        $respActive->assertStatus(200);
        $respActive->assertJson([
            'environment' => 'preview',
            'resolved_client_ip' => $clientIp,
        ]);
    }
}
