<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Posyandu;
use App\Models\SpecialCareEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpecialCareModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_special_care_enrollment_relations_and_scopes(): void
    {
        $posyandu = Posyandu::create([
            'kode_posyandu' => 'PSYTEST',
            'nama_posyandu' => 'Posyandu Test',
            'alamat' => 'Jl. Test No. 1',
        ]);

        $child = Child::create([
            'posyandu_id' => $posyandu->id,
            'nik' => '3201010101010001',
            'nama_lengkap' => 'Anak Test',
            'nama_panggilan' => 'Test',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => '2024-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Test',
            'nomor_kk' => '3201010101010002',
            'status' => 'active',
        ]);

        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $child->id,
            'posyandu_id' => $posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'perlu_rujukan' => true,
            'alasan_masuk' => 'BB/PB-TB <-2 SD, LiLA 11.8 cm',
            'entry_date' => '2026-01-01',
        ]);

        // Verifikasi relasi
        $this->assertEquals($child->id, $enrollment->child->id);
        $this->assertEquals($posyandu->id, $enrollment->posyandu->id);
        $this->assertTrue($enrollment->isActive());
        $this->assertTrue($enrollment->perlu_rujukan);

        // Verifikasi relasi dan scope Child
        $this->assertCount(1, $child->enrollments);
        $this->assertNotNull($child->activeEnrollment);
        $this->assertEquals($enrollment->id, $child->activeEnrollment->id);

        $activeChildren = Child::withActiveEnrollment()->get();
        $this->assertCount(1, $activeChildren);
        $this->assertEquals($child->id, $activeChildren->first()->id);

        // Verifikasi scope forUser
        $admin = User::factory()->create(['role' => Role::ADMIN->value]);
        $kader = User::factory()->create(['role' => Role::KADER->value]);
        $kader->posyandus()->attach($posyandu->id);

        $kaderOther = User::factory()->create(['role' => Role::KADER->value]);

        $this->assertCount(1, SpecialCareEnrollment::forUser($admin)->get());
        $this->assertCount(1, SpecialCareEnrollment::forUser($kader)->get());
        $this->assertCount(0, SpecialCareEnrollment::forUser($kaderOther)->get());
    }
}
