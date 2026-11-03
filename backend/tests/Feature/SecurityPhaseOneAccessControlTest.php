<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Immunization;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPhaseOneAccessControlTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyanduA;

    private Posyandu $posyanduB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyanduA = Posyandu::create([
            'kode_posyandu' => 'PSY001',
            'nama_posyandu' => 'Posyandu Cut Nyak Dien',
            'alamat' => 'Jl. Cut Nyak Dien No.10',
            'status' => 'active',
        ]);

        $this->posyanduB = Posyandu::create([
            'kode_posyandu' => 'PSY002',
            'nama_posyandu' => 'Posyandu Kartika',
            'alamat' => 'Jl. Kartika No.20',
            'status' => 'active',
        ]);
    }

    private function makeUser(Role $role, ?Posyandu $posyandu = null, ?ParentModel $parent = null): User
    {
        $user = User::create([
            'name' => 'User '.$role->value,
            'email' => strtolower($role->value).'-'.uniqid().'@example.test',
            'password' => 'password123',
            'role' => $role->value,
            'parent_id' => $parent?->id,
            'is_active' => true,
        ]);

        if ($posyandu) {
            $user->posyandus()->attach($posyandu);
        }

        return $user;
    }

    private function makeChild(string $nama, Posyandu $posyandu, ?ParentModel $parent = null): Child
    {
        $child = Child::create([
            'posyandu_id' => $posyandu->id,
            'nama_lengkap' => $nama,
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Desa Sukamaju',
            'status' => 'active',
        ]);

        if ($parent) {
            $child->parents()->attach($parent->id, [
                'relationship' => 'Ibu',
                'is_primary_contact' => true,
            ]);
        }

        return $child;
    }

    // ------------------------------------------------------------------------
    // 1.1 ParentController IDOR & Scope Tests
    // ------------------------------------------------------------------------

    public function test_kader_hanya_bisa_melihat_parent_di_posyandu_binaannya(): void
    {
        $kaderA = $this->makeUser(Role::KADER, $this->posyanduA);

        $parentA = ParentModel::create(['nama_lengkap' => 'Parent Posyandu A', 'jenis_kelamin' => 'P']);
        $parentB = ParentModel::create(['nama_lengkap' => 'Parent Posyandu B', 'jenis_kelamin' => 'L']);

        $this->makeChild('Anak A', $this->posyanduA, $parentA);
        $this->makeChild('Anak B', $this->posyanduB, $parentB);

        // Kader A melihat list: hanya parentA
        $listResponse = $this->actingAs($kaderA)->getJson('/api/parents');
        $listResponse->assertOk();
        $this->assertSame(['Parent Posyandu A'], array_column($listResponse->json('data'), 'nama_lengkap'));

        // Kader A show parentA: 200 OK
        $this->actingAs($kaderA)->getJson("/api/parents/{$parentA->id}")->assertOk();

        // Kader A show parentB (IDOR prevention): 403 Forbidden
        $this->actingAs($kaderA)->getJson("/api/parents/{$parentB->id}")->assertForbidden();
    }

    public function test_orang_tua_hanya_bisa_melihat_profil_parent_sendiri(): void
    {
        $parentOrtu = ParentModel::create(['nama_lengkap' => 'Ortu Saya', 'jenis_kelamin' => 'P']);
        $parentLain = ParentModel::create(['nama_lengkap' => 'Ortu Lain', 'jenis_kelamin' => 'P']);

        $orangTuaUser = $this->makeUser(Role::ORANG_TUA, null, $parentOrtu);

        // List parents untuk orang tua hanya dirinya sendiri
        $response = $this->actingAs($orangTuaUser)->getJson('/api/parents');
        $response->assertOk();
        $this->assertSame(['Ortu Saya'], array_column($response->json('data'), 'nama_lengkap'));

        // Show dirinya sendiri: 200 OK
        $this->actingAs($orangTuaUser)->getJson("/api/parents/{$parentOrtu->id}")->assertOk();

        // Show orang lain: 403 Forbidden
        $this->actingAs($orangTuaUser)->getJson("/api/parents/{$parentLain->id}")->assertForbidden();

        // Update tidak diizinkan untuk orang tua
        $this->actingAs($orangTuaUser)->putJson("/api/parents/{$parentOrtu->id}", [
            'nama_lengkap' => 'Ganti Nama',
            'jenis_kelamin' => 'P',
        ])->assertForbidden();
    }

    public function test_hanya_admin_yang_boleh_menghapus_parent(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $kader = $this->makeUser(Role::KADER, $this->posyanduA);
        $parent = ParentModel::create(['nama_lengkap' => 'Parent Hapus', 'jenis_kelamin' => 'L']);
        $this->makeChild('Anak Hapus', $this->posyanduA, $parent);

        // Kader delete: 403
        $this->actingAs($kader)->deleteJson("/api/parents/{$parent->id}")->assertForbidden();

        // Admin delete: 200
        $this->actingAs($admin)->deleteJson("/api/parents/{$parent->id}")->assertOk();
        $this->assertSoftDeleted('parents', ['id' => $parent->id]);
    }

    // ------------------------------------------------------------------------
    // 1.2 UserController Privilege Escalation Tests
    // ------------------------------------------------------------------------

    public function test_non_admin_dilarang_mengubah_role_parent_id_is_active_posyandu_ids(): void
    {
        $parent = ParentModel::create(['nama_lengkap' => 'Parent Test', 'jenis_kelamin' => 'P']);
        $otherParent = ParentModel::create(['nama_lengkap' => 'Other Parent', 'jenis_kelamin' => 'P']);
        $ortuUser = $this->makeUser(Role::ORANG_TUA, null, $parent);

        // Mencoba eskalasi role ke ADMIN
        $this->actingAs($ortuUser)->putJson("/api/users/{$ortuUser->id}", [
            'role' => 'ADMIN',
        ])->assertStatus(422);

        // Mencoba mengubah parent_id ke orang lain
        $this->actingAs($ortuUser)->putJson("/api/users/{$ortuUser->id}", [
            'parent_id' => $otherParent->id,
        ])->assertStatus(422);

        // Mencoba mengubah is_active
        $this->actingAs($ortuUser)->putJson("/api/users/{$ortuUser->id}", [
            'is_active' => false,
        ])->assertStatus(422);

        // Mencoba menambahkan posyandu_ids
        $this->actingAs($ortuUser)->putJson("/api/users/{$ortuUser->id}", [
            'posyandu_ids' => [$this->posyanduA->id],
        ])->assertStatus(422);

        // Non-admin mencoba mengubah user lain: 403
        $admin = $this->makeUser(Role::ADMIN);
        $this->actingAs($ortuUser)->putJson("/api/users/{$admin->id}", [
            'name' => 'Hacked Admin',
        ])->assertForbidden();

        // Non-admin mengubah field aman miliknya sendiri: 200 OK
        $this->actingAs($ortuUser)->putJson("/api/users/{$ortuUser->id}", [
            'name' => 'Nama Baru Ortu',
            'phone' => '081234567890',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $ortuUser->id,
            'name' => 'Nama Baru Ortu',
            'phone' => '081234567890',
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $parent->id,
        ]);
    }

    public function test_admin_bisa_mengubah_role_dan_posyandu_ids(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $kader = $this->makeUser(Role::KADER, $this->posyanduA);

        $response = $this->actingAs($admin)->putJson("/api/users/{$kader->id}", [
            'posyandu_ids' => [$this->posyanduA->id, $this->posyanduB->id],
            'is_active' => true,
        ]);

        $response->assertOk();
        $this->assertCount(2, $kader->fresh()->posyandus);
    }

    // ------------------------------------------------------------------------
    // 1.3 ReportController Access Control Tests
    // ------------------------------------------------------------------------

    public function test_orang_tua_diblokir_dari_seluruh_laporan(): void
    {
        $parent = ParentModel::create(['nama_lengkap' => 'Parent Report', 'jenis_kelamin' => 'P']);
        $ortuUser = $this->makeUser(Role::ORANG_TUA, null, $parent);

        $this->actingAs($ortuUser)->getJson('/api/reports/anak')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/anak?export=csv')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/pemeriksaan')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/pertumbuhan')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/imunisasi')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/follow-up')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/bumil')->assertForbidden();
        $this->actingAs($ortuUser)->getJson('/api/reports/statistik')->assertForbidden();
    }

    public function test_kader_hanya_bisa_meminta_laporan_posyandu_binaannya(): void
    {
        $kaderA = $this->makeUser(Role::KADER, $this->posyanduA);

        // Meminta posyandu sendiri: 200 OK
        $this->actingAs($kaderA)->getJson("/api/reports/anak?posyandu_id={$this->posyanduA->id}")->assertOk();

        // Meminta posyandu lain: 403 Forbidden
        $this->actingAs($kaderA)->getJson("/api/reports/anak?posyandu_id={$this->posyanduB->id}")->assertForbidden();
        $this->actingAs($kaderA)->getJson("/api/reports/anak?posyandu_id={$this->posyanduB->id}&export=csv")->assertForbidden();
    }

    // ------------------------------------------------------------------------
    // 1.4 ImmunizationController Mutation & Audit Log Tests
    // ------------------------------------------------------------------------

    public function test_orang_tua_dilarang_menulis_atau_menghapus_imunisasi(): void
    {
        $parent = ParentModel::create(['nama_lengkap' => 'Parent Imun', 'jenis_kelamin' => 'P']);
        $ortuUser = $this->makeUser(Role::ORANG_TUA, null, $parent);
        $anak = $this->makeChild('Anak Imun', $this->posyanduA, $parent);

        $immunization = Immunization::create([
            'child_id' => $anak->id,
            'jenis' => 'VAKSIN',
            'vaccine_name' => 'Polio 1',
            'vaccination_date' => now()->toDateString(),
            'status' => 'sudah',
        ]);

        // Orang tua store: 403
        $this->actingAs($ortuUser)->postJson('/api/immunizations', [
            'child_id' => $anak->id,
            'vaccine_name' => 'Campak',
            'status' => 'sudah',
        ])->assertForbidden();

        // Orang tua update: 403
        $this->actingAs($ortuUser)->putJson("/api/immunizations/{$immunization->id}", [
            'vaccine_name' => 'Polio 2',
        ])->assertForbidden();

        // Orang tua delete: 403
        $this->actingAs($ortuUser)->deleteJson("/api/immunizations/{$immunization->id}")->assertForbidden();
    }

    public function test_kader_menghapus_imunisasi_mencatat_record_id_di_audit_log(): void
    {
        $kaderA = $this->makeUser(Role::KADER, $this->posyanduA);
        $parent = ParentModel::create(['nama_lengkap' => 'Parent Imun 2', 'jenis_kelamin' => 'P']);
        $anak = $this->makeChild('Anak Imun 2', $this->posyanduA, $parent);

        $immunization = Immunization::create([
            'child_id' => $anak->id,
            'jenis' => 'VAKSIN',
            'vaccine_name' => 'Hepatitis B',
            'vaccination_date' => now()->toDateString(),
            'status' => 'sudah',
        ]);

        $imunId = $immunization->id;

        $response = $this->actingAs($kaderA)->deleteJson("/api/immunizations/{$imunId}");
        $response->assertOk();

        $this->assertDatabaseMissing('immunizations', ['id' => $imunId]);

        // Verifikasi audit log menyimpan record_id yang tepat dan tidak null
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'DELETE',
            'module' => 'immunizations',
            'record_id' => $imunId,
            'user_id' => $kaderA->id,
        ]);
    }
}
