<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Child;
use App\Models\Examination;
use App\Models\GrowthRecord;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\SpecialCareEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpecialCareEndpointTest extends TestCase
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
            'alamat' => 'Jl. Melati',
        ]);

        $this->posyanduB = Posyandu::create([
            'kode_posyandu' => 'PSYB',
            'nama_posyandu' => 'Posyandu Mawar',
            'alamat' => 'Jl. Mawar',
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
            'nama_lengkap' => 'Ibu Siti',
            'jenis_kelamin' => 'P',
            'nik' => '3201015501800001',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Kampung',
        ]);

        $this->parentUser = User::factory()->create([
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $parent->id,
        ]);

        $this->childA = Child::create([
            'nik' => '3201010101220001',
            'nama_lengkap' => 'Anak Kandung Siti',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => now()->subMonths(18)->toDateString(),
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Kampung Melati',
            'posyandu_id' => $this->posyanduA->id,
            'status' => 'active',
        ]);
        $this->childA->parents()->attach($parent->id, ['relationship' => 'Ibu', 'is_primary_contact' => true]);

        $this->childB = Child::create([
            'nik' => '3201010101220002',
            'nama_lengkap' => 'Anak Lain Posyandu B',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => now()->subMonths(20)->toDateString(),
            'jenis_kelamin' => 'P',
            'alamat' => 'Jl. Kebon Mawar',
            'posyandu_id' => $this->posyanduB->id,
            'status' => 'active',
        ]);
    }

    public function test_kader_only_sees_candidates_in_their_posyandu(): void
    {
        SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA rendah 12.0 cm',
        ]);

        SpecialCareEnrollment::create([
            'child_id' => $this->childB->id,
            'posyandu_id' => $this->posyanduB->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA rendah 11.8 cm',
        ]);

        // Kader A hanya melihat candidate posyandu A
        $resKaderA = $this->actingAs($this->kaderA)->getJson('/api/special-care/candidates');
        $resKaderA->assertOk();
        $this->assertCount(1, $resKaderA->json('data'));
        $this->assertEquals($this->childA->id, $resKaderA->json('data.0.child_id'));

        // Admin melihat semua (2 kandidat)
        $resAdmin = $this->actingAs($this->admin)->getJson('/api/special-care/candidates');
        $resAdmin->assertOk();
        $this->assertCount(2, $resAdmin->json('data'));
    }

    public function test_kader_confirms_candidate_in_their_posyandu_successfully(): void
    {
        $candidate = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $res = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidate->id}/confirm", [
            'entry_date' => now()->toDateString(),
            'notes' => 'Mulai PMT biskuit pemulihan',
        ]);

        $res->assertOk();
        $this->assertEquals('active', $res->json('data.status'));
        $this->assertEquals($this->kaderA->id, $res->json('data.confirmed_by'));

        $this->assertDatabaseHas('special_care_enrollment', [
            'id' => $candidate->id,
            'status' => 'active',
            'confirmed_by' => $this->kaderA->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'CONFIRM',
            'module' => 'special_care_enrollment',
            'record_id' => $candidate->id,
        ]);
    }

    public function test_kader_cannot_confirm_candidate_from_other_posyandu(): void
    {
        $candidateB = SpecialCareEnrollment::create([
            'child_id' => $this->childB->id,
            'posyandu_id' => $this->posyanduB->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $res = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidateB->id}/confirm", []);
        $res->assertForbidden();
    }

    public function test_orang_tua_cannot_confirm_candidate(): void
    {
        $candidate = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $res = $this->actingAs($this->parentUser)->postJson("/api/special-care/{$candidate->id}/confirm", []);
        $res->assertForbidden();
    }

    public function test_reject_candidate_requires_alasan(): void
    {
        $candidate = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'candidate',
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        // Tanpa alasan_keluar -> 422
        $res = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidate->id}/reject", []);
        $res->assertStatus(422);
        $res->assertJsonValidationErrors('alasan_keluar');

        // Dengan alasan_keluar -> 200, status cancelled
        $resValid = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$candidate->id}/reject", [
            'alasan_keluar' => 'Keluarga menolak intervensi karena pindah domisili',
        ]);

        $resValid->assertOk();
        $this->assertEquals('cancelled', $resValid->json('data.status'));

        $this->assertDatabaseHas('special_care_enrollment', [
            'id' => $candidate->id,
            'status' => 'cancelled',
            'alasan_keluar' => 'Keluarga menolak intervensi karena pindah domisili',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'REJECT',
            'module' => 'special_care_enrollment',
            'record_id' => $candidate->id,
        ]);
    }

    public function test_exit_proposals_lists_only_clinically_eligible_active_children(): void
    {
        // Anak A: active 95 hari, 2 kali recovery berturut-turut
        $enrollmentA = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(95)->toDateString(),
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        // 2 pemeriksaan berturut-turut lila >= 12.5
        $exam1 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(30)->toDateString(),
        ]);
        GrowthRecord::create([
            'examination_id' => $exam1->id,
            'weight' => 10.5,
            'height' => 82.0,
            'arm_circumference' => 12.8,
            'status_gizi' => 'gizi_baik',
        ]);

        $exam2 = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->subDays(2)->toDateString(),
        ]);
        GrowthRecord::create([
            'examination_id' => $exam2->id,
            'weight' => 10.8,
            'height' => 83.0,
            'arm_circumference' => 13.0,
            'status_gizi' => 'gizi_baik',
        ]);

        // Anak B: baru active 30 hari (belum memenuhi 90 hari)
        SpecialCareEnrollment::create([
            'child_id' => $this->childB->id,
            'posyandu_id' => $this->posyanduB->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(30)->toDateString(),
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/special-care/exit-proposals');
        $res->assertOk();
        $this->assertEquals(1, $res->json('total'));
        $this->assertEquals($enrollmentA->id, $res->json('data.0.enrollment.id'));
        $this->assertTrue($res->json('data.0.evaluation.eligible'));
    }

    public function test_kader_graduates_participant_with_exit_examination(): void
    {
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(92)->toDateString(),
            'alasan_masuk' => 'LiLA 12.0 cm',
        ]);

        $exitExam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
        ]);
        GrowthRecord::create([
            'examination_id' => $exitExam->id,
            'weight' => 11.0,
            'height' => 84.0,
            'arm_circumference' => 13.2,
            'status_gizi' => 'gizi_baik',
        ]);

        // 1. Secara default (exit_authorized_role = 'ADMIN'), kader ditolak 403
        $resKader = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$enrollment->id}/exit", [
            'status' => 'graduated',
            'exit_date' => now()->toDateString(),
            'alasan_keluar' => 'Lulus PMT: LiLA stabil 13.2 cm dan berat badan naik',
            'exit_examination_id' => $exitExam->id,
        ]);
        $resKader->assertForbidden();

        // 2. Admin berhak mengonfirmasi kelulusan secara default
        $resAdmin = $this->actingAs($this->admin)->postJson("/api/special-care/{$enrollment->id}/exit", [
            'status' => 'graduated',
            'exit_date' => now()->toDateString(),
            'alasan_keluar' => 'Lulus PMT: LiLA stabil 13.2 cm dan berat badan naik',
            'exit_examination_id' => $exitExam->id,
        ]);

        $resAdmin->assertOk();
        $this->assertEquals('graduated', $resAdmin->json('data.status'));

        $this->assertDatabaseHas('special_care_enrollment', [
            'id' => $enrollment->id,
            'status' => 'graduated',
            'exit_examination_id' => $exitExam->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'EXIT',
            'module' => 'special_care_enrollment',
            'record_id' => $enrollment->id,
        ]);

        // 3. Bila dikonfigurasi ke 'OPERATOR', kader diizinkan luluskan peserta
        config(['special_care.exit_authorized_role' => 'OPERATOR']);
        $enrollment2 = SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(95)->toDateString(),
            'alasan_masuk' => 'LiLA 12.1 cm',
        ]);

        $resKaderOperator = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$enrollment2->id}/exit", [
            'status' => 'graduated',
            'exit_date' => now()->toDateString(),
            'alasan_keluar' => 'Lulus PMT oleh kader berwenang',
        ]);
        $resKaderOperator->assertOk();
        $this->assertEquals('graduated', $resKaderOperator->json('data.status'));
    }

    public function test_child_history_accessible_by_parent_for_own_child_only(): void
    {
        SpecialCareEnrollment::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'track' => 'wasting',
            'status' => 'active',
            'entry_date' => now()->subDays(20)->toDateString(),
            'alasan_masuk' => 'LiLA 12.2 cm',
        ]);

        // Orang tua bisa akses riwayat anak sendiri
        $resOwn = $this->actingAs($this->parentUser)->getJson("/api/special-care/children/{$this->childA->id}/history");
        $resOwn->assertOk();
        $this->assertEquals($this->childA->id, $resOwn->json('child_id'));
        $this->assertCount(1, $resOwn->json('data'));

        // Orang tua DILARANG akses riwayat anak lain -> 403 Forbidden
        $resOther = $this->actingAs($this->parentUser)->getJson("/api/special-care/children/{$this->childB->id}/history");
        $resOther->assertForbidden();
    }

    public function test_audit_log_records_who_when_and_reason_for_status_transitions(): void
    {
        // 1. Candidate creation audit log
        $exam = Examination::create([
            'child_id' => $this->childA->id,
            'posyandu_id' => $this->posyanduA->id,
            'examiner_id' => $this->kaderA->id,
            'examination_date' => now()->toDateString(),
        ]);
        GrowthRecord::create([
            'examination_id' => $exam->id,
            'weight' => 7.8,
            'height' => 73.0,
            'arm_circumference' => 11.8,
            'status_gizi' => 'gizi_kurang',
        ]);

        $candidateService = app(\App\Services\SpecialCareCandidateService::class);
        $enrollment = $candidateService->evaluate($exam);
        $this->assertNotNull($enrollment);

        // 2. Kader confirms candidate with reason
        $resConfirm = $this->actingAs($this->kaderA)->postJson("/api/special-care/{$enrollment->id}/confirm", [
            'alasan' => 'Dikonfirmasi kader untuk PMT Pemulihan',
            'notes' => 'Catatan awal kader',
        ]);
        $resConfirm->assertOk();

        // 3. Admin graduates participant
        $resExit = $this->actingAs($this->admin)->postJson("/api/special-care/{$enrollment->id}/exit", [
            'status' => 'graduated',
            'exit_date' => now()->toDateString(),
            'alasan_keluar' => 'Target LiLA dan BB tercapai 90 hari',
        ]);
        $resExit->assertOk();

        // 4. Verify audit-logs endpoint
        $resLogs = $this->actingAs($this->kaderA)->getJson("/api/special-care/{$enrollment->id}/audit-logs");
        $resLogs->assertOk();
        $logs = $resLogs->json('data');

        $this->assertCount(3, $logs);

        // Check CREATE log
        $this->assertEquals('CREATE', $logs[0]['action']);
        $this->assertNull($logs[0]['status_sebelumnya']);
        $this->assertEquals('candidate', $logs[0]['status_baru']);
        $this->assertNotEmpty($logs[0]['alasan']);
        $this->assertNotNull($logs[0]['kapan']);

        // Check CONFIRM log
        $this->assertEquals('CONFIRM', $logs[1]['action']);
        $this->assertEquals('candidate', $logs[1]['status_sebelumnya']);
        $this->assertEquals('active', $logs[1]['status_baru']);
        $this->assertEquals('Dikonfirmasi kader untuk PMT Pemulihan', $logs[1]['alasan']);
        $this->assertEquals($this->kaderA->id, $logs[1]['siapa']['user_id']);
        $this->assertNotNull($logs[1]['kapan']);

        // Check EXIT log
        $this->assertEquals('EXIT', $logs[2]['action']);
        $this->assertEquals('active', $logs[2]['status_sebelumnya']);
        $this->assertEquals('graduated', $logs[2]['status_baru']);
        $this->assertEquals('Target LiLA dan BB tercapai 90 hari', $logs[2]['alasan']);
        $this->assertEquals($this->admin->id, $logs[2]['siapa']['user_id']);
        $this->assertNotNull($logs[2]['kapan']);

        // 5. Verify show endpoint also includes status_history
        $resShow = $this->actingAs($this->kaderA)->getJson("/api/special-care/{$enrollment->id}");
        $resShow->assertOk();
        $this->assertCount(3, $resShow->json('status_history'));

        // 6. Verify database audit_logs contains no raw sensitive keys or unmasked PII
        $dbLogs = AuditLog::where('module', 'special_care_enrollment')
            ->where('record_id', $enrollment->id)
            ->get();

        foreach ($dbLogs as $dbLog) {
            $rawNew = (string) $dbLog->new_values;
            $rawOld = (string) $dbLog->old_values;
            $this->assertStringNotContainsString('password', $rawNew);
            $this->assertStringNotContainsString('remember_token', $rawNew);
            $this->assertStringNotContainsString('access_token', $rawNew);
            $this->assertStringNotContainsString('password', $rawOld);
        }
    }
}
