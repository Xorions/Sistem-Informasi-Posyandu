<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Examination;
use App\Models\Posyandu;
use App\Models\SpecialCareEnrollment;
use App\Models\User;
use App\Services\SpecialCareCandidateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpecialCareCandidateServiceTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyandu;
    private User $kader;
    private Child $child;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyandu = Posyandu::create([
            'kode_posyandu' => 'PSY001',
            'nama_posyandu' => 'Posyandu Kartini',
            'alamat' => 'Jl. Kartini No. 1',
        ]);

        $this->kader = User::factory()->create([
            'role' => Role::KADER->value,
        ]);
        $this->kader->posyandus()->attach($this->posyandu->id);

        $this->child = Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201010101010001',
            'nama_lengkap' => 'Anak Uji',
            'nama_panggilan' => 'Uji',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(18)->format('Y-m-d'),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Test',
            'nomor_kk' => '3201010101010002',
            'status' => 'active',
        ]);
    }

    public function test_penandaan_kandidat_wasting_dari_lila_rendah(): void
    {
        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 10.0,
            'height' => 80.0,
            'head_circumference' => 46.0,
            'arm_circumference' => 12.0, // < 12.5 cm: pemicu kandidat wasting
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status, 'Status WAJIB candidate, jangan aktif otomatis');
        $this->assertEquals($this->child->id, $enrollment->child_id);
        $this->assertStringContainsString('wasting', $enrollment->track);
        $this->assertNull($enrollment->entry_date, 'entry_date harus null sampai dikonfirmasi');
        $this->assertNull($enrollment->confirmed_by);
    }

    public function test_penandaan_kandidat_lila_sangat_rendah_memerlukan_rujukan(): void
    {
        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 9.0,
            'height' => 80.0,
            'head_circumference' => 45.0,
            'arm_circumference' => 11.0, // < 11.5 cm: pemicu rujukan nakes
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertTrue($enrollment->perlu_rujukan, 'LiLA < 11.5 wajib tandai perlu rujukan');
    }

    public function test_idempotent_tidak_membuat_kandidat_ganda_jika_sudah_ada_kandidat(): void
    {
        // Kandidat awal
        SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'perlu_rujukan' => false,
            'alasan_masuk' => 'Pemeriksaan sebelumnya',
        ]);

        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 8.0,
            'height' => 75.0,
            'arm_circumference' => 11.2,
        ]);

        $service = app(SpecialCareCandidateService::class);
        $result = $service->evaluate($exam);

        $this->assertNull($result);
        $this->assertEquals(1, SpecialCareEnrollment::where('child_id', $this->child->id)->count(), 'Tidak boleh ada duplikat kandidat');
    }

    public function test_idempotent_tidak_membuat_kandidat_jika_anak_sudah_berstatus_aktif(): void
    {
        // Enrollment aktif
        SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'perlu_rujukan' => false,
            'alasan_masuk' => 'Sudah dalam intervensi',
            'entry_date' => now()->subDays(30)->toDateString(),
        ]);

        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 8.5,
            'height' => 76.0,
            'arm_circumference' => 11.8,
        ]);

        $service = app(SpecialCareCandidateService::class);
        $result = $service->evaluate($exam);

        $this->assertNull($result);
        $this->assertEquals(1, SpecialCareEnrollment::where('child_id', $this->child->id)->count(), 'Anak aktif tidak boleh dibuatkan kandidat baru');
    }

    public function test_pemeriksaan_anak_sehat_tidak_menghasilkan_kandidat(): void
    {
        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        // Pertumbuhan normal sesuai usia 18 bulan
        $exam->growthRecord()->create([
            'weight' => 11.0,
            'height' => 82.0,
            'head_circumference' => 47.0,
            'arm_circumference' => 15.0, // normal (> 12.5)
        ]);

        $service = app(SpecialCareCandidateService::class);
        $result = $service->evaluate($exam);

        $this->assertNull($result);
        $this->assertEquals(0, SpecialCareEnrollment::where('child_id', $this->child->id)->count());
    }

    public function test_menyimpan_pemeriksaan_otomatis_memicu_evaluasi_kandidat(): void
    {
        $token = $this->kader->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/examinations', [
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->format('Y-m-d'),
                'weight' => 9.5,
                'height' => 78.0,
                'head_circumference' => 45.0,
                'arm_circumference' => 11.9, // < 12.5 cm
            ]);

        $response->assertStatus(201);

        $candidate = SpecialCareEnrollment::where('child_id', $this->child->id)->first();
        $this->assertNotNull($candidate);
        $this->assertEquals('candidate', $candidate->status);
        $this->assertEquals('wasting', $candidate->track);
        $this->assertStringContainsString('11.9', $candidate->alasan_masuk);
    }

    public function test_bayi_di_bawah_6_bulan_ditandai_perlu_tinjauan_bidan_dan_konseling_asi(): void
    {
        $infant4m = Child::create([
            'nik' => '3201010101990044',
            'nama_lengkap' => 'Bayi ASI 4 Bulan',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(4)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Kenanga',
            'posyandu_id' => $this->posyandu->id,
            'status' => 'active',
        ]);

        $exam = Examination::create([
            'child_id' => $infant4m->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->format('Y-m-d'),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 2.0, // Defisit berat badan
            'height' => 60.0,
            'head_circumference' => 40.0,
            'arm_circumference' => 10.0,
        ]);

        $service = app(SpecialCareCandidateService::class);
        $candidate = $service->evaluate($exam);

        $this->assertNotNull($candidate);
        $this->assertTrue($candidate->perlu_rujukan);
        $this->assertStringContainsString('Perlu ditinjau bidan', $candidate->alasan_masuk);
        $this->assertStringContainsString('Konseling ASI Eksklusif & Rujukan Faskes, Tanpa PMT', $candidate->alasan_masuk);
        $this->assertContains('weight', $candidate->trigger_indicators);
    }

    public function test_saat_evaluasi_kandidat_gagal_pemeriksaan_tetap_tersimpan_sukses(): void
    {
        $mock = $this->createMock(SpecialCareCandidateService::class);
        $mock->method('evaluate')->willThrowException(new \RuntimeException('Simulasi kegagalan evaluasi'));
        $this->app->instance(SpecialCareCandidateService::class, $mock);

        $token = $this->kader->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/examinations', [
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->format('Y-m-d'),
                'weight' => 9.5,
                'height' => 78.0,
                'head_circumference' => 45.0,
                'arm_circumference' => 11.9,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'status' => 'active',
        ]);
    }

    public function test_pembatalan_pemeriksaan_membatalkan_kandidat_terkait(): void
    {
        $token = $this->kader->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/examinations', [
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->format('Y-m-d'),
                'weight' => 9.5,
                'height' => 78.0,
                'head_circumference' => 45.0,
                'arm_circumference' => 11.9,
            ]);

        $examId = $response->json('data.id');
        $candidate = SpecialCareEnrollment::where('child_id', $this->child->id)->first();
        $this->assertEquals('candidate', $candidate->status);

        // Void the examination (hanya ADMIN yang berhak delete/void per ExaminationPolicy)
        $admin = User::create([
            'name' => 'Admin Posyandu',
            'email' => 'admin.' . uniqid() . '@posyandu.test',
            'password' => bcrypt('password123'),
            'role' => Role::ADMIN->value,
        ]);

        $voidResponse = $this->actingAs($admin)
            ->deleteJson("/api/examinations/{$examId}", [
                'void_reason' => 'Salah input data anak',
            ]);

        $voidResponse->assertOk();
        $candidate->refresh();
        $this->assertEquals('cancelled', $candidate->status);
        $this->assertStringContainsString('dibatalkan', $candidate->alasan_keluar);
    }

    public function test_catatan_edema_otomatis_memicu_kandidat_dan_rujukan_segera(): void
    {
        $token = $this->kader->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/examinations', [
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->format('Y-m-d'),
                'weight' => 12.0, // Berat normal
                'height' => 88.0, // Tinggi normal
                'head_circumference' => 47.0,
                'arm_circumference' => 14.0, // LiLA normal
                'notes' => 'Terdapat tanda edema bilateral pada kedua tungkai kaki anak',
            ]);

        $response->assertCreated();

        $candidate = SpecialCareEnrollment::where('child_id', $this->child->id)->first();
        $this->assertNotNull($candidate);
        $this->assertTrue($candidate->perlu_rujukan);
        $this->assertContains('edema', $candidate->trigger_indicators);
        $this->assertStringContainsString('edema', $candidate->alasan_masuk);
    }
}
