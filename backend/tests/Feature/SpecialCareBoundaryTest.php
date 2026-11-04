<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Examination;
use App\Models\GrowthRecord;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\SpecialCareEnrollment;
use App\Models\User;
use App\Services\GrowthAnalysisService;
use App\Services\SpecialCareCandidateService;
use App\Services\SpecialCareExitEvaluationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpecialCareBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyanduA;
    private Posyandu $posyanduB;
    private User $admin;
    private User $kaderA;
    private User $kaderB;
    private User $parentUser;
    private Child $childA;
    private Child $childB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyanduA = Posyandu::create([
            'kode_posyandu' => 'PSYA',
            'nama_posyandu' => 'Posyandu Melati',
            'alamat' => 'Jl. Melati No. 1',
        ]);

        $this->posyanduB = Posyandu::create([
            'kode_posyandu' => 'PSYB',
            'nama_posyandu' => 'Posyandu Mawar',
            'alamat' => 'Jl. Mawar No. 2',
        ]);

        $this->admin = User::factory()->create([
            'role' => Role::ADMIN->value,
        ]);

        $this->kaderA = User::factory()->create([
            'role' => Role::KADER->value,
        ]);
        $this->kaderA->posyandus()->attach($this->posyanduA->id);

        $this->kaderB = User::factory()->create([
            'role' => Role::KADER->value,
        ]);
        $this->kaderB->posyandus()->attach($this->posyanduB->id);

        $parent = ParentModel::create([
            'nama_lengkap' => 'Ibu Rahma',
            'jenis_kelamin' => 'P',
            'nik' => '3201015501800099',
            'nomor_telepon' => '081234567899',
            'alamat' => 'Jl. Kampung Melati',
        ]);

        $this->parentUser = User::factory()->create([
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $parent->id,
        ]);

        $this->childA = Child::create([
            'nik' => '3201010101220091',
            'nama_lengkap' => 'Anak Kandung Rahma',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(18)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Kampung Melati',
            'posyandu_id' => $this->posyanduA->id,
            'status' => 'active',
        ]);
        $this->childA->parents()->attach($parent->id, ['relationship' => 'Ibu', 'is_primary_contact' => true]);

        $this->childB = Child::create([
            'nik' => '3201010101220092',
            'nama_lengkap' => 'Anak Posyandu B',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => now()->subMonths(18)->toDateString(),
            'jenis_kelamin' => 'P',
            'alamat' => 'Jl. Kampung Mawar',
            'posyandu_id' => $this->posyanduB->id,
            'status' => 'active',
        ]);
    }

    // =========================================================================
    // 1. KASUS BATAS LiLA: Tepat 12.5 cm vs 12.4 cm (Candidate Cutoff)
    // =========================================================================

    public function test_kasus_batas_lila_tepat_12_5_cm_tidak_masuk_kandidat(): void
    {
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 11.0,
            'height' => 82.0,
            'arm_circumference' => 12.5, // Tepat batas aman (>= 12.5 cm bukan kandidat)
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNull($enrollment, 'LiLA tepat 12.5 cm tidak boleh masuk kandidat');
    }

    public function test_kasus_batas_lila_12_4_cm_masuk_kandidat_tanpa_rujukan(): void
    {
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 10.5,
            'height' => 82.0,
            'arm_circumference' => 12.4, // < 12.5 cm: pemicu kandidat
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertEquals('wasting', $enrollment->track);
        $this->assertFalse($enrollment->perlu_rujukan, 'LiLA 12.4 cm belum perlu rujukan ke nakes');
    }

    // =========================================================================
    // 2. KASUS BATAS LiLA: Tepat 11.5 cm vs 11.4 cm (Referral Cutoff)
    // =========================================================================

    public function test_kasus_batas_lila_tepat_11_5_cm_kandidat_tanpa_rujukan_otomatis(): void
    {
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 9.5,
            'height' => 80.0,
            'arm_circumference' => 11.5, // < 12.5 cm (kandidat), tapi belum < 11.5 cm (tanpa rujukan otomatis)
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertFalse($enrollment->perlu_rujukan, 'LiLA tepat 11.5 cm belum menandai perlu rujukan (< 11.5)');
    }

    public function test_kasus_batas_lila_11_4_cm_kandidat_dengan_rujukan_segera(): void
    {
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 9.0,
            'height' => 80.0,
            'arm_circumference' => 11.4, // < 11.5 cm: pemicu rujukan nakes
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertTrue($enrollment->perlu_rujukan, 'LiLA 11.4 cm (< 11.5 cm) WAJIB menandai rujukan nakes');
    }

    // =========================================================================
    // 3. KASUS BATAS USIA: Usia 5 Bulan vs 6 Bulan (Validitas LiLA)
    // =========================================================================

    public function test_kasus_batas_usia_5_bulan_lila_rendah_diabaikan(): void
    {
        // Anak berusia tepat 5 bulan
        $infant5m = Child::create([
            'nik' => '3201010101220055',
            'nama_lengkap' => 'Bayi Lima Bulan',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(5)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Melati',
            'posyandu_id' => $this->posyanduA->id,
            'status' => 'active',
        ]);

        $exam = Examination::create([
            'child_id' => $infant5m->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 7.0,
            'height' => 64.0,
            'arm_circumference' => 11.0, // < 11.5 cm, tetapi usia < 6 bulan -> LiLA tidak valid
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        // Pertumbuhan BB/TB normal pada umur 5 bulan, LiLA tidak boleh memicu kandidat
        $this->assertNull($enrollment, 'LiLA anak di bawah 6 bulan tidak boleh memicu kandidat');
    }

    public function test_kasus_batas_usia_6_bulan_lila_rendah_mulai_berlaku(): void
    {
        // Anak berusia tepat 6 bulan
        $infant6m = Child::create([
            'nik' => '3201010101220066',
            'nama_lengkap' => 'Bayi Enam Bulan',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(6)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Melati',
            'posyandu_id' => $this->posyanduA->id,
            'status' => 'active',
        ]);

        $exam = Examination::create([
            'child_id' => $infant6m->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 7.5,
            'height' => 66.0,
            'arm_circumference' => 11.2, // < 11.5 cm pada usia 6 bulan -> pemicu wasting & rujukan
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment, 'Usia 6 bulan LiLA mulai valid dan memicu kandidat');
        $this->assertEquals('wasting', $enrollment->track);
        $this->assertTrue($enrollment->perlu_rujukan);
    }

    public function test_kasus_batas_bayi_dibawah_6_bulan_berat_kurang_otomatis_perlu_rujukan(): void
    {
        // Bayi usia 4 bulan mengalami defisit berat badan berat
        $infant4m = Child::create([
            'nik' => '3201010101220044',
            'nama_lengkap' => 'Bayi Empat Bulan',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(4)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Melati',
            'posyandu_id' => $this->posyanduA->id,
            'status' => 'active',
        ]);

        $exam = Examination::create([
            'child_id' => $infant4m->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 1.8, // Defisit berat badan nyata (< 2.5 * 0.85 kg) untuk usia 4 bulan
            'height' => 60.0,
            'arm_circumference' => 10.0,
        ]);

        $service = app(SpecialCareCandidateService::class);
        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertTrue($enrollment->perlu_rujukan, 'Bayi < 6 bulan dengan defisit berat badan wajib selalu dirujuk');
    }

    // =========================================================================
    // 4. KASUS BATAS Z-SCORE: -2 SD (Kandidat) vs -3 SD (Rujukan Segera)
    // =========================================================================

    public function test_kasus_batas_zscore_minus_2_menghasilkan_kandidat_tanpa_rujukan(): void
    {
        // Mock GrowthAnalysisService agar mengembalikan label 'lanjut' (setara -2 SD s.d. -3 SD)
        $growthMock = $this->createMock(GrowthAnalysisService::class);
        $growthMock->method('analyze')->willReturn([
            'indicators' => [
                'weight' => ['label' => GrowthAnalysisService::LABELS['lanjut'], 'value' => 8.5],
                'height' => ['label' => GrowthAnalysisService::LABELS['sesuai'], 'value' => 82.0],
            ],
            'overall_status' => GrowthAnalysisService::LABELS['lanjut'],
        ]);

        $service = new SpecialCareCandidateService($growthMock);

        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 8.5,
            'height' => 82.0,
            'arm_circumference' => 13.0, // LiLA normal, pemicu murni dari Z-score BB -2 SD
        ]);

        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertEquals('wasting', $enrollment->track);
        $this->assertFalse($enrollment->perlu_rujukan, 'Z-score -2 SD (pemantauan lanjut) belum menandai rujukan otomatis');
    }

    public function test_kasus_batas_zscore_minus_3_menghasilkan_kandidat_dengan_rujukan_segera(): void
    {
        // Mock GrowthAnalysisService agar mengembalikan label 'konsultasi' (setara < -3 SD)
        $growthMock = $this->createMock(GrowthAnalysisService::class);
        $growthMock->method('analyze')->willReturn([
            'indicators' => [
                'weight' => ['label' => GrowthAnalysisService::LABELS['konsultasi'], 'value' => 7.0],
                'height' => ['label' => GrowthAnalysisService::LABELS['sesuai'], 'value' => 82.0],
            ],
            'overall_status' => GrowthAnalysisService::LABELS['konsultasi'],
        ]);

        $service = new SpecialCareCandidateService($growthMock);

        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 7.0,
            'height' => 82.0,
            'arm_circumference' => 13.0,
        ]);

        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('candidate', $enrollment->status);
        $this->assertTrue($enrollment->perlu_rujukan, 'Z-score < -3 SD (konsultasi nakes) WAJIB menandai rujukan segera');
    }

    // =========================================================================
    // 5. KASUS DUA JALUR SEKALIGUS (Wasting + Stunting)
    // =========================================================================

    public function test_kasus_dua_jalur_sekaligus_wasting_dan_stunting(): void
    {
        // Mock: BB normal tetapi LiLA < 12.5 (wasting) DAN TB/PB = 'lanjut' (stunting)
        $growthMock = $this->createMock(GrowthAnalysisService::class);
        $growthMock->method('analyze')->willReturn([
            'indicators' => [
                'weight' => ['label' => GrowthAnalysisService::LABELS['sesuai'], 'value' => 9.5],
                'height' => ['label' => GrowthAnalysisService::LABELS['lanjut'], 'value' => 72.0],
            ],
            'overall_status' => GrowthAnalysisService::LABELS['lanjut'],
        ]);

        $service = new SpecialCareCandidateService($growthMock);

        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 9.5,
            'height' => 72.0,
            'arm_circumference' => 12.0, // Wasting dari LiLA (< 12.5 cm)
        ]);

        $enrollment = $service->evaluate($exam);

        $this->assertNotNull($enrollment);
        $this->assertEquals('both', $enrollment->track, 'Jika memenuhi kriteria wasting dan stunting, track wajib "both"');
        $this->assertEquals('candidate', $enrollment->status);
    }

    // =========================================================================
    // 6. IDEMPOTENSI: Tidak Menghasilkan Kandidat Ganda
    // =========================================================================

    public function test_idempotensi_evaluasi_kandidat_berulang_kali(): void
    {
        $service = app(SpecialCareCandidateService::class);

        $exam1 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(10)->toDateString(),
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create([
            'weight' => 8.0,
            'height' => 78.0,
            'arm_circumference' => 11.8,
        ]);

        // Evaluasi pertama -> menghasilkan kandidat
        $firstResult = $service->evaluate($exam1);
        $this->assertNotNull($firstResult);
        $this->assertEquals(1, SpecialCareEnrollment::where('child_id', $this->childA->id)->count());

        // Evaluasi kedua pada pemeriksaan baru untuk anak yang sama
        $exam2 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create([
            'weight' => 8.1,
            'height' => 78.5,
            'arm_circumference' => 11.9,
        ]);

        $secondResult = $service->evaluate($exam2);
        $this->assertNull($secondResult, 'Evaluasi ulang saat status candidate harus mengembalikan null');
        $this->assertEquals(1, SpecialCareEnrollment::where('child_id', $this->childA->id)->count());

        // Konfirmasi candidate menjadi active
        $firstResult->update(['status' => 'active', 'entry_date' => now()->toDateString()]);

        // Evaluasi ketiga saat anak aktif
        $thirdResult = $service->evaluate($exam2);
        $this->assertNull($thirdResult, 'Evaluasi ulang saat status active harus mengembalikan null');
        $this->assertEquals(1, SpecialCareEnrollment::where('child_id', $this->childA->id)->count());
    }

    // =========================================================================
    // 7. KASUS BATAS KELULUSAN: Hari ke-89 vs Hari ke-90
    // =========================================================================

    public function test_kasus_batas_kelulusan_hari_ke_89_belum_layak(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(89)->toDateString(), // Tepat hari ke-89
            'alasan_masuk' => 'Wasting',
        ]);

        // 2 pemeriksaan berturut-turut sudah pulih
        $exam1 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(20)->toDateString(),
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create(['weight' => 11.0, 'height' => 84.0, 'arm_circumference' => 13.0]);

        $exam2 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(2)->toDateString(),
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create(['weight' => 11.2, 'height' => 84.5, 'arm_circumference' => 13.1]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertEquals(89, $result['days_in_program']);
        $this->assertFalse($result['duration_met'], 'Hari ke-89 belum memenuhi batas minimal 90 hari');
        $this->assertTrue($result['recoveries_met']);
        $this->assertFalse($result['eligible'], 'Belum boleh diusulkan keluar pada hari ke-89');
    }

    public function test_kasus_batas_kelulusan_hari_ke_90_layak_usulan_keluar(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(90)->toDateString(), // Tepat hari ke-90
            'alasan_masuk' => 'Wasting',
        ]);

        // 2 pemeriksaan berturut-turut sudah pulih
        $exam1 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(20)->toDateString(),
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create(['weight' => 11.0, 'height' => 84.0, 'arm_circumference' => 13.0]);

        $exam2 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(1)->toDateString(),
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create(['weight' => 11.2, 'height' => 84.5, 'arm_circumference' => 13.1]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertEquals(90, $result['days_in_program']);
        $this->assertTrue($result['duration_met'], 'Hari ke-90 memenuhi batas minimal 90 hari');
        $this->assertTrue($result['recoveries_met']);
        $this->assertTrue($result['eligible'], 'Hari ke-90 dengan 2 pemeriksaan pulih berhak mendapat usulan keluar');
    }

    // =========================================================================
    // 8. KASUS BATAS KELULUSAN: 1 vs 2 Pemeriksaan Berturut-turut Pulih
    // =========================================================================

    public function test_kasus_batas_kelulusan_1_pemeriksaan_pulih_belum_cukup(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(95)->toDateString(),
            'alasan_masuk' => 'Wasting',
        ]);

        // Hanya 1 pemeriksaan pulih
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(5)->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create(['weight' => 11.0, 'height' => 84.0, 'arm_circumference' => 13.0]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertEquals(1, $result['consecutive_recoveries']);
        $this->assertFalse($result['recoveries_met'], '1 kali pulih belum memenuhi target 2 kali berturut-turut');
        $this->assertFalse($result['eligible']);
    }

    public function test_kasus_batas_kelulusan_lila_tepat_12_5_cm_dihitung_pulih(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(95)->toDateString(),
            'alasan_masuk' => 'Wasting',
        ]);

        // Pemeriksaan 1: LiLA tepat 12.5 cm (batas pemulihan)
        $exam1 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(25)->toDateString(),
            'status' => 'active',
        ]);
        $exam1->growthRecord()->create(['weight' => 10.8, 'height' => 83.0, 'arm_circumference' => 12.5]);

        // Pemeriksaan 2: LiLA 12.6 cm
        $exam2 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(3)->toDateString(),
            'status' => 'active',
        ]);
        $exam2->growthRecord()->create(['weight' => 11.0, 'height' => 83.5, 'arm_circumference' => 12.6]);

        $service = app(SpecialCareExitEvaluationService::class);
        $result = $service->evaluate($enrollment);

        $this->assertTrue($result['duration_met']);
        $this->assertEquals(2, $result['consecutive_recoveries']);
        $this->assertTrue($result['recoveries_met']);
        $this->assertTrue($result['eligible'], 'LiLA tepat 12.5 cm dihitung sebagai kondisi pulih');
    }

    // =========================================================================
    // 9. HAK AKSES (RBAC): Admin, Kader Posyandu Sendiri, Kader Lain, Orang Tua
    // =========================================================================

    public function test_hak_akses_admin_dapat_melihat_dan_mengelola_semua_posyandu(): void
    {
        $candidateA = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $candidateB = SpecialCareEnrollment::create([
            'child_id' => $this->childB->id,
            'posyandu_id' => $this->posyanduB->id,
            'track' => 'stunting',
            'status' => 'candidate',
            'alasan_masuk' => 'Tinggi badan pendek',
        ]);

        // Admin melihat kedua kandidat
        $resList = $this->actingAs($this->admin)->getJson('/api/special-care/candidates');
        $resList->assertOk();
        $this->assertCount(2, $resList->json('data'));

        // Admin dapat mengonfirmasi kandidat di Posyandu manapun
        $resConfirm = $this->actingAs($this->admin)->postJson("/api/special-care/{$candidateB->id}/confirm", [
            'notes' => 'Konfirmasi admin lintas posyandu',
        ]);
        $resConfirm->assertOk();
        $this->assertEquals('active', $resConfirm->json('data.status'));
    }

    public function test_hak_akses_kader_hanya_pada_posyandu_terdaftar(): void
    {
        $candidateB = SpecialCareEnrollment::create([
            'child_id' => $this->childB->id,
            'posyandu_id' => $this->posyanduB->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        // Kader A mencoba konfirmasi anak di Posyandu B -> 403 Forbidden
        $resConfirm = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidateB->id}/confirm", []);
        $resConfirm->assertForbidden();

        // Kader A mencoba reject anak di Posyandu B -> 403 Forbidden
        $resReject = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidateB->id}/reject", [
            'alasan_keluar' => 'Ditolak',
        ]);
        $resReject->assertForbidden();
    }

    public function test_hak_akses_orang_tua_dilarang_tulis_dan_hanya_baca_anak_kandung(): void
    {
        $candidateA = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        // Orang tua dilarang konfirmasi/reject/exit (403 Forbidden)
        $this->actingAs($this->parentUser)->postJson("/api/special-care/{$candidateA->id}/confirm", [])->assertForbidden();
        $this->actingAs($this->parentUser)->postJson("/api/special-care/{$candidateA->id}/reject", ['alasan_keluar' => 'x'])->assertForbidden();
        $this->actingAs($this->parentUser)->postJson("/api/special-care/{$candidateA->id}/exit", ['status' => 'graduated', 'alasan_keluar' => 'x'])->assertForbidden();

        // Orang tua bisa membaca riwayat anak kandung (childA)
        $resOwn = $this->actingAs($this->parentUser)->getJson("/api/special-care/children/{$this->childA->id}/history");
        $resOwn->assertOk();
        $this->assertEquals($this->childA->id, $resOwn->json('child_id'));

        // Orang tua dilarang membaca riwayat anak orang lain (childB) -> 403 Forbidden
        $resOther = $this->actingAs($this->parentUser)->getJson("/api/special-care/children/{$this->childB->id}/history");
        $resOther->assertForbidden();
    }
}
