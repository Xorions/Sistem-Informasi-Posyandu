<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Child;
use App\Models\Kader;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\Mask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPhaseThreePiiTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyandu;

    private User $admin;

    private User $kader;

    private User $ortu;

    private ParentModel $parent;

    private Child $child;

    private Kader $kaderModel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyandu = Posyandu::create([
            'kode_posyandu' => 'PSY001',
            'nama_posyandu' => 'Posyandu Teratai',
            'alamat' => 'Jl. Mawar No. 1',
            'rt' => '01',
            'rw' => '02',
            'kelurahan' => 'Sukamaju',
            'kecamatan' => 'Sukajadi',
            'kota' => 'Bandung',
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create([
            'role' => Role::ADMIN->value,
            'is_active' => true,
        ]);

        $this->parent = ParentModel::create([
            'nik' => '3201234567890001',
            'nama_lengkap' => 'Budi Santoso',
            'jenis_kelamin' => 'L',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Mawar No. 1',
        ]);

        $this->ortu = User::factory()->create([
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $this->parent->id,
            'is_active' => true,
        ]);

        $this->child = Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201987654320002',
            'nama_lengkap' => 'Anak Budi',
            'jenis_kelamin' => 'L',
            'tanggal_lahir' => '2023-01-01',
            'tempat_lahir' => 'Bandung',
            'alamat' => 'Jl. Mawar No. 1',
            'nomor_kk' => '3201000000000003',
            'status' => 'active',
        ]);
        $this->child->parents()->attach($this->parent->id, ['relationship' => 'Ayah', 'is_primary_contact' => true]);

        $this->kader = User::factory()->create([
            'role' => Role::KADER->value,
            'is_active' => true,
        ]);
        $this->kader->posyandus()->attach($this->posyandu->id);

        $this->kaderModel = Kader::create([
            'posyandu_id' => $this->posyandu->id,
            'user_id' => $this->kader->id,
            'nama_kader' => 'Siti Kader',
            'nik_kader' => '3201111122220004',
            'no_hp' => '089876543210',
            'status' => 'active',
        ]);
    }

    public function test_mask_helper_works_correctly(): void
    {
        $this->assertSame('3201********0001', Mask::nik('3201234567890001'));
        $this->assertSame('3201********0003', Mask::kk('3201000000000003'));
        $this->assertSame('0812*****890', Mask::phone('081234567890'));
        $this->assertNull(Mask::nik(null));
        $this->assertNull(Mask::phone(null));
    }

    public function test_child_pii_masked_on_index_for_kader_unmasked_on_show_and_for_admin(): void
    {
        // 1. Kader pada index: NIK & KK ter-mask
        $resKaderIndex = $this->actingAs($this->kader)->getJson('/api/children')->assertOk();
        $resKaderIndex->assertJsonFragment([
            'nik' => '3201********0002',
            'nomor_kk' => '3201********0003',
        ]);

        // 2. Kader pada show: NIK & KK utuh (untuk form edit)
        $resKaderShow = $this->actingAs($this->kader)->getJson("/api/children/{$this->child->id}")->assertOk();
        $resKaderShow->assertJsonFragment([
            'nik' => '3201987654320002',
            'nomor_kk' => '3201000000000003',
        ]);

        // 3. Admin pada index: NIK & KK utuh
        $resAdminIndex = $this->actingAs($this->admin)->getJson('/api/children')->assertOk();
        $resAdminIndex->assertJsonFragment([
            'nik' => '3201987654320002',
            'nomor_kk' => '3201000000000003',
        ]);

        // 4. Orang Tua pemilik sah: NIK & KK utuh
        $resOrtuIndex = $this->actingAs($this->ortu)->getJson('/api/children')->assertOk();
        $resOrtuIndex->assertJsonFragment([
            'nik' => '3201987654320002',
            'nomor_kk' => '3201000000000003',
        ]);
    }

    public function test_parent_pii_masked_on_index_for_kader_unmasked_on_show_and_for_admin(): void
    {
        // 1. Kader pada index: NIK & Phone ter-mask
        $resKaderIndex = $this->actingAs($this->kader)->getJson('/api/parents')->assertOk();
        $resKaderIndex->assertJsonFragment([
            'nik' => '3201********0001',
            'nomor_telepon' => '0812*****890',
        ]);

        // 2. Kader pada show: NIK & Phone utuh
        $resKaderShow = $this->actingAs($this->kader)->getJson("/api/parents/{$this->parent->id}")->assertOk();
        $resKaderShow->assertJsonFragment([
            'nik' => '3201234567890001',
            'nomor_telepon' => '081234567890',
        ]);

        // 3. Admin pada index: NIK & Phone utuh
        $resAdminIndex = $this->actingAs($this->admin)->getJson('/api/parents')->assertOk();
        $resAdminIndex->assertJsonFragment([
            'nik' => '3201234567890001',
            'nomor_telepon' => '081234567890',
        ]);

        // 4. Orang Tua melihat data dirinya sendiri: utuh
        $resOrtuShow = $this->actingAs($this->ortu)->getJson("/api/parents/{$this->parent->id}")->assertOk();
        $resOrtuShow->assertJsonFragment([
            'nik' => '3201234567890001',
            'nomor_telepon' => '081234567890',
        ]);
    }

    public function test_kader_pii_masked_on_index_for_kader_unmasked_on_show_and_for_admin(): void
    {
        // 1. Kader pada index: NIK kader & no hp ter-mask
        $resKaderIndex = $this->actingAs($this->kader)->getJson('/api/kader')->assertOk();
        $resKaderIndex->assertJsonFragment([
            'nik_kader' => '3201********0004',
            'no_hp' => '0898*****210',
        ]);

        // 2. Kader pada show: utuh
        $resKaderShow = $this->actingAs($this->kader)->getJson("/api/kader/{$this->kaderModel->id}")->assertOk();
        $resKaderShow->assertJsonFragment([
            'nik_kader' => '3201111122220004',
            'no_hp' => '089876543210',
        ]);

        // 3. Admin pada index: utuh
        $resAdminIndex = $this->actingAs($this->admin)->getJson('/api/kader')->assertOk();
        $resAdminIndex->assertJsonFragment([
            'nik_kader' => '3201111122220004',
            'no_hp' => '089876543210',
        ]);
    }

    public function test_report_children_masks_pii_for_kader_and_unmasked_for_admin(): void
    {
        // Kader export / JSON: NIK & KK dimask
        $resKader = $this->actingAs($this->kader)->getJson('/api/reports/anak')->assertOk();
        $resKader->assertJsonFragment([
            'nik' => '3201********0002',
            'nomor_kk' => '3201********0003',
        ]);

        // Admin export / JSON: NIK & KK utuh
        $resAdmin = $this->actingAs($this->admin)->getJson('/api/reports/anak')->assertOk();
        $resAdmin->assertJsonFragment([
            'nik' => '3201987654320002',
            'nomor_kk' => '3201000000000003',
        ]);
    }

    public function test_audit_log_sanitizes_passwords_tokens_and_masks_pii(): void
    {
        AuditLogService::log(
            'CREATE',
            'users',
            123,
            null,
            [
                'email' => 'test@example.com',
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
                'remember_token' => 'token-abc',
                'nik' => '3201234567890001',
                'nomor_telepon' => '081234567890',
            ]
        );

        $log = AuditLog::where('module', 'users')->where('record_id', 123)->latest()->first();
        $this->assertNotNull($log);

        $newValues = json_decode($log->new_values, true);

        // Password & tokens removed
        $this->assertArrayNotHasKey('password', $newValues);
        $this->assertArrayNotHasKey('password_confirmation', $newValues);
        $this->assertArrayNotHasKey('remember_token', $newValues);

        // NIK & Phone masked
        $this->assertSame('3201********0001', $newValues['nik']);
        $this->assertSame('0812*****890', $newValues['nomor_telepon']);
    }

    public function test_kader_update_child_omitting_masked_nik_preserves_database_nik(): void
    {
        $originalNik = $this->child->nik;
        $originalKk = $this->child->nomor_kk;

        $res = $this->actingAs($this->kader)->putJson("/api/children/{$this->child->id}", [
            'nama_lengkap' => 'Anak Budi Updated',
        ])->assertOk();

        $this->child->refresh();
        $this->assertSame('Anak Budi Updated', $this->child->nama_lengkap);
        $this->assertSame($originalNik, $this->child->nik);
        $this->assertSame($originalKk, $this->child->nomor_kk);
    }

    public function test_update_child_with_masked_nik_fails_validation(): void
    {
        $res = $this->actingAs($this->kader)->putJson("/api/children/{$this->child->id}", [
            'nik' => '3201********0002',
        ])->assertStatus(422);

        $res->assertJsonValidationErrors(['nik']);
    }

    public function test_update_parent_omitting_masked_nik_and_phone_preserves_database(): void
    {
        $originalNik = $this->parent->nik;
        $originalPhone = $this->parent->nomor_telepon;

        $this->actingAs($this->admin)->putJson("/api/parents/{$this->parent->id}", [
            'nama_lengkap' => 'Budi Santoso Updated',
        ])->assertOk();

        $this->parent->refresh();
        $this->assertSame('Budi Santoso Updated', $this->parent->nama_lengkap);
        $this->assertSame($originalNik, $this->parent->nik);
        $this->assertSame($originalPhone, $this->parent->nomor_telepon);
    }

    public function test_update_kader_omitting_masked_nik_and_phone_preserves_database(): void
    {
        $originalNik = $this->kaderModel->nik_kader;
        $originalPhone = $this->kaderModel->no_hp;

        $this->actingAs($this->admin)->putJson("/api/kader/{$this->kaderModel->id}", [
            'nama_kader' => 'Siti Kader Updated',
        ])->assertOk();

        $this->kaderModel->refresh();
        $this->assertSame('Siti Kader Updated', $this->kaderModel->nama_kader);
        $this->assertSame($originalNik, $this->kaderModel->nik_kader);
        $this->assertSame($originalPhone, $this->kaderModel->no_hp);
    }
}
