<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PingDbTest extends TestCase
{
    public function test_ping_db_returns_success_when_database_is_reachable(): void
    {
        $response = $this->getJson('/api/ping-db');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'OK',
                'data' => [
                    'database' => 'connected',
                ],
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'database',
                    'timestamp',
                ],
            ]);
    }

    public function test_ping_db_returns_500_without_exposing_exception_when_db_fails(): void
    {
        DB::shouldReceive('select')
            ->once()
            ->with('SELECT 1')
            ->andThrow(new \Exception('SQLSTATE[08006] Connection rejected to secret.supabase.co:5432'));

        $response = $this->getJson('/api/ping-db');

        $response->assertStatus(500)
            ->assertExactJson([
                'success' => false,
                'message' => 'Database unavailable',
            ]);
    }
}
