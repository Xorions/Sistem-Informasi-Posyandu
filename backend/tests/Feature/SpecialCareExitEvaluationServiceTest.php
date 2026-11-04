<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Examination;
use App\Models\Posyandu;
use App\Models\SpecialCareEnrollment;
use App\Models\User;
use App\Services\SpecialCareExitEvaluationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class SpecialCareExitEvaluationServiceTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyandu;
    private User $kader;
    private Child $child;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyandu = Posyandu::create([
            'kode_posyandu' => 'PSY002',
            'nama_posyandu' => 'Posyandu Kartini',
            'alamat' => 'Jl. Kartini No. 2',
        ]);

        $this->kader = User::factory()->create([
            'role' => Role::KADER->value,
        ]);
        $this->kader->posyandus()->attach($this->posyandu->id);

        $this->child = Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201010101010003',
            'nama_lengkap' => 'Anak Evaluasi',
            'nama_panggilan' => 'Eval',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => now()->subMonths(20)->format('Y-m-d'),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Kartini No. 3',
            'nomor_kk' => '3201010101010004',
            'status' => 'active',
        ]);
    }

    public function test_peserta_belum_aktif_tidak_layak_usulan_keluar(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'Kandidat wasting',
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertFalse($result['eligible']);
        $this->assertContains('Enrollment tidak berstatus aktif.', $result['blockers']);
    }

    public function test_peserta_durasi_kurang_dari_90_hari_belum_layak(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'alasan_masuk' => 'Wasting',
            'entry_date' => now()->subDays(45)->toDateString(),
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertFalse($result['eligible']);
        $this->assertFalse($result['duration_met']);
        $this->assertEquals(45, $result['days_in_program']);
        $this->assertEquals(90, $result['min_duration_days']);
    }

    public function test_peserta_memenuhi_90_hari_tapi_pemeriksaan_belum_pulih_belum_layak(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'alasan_masuk' => 'Wasting',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Pemeriksaan terakhir LiLA masih rendah (< 12.5 cm)
        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(5)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 9.0,
            'height' => 82.0,
            'arm_circumference' => 12.0, // Belum pulih (< 12.5)
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertFalse($result['recoveries_met']);
        $this->assertFalse($result['eligible']);
        $this->assertEquals(0, $result['consecutive_recoveries']);
    }

    public function test_peserta_memenuhi_90_hari_dan_2_pemeriksaan_berturut_turut_pulih_menghasilkan_usulan_layak(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'alasan_masuk' => 'Wasting',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Pemeriksaan 1 (30 hari lalu): Pulih
        $exam1 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(30)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create([
            'weight' => 11.0,
            'height' => 83.0,
            'arm_circumference' => 13.0, // >= 12.5 cm
        ]);

        // Pemeriksaan 2 (5 hari lalu): Pulih
        $exam2 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(5)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create([
            'weight' => 11.2,
            'height' => 84.0,
            'arm_circumference' => 13.2, // >= 12.5 cm
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertTrue($result['recoveries_met']);
        $this->assertTrue($result['eligible'], 'Harus menghasilkan usulan layak keluar');
        $this->assertEquals(2, $result['consecutive_recoveries']);
        $this->assertEquals($exam2->id, $result['latest_examination_id']);
        $this->assertEquals(now()->subDays(5)->format('Y-m-d'), $result['suggested_exit_date']);

        // Pastikan status di database TIDAK berubah (hanya usulan)
        $fresh = $enrollment->fresh();
        $this->assertEquals('active', $fresh->status, 'Evaluasi keluar HANYA usulan, dilarang mengubah status database');
    }

    public function test_pemeriksaan_hanya_satu_yang_pulih_belum_mencapai_target_2_kali(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'status' => 'active',
            'alasan_masuk' => 'Wasting',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Pemeriksaan 1 (30 hari lalu): Belum pulih
        $exam1 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(30)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create([
            'weight' => 9.0,
            'height' => 82.0,
            'arm_circumference' => 12.0, // < 12.5
        ]);

        // Pemeriksaan 2 (5 hari lalu): Pulih
        $exam2 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(5)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create([
            'weight' => 11.0,
            'height' => 84.0,
            'arm_circumference' => 13.0, // >= 12.5
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertFalse($result['recoveries_met']);
        $this->assertFalse($result['eligible']);
        $this->assertEquals(1, $result['consecutive_recoveries']);
    }

    public function test_jalur_stunting_murni_memerlukan_tinjauan_manual_tanpa_usulan_otomatis(): void
    {
        Config::set('special_care.stunting.auto_exit', false);

        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'stunting',
            'status' => 'active',
            'alasan_masuk' => 'Stunting',
            'entry_date' => now()->subDays(100)->toDateString(),
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertFalse($result['eligible'], 'Jalur stunting tidak ada usulan keluar otomatis');
        $this->assertStringContainsString('evaluasi klinis langsung', $result['blockers'][0]);
    }

    public function test_kombinasi_masuk_karena_lila_saja_lulus_jika_lila_pulih_walau_bb_belum_pulih(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'trigger_indicators' => ['lila'],
            'status' => 'active',
            'alasan_masuk' => 'LiLA 12.0 cm (< 12.5 cm)',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Dua pemeriksaan dengan LiLA pulih (13.0 cm), tetapi BB rendah (6.0 kg)
        for ($i = 2; $i >= 1; $i--) {
            $exam = Examination::create([
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->subDays($i * 10)->toDateString(),
                'examiner_id' => $this->kader->id,
                'status' => 'active',
            ]);
            $exam->growthRecord()->create([
                'weight' => 6.0, // BB belum pulih
                'height' => 80.0,
                'arm_circumference' => 13.0, // LiLA pulih >= 12.5 cm
            ]);
        }

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertTrue($result['recoveries_met'], 'Peserta masuk karena LiLA saja cukup memenuhi pemulihan LiLA');
        $this->assertTrue($result['eligible']);
    }

    public function test_kombinasi_masuk_karena_bb_saja_lulus_jika_bb_pulih_walau_lila_belum_pulih(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'trigger_indicators' => ['weight'],
            'status' => 'active',
            'alasan_masuk' => 'Berat badan rendah',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Dua pemeriksaan dengan BB normal (11.0 kg), tetapi LiLA < 12.5 cm (12.0 cm)
        for ($i = 2; $i >= 1; $i--) {
            $exam = Examination::create([
                'child_id' => $this->child->id,
                'posyandu_id' => $this->posyandu->id,
                'examination_date' => now()->subDays($i * 10)->toDateString(),
                'examiner_id' => $this->kader->id,
                'status' => 'active',
            ]);
            $exam->growthRecord()->create([
                'weight' => 11.0, // BB pulih
                'height' => 84.0,
                'arm_circumference' => 12.0, // LiLA masih rendah
            ]);
        }

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertTrue($result['recoveries_met'], 'Peserta masuk karena BB saja cukup memenuhi pemulihan BB');
        $this->assertTrue($result['eligible']);
    }

    public function test_kombinasi_masuk_karena_keduanya_wajib_memenuhi_keduanya_untuk_lulus(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'track' => 'wasting',
            'trigger_indicators' => ['lila', 'weight'],
            'status' => 'active',
            'alasan_masuk' => 'LiLA dan BB rendah',
            'entry_date' => now()->subDays(95)->toDateString(),
        ]);

        // Skenario A: Hanya LiLA pulih, BB belum -> TIDAK LULUS
        $examA1 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(20)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $examA1->growthRecord()->create([
            'weight' => 6.0, // Belum pulih
            'height' => 80.0,
            'arm_circumference' => 13.0, // Pulih
        ]);

        $examA2 = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->subDays(5)->toDateString(),
            'examiner_id' => $this->kader->id,
            'status' => 'active',
        ]);
        $examA2->growthRecord()->create([
            'weight' => 6.0, // Belum pulih
            'height' => 80.0,
            'arm_circumference' => 13.0, // Pulih
        ]);

        $service = app(SpecialCareExitEvaluationService::class);
        $resultFail = $service->evaluate($enrollment);
        $this->assertFalse($resultFail['recoveries_met'], 'Jika masuk karena keduanya, pulih LiLA saja belum cukup');

        // Skenario B: Keduanya pulih -> LULUS
        $examA1->growthRecord()->update(['weight' => 11.0]);
        $examA2->growthRecord()->update(['weight' => 11.0]);

        $resultSuccess = $service->evaluate($enrollment);
        $this->assertTrue($resultSuccess['recoveries_met'], 'Jika masuk karena keduanya dan keduanya pulih, memenuhi syarat');
        $this->assertTrue($resultSuccess['eligible']);
    }
}
