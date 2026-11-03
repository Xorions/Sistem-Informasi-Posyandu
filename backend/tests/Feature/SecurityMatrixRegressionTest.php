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

class SecurityMatrixRegressionTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyanduA;

    private Posyandu $posyanduB;

    private ParentModel $parentA;

    private ParentModel $parentB;

    private Child $childA;

    private Child $childB;

    private User $admin;

    private User $kaderA;

    private User $ortuA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyanduA = Posyandu::create([
            'kode_posyandu' => 'PSY001',
            'nama_posyandu' => 'Posyandu Cut Nyak Dien',
            'alamat' => 'Jl. Cut Nyak Dien No. 1',
            'status' => 'active',
        ]);

        $this->posyanduB = Posyandu::create([
            'kode_posyandu' => 'PSY002',
            'nama_posyandu' => 'Posyandu Kartika',
            'alamat' => 'Jl. Kartika No. 2',
            'status' => 'active',
        ]);

        $this->parentA = ParentModel::create([
            'nik' => '3201234567890001',
            'nama_lengkap' => 'Orang Tua A',
            'jenis_kelamin' => 'P',
            'nomor_telepon' => '081234567891',
            'alamat' => 'Jl. Melati No. 1',
        ]);

        $this->parentB = ParentModel::create([
            'nik' => '3201234567890002',
            'nama_lengkap' => 'Orang Tua B',
            'jenis_kelamin' => 'L',
            'nomor_telepon' => '081234567892',
            'alamat' => 'Jl. Melati No. 2',
        ]);

        $this->childA = Child::create([
            'posyandu_id' => $this->posyanduA->id,
            'nik' => '3201234567890003',
            'nama_lengkap' => 'Anak Posyandu A',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Melati No. 1',
            'status' => 'active',
        ]);
        $this->childA->parents()->attach($this->parentA->id, ['relationship' => 'Ibu', 'is_primary_contact' => true]);

        $this->childB = Child::create([
            'posyandu_id' => $this->posyanduB->id,
            'nik' => '3201234567890004',
            'nama_lengkap' => 'Anak Posyandu B',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-02-01',
            'jenis_kelamin' => 'P',
            'alamat' => 'Jl. Melati No. 2',
            'status' => 'active',
        ]);
        $this->childB->parents()->attach($this->parentB->id, ['relationship' => 'Ayah', 'is_primary_contact' => true]);

        $this->admin = User::factory()->create([
            'role' => Role::ADMIN->value,
            'is_active' => true,
        ]);

        $this->kaderA = User::factory()->create([
            'role' => Role::KADER->value,
            'is_active' => true,
        ]);
        $this->kaderA->posyandus()->attach($this->posyanduA->id);

        $this->ortuA = User::factory()->create([
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $this->parentA->id,
            'is_active' => true,
        ]);
    }

    /**
     * Matrix: Endpoints Parents
     */
    public function test_security_matrix_parents(): void
    {
        // 1. Guest
        $this->getJson('/api/parents')->assertStatus(401);

        // 2. Admin
        $resAdmin = $this->actingAs($this->admin)->getJson('/api/parents');
        $resAdmin->assertStatus(200);
        $this->assertCount(2, $resAdmin->json('data'));

        // 3. Kader
        $resKader = $this->actingAs($this->kaderA)->getJson('/api/parents');
        $resKader->assertStatus(200);
        $this->assertCount(1, $resKader->json('data'));
        $this->assertSame($this->parentA->id, $resKader->json('data.0.id'));

        $this->actingAs($this->kaderA)->deleteJson("/api/parents/{$this->parentA->id}")
            ->assertStatus(403);

        // 4. Orang Tua
        $resOrtu = $this->actingAs($this->ortuA)->getJson('/api/parents');
        $resOrtu->assertStatus(200);
        $this->assertCount(1, $resOrtu->json('data'));
        $this->assertSame($this->parentA->id, $resOrtu->json('data.0.id'));

        $this->actingAs($this->ortuA)->getJson("/api/parents/{$this->parentB->id}")
            ->assertStatus(403);

        $this->actingAs($this->ortuA)->postJson('/api/parents', [
            'nik' => '3201234567890099',
            'nama_lengkap' => 'New Parent',
            'jenis_kelamin' => 'L',
        ])->assertStatus(403);

        $this->actingAs($this->ortuA)->deleteJson("/api/parents/{$this->parentA->id}")
            ->assertStatus(403);

        // Admin delete parentB at the end
        $this->actingAs($this->admin)->deleteJson("/api/parents/{$this->parentB->id}")
            ->assertStatus(200);
    }

    /**
     * Matrix: Endpoints Users
     */
    public function test_security_matrix_users(): void
    {
        // 1. Guest
        $this->getJson('/api/users')->assertStatus(401);

        // 2. Admin
        $this->actingAs($this->admin)->getJson('/api/users')->assertStatus(200);
        $this->actingAs($this->admin)->postJson('/api/users', [
            'name' => 'Kader Baru',
            'email' => 'kader.baru@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => Role::KADER->value,
            'posyandu_ids' => [$this->posyanduA->id],
        ])->assertStatus(201);

        // 3. Kader
        $this->actingAs($this->kaderA)->getJson('/api/users')->assertStatus(403);
        $this->actingAs($this->kaderA)->postJson('/api/users', [
            'name' => 'Evil Admin',
            'email' => 'evil@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => Role::ADMIN->value,
        ])->assertStatus(403);

        // 4. Orang Tua
        $this->actingAs($this->ortuA)->getJson('/api/users')->assertStatus(403);
        $this->actingAs($this->ortuA)->postJson('/api/users', [
            'name' => 'Evil Admin 2',
            'email' => 'evil2@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => Role::ADMIN->value,
        ])->assertStatus(403);
    }

    /**
     * Matrix: Endpoints Reports
     */
    public function test_security_matrix_reports(): void
    {
        // 1. Guest
        $this->getJson('/api/reports/anak')->assertStatus(401);

        // 2. Admin
        $this->actingAs($this->admin)->getJson('/api/reports/anak')->assertStatus(200);

        // 3. Kader (hanya boleh posyandu binaan)
        $this->actingAs($this->kaderA)
            ->getJson("/api/reports/anak?posyandu_id={$this->posyanduA->id}")
            ->assertStatus(200);

        $this->actingAs($this->kaderA)
            ->getJson("/api/reports/anak?posyandu_id={$this->posyanduB->id}")
            ->assertStatus(403);

        // 4. Orang Tua (dilarang seluruh report)
        $this->actingAs($this->ortuA)->getJson('/api/reports/anak')->assertStatus(403);
        $this->actingAs($this->ortuA)->getJson('/api/reports/pemeriksaan')->assertStatus(403);
        $this->actingAs($this->ortuA)->getJson('/api/reports/statistik')->assertStatus(403);
    }

    /**
     * Matrix: Endpoints Immunizations
     */
    public function test_security_matrix_immunizations(): void
    {
        $imunisasi = Immunization::create([
            'child_id' => $this->childA->id,
            'vaccine_name' => 'BCG',
            'jenis' => 'VAKSIN',
            'immunization_date' => '2023-01-10',
            'status' => 'sudah',
        ]);

        // 1. Guest
        $this->postJson('/api/immunizations', [])->assertStatus(401);

        // 2. Admin (bisa create & delete)
        $this->actingAs($this->admin)->postJson('/api/immunizations', [
            'child_id' => $this->childB->id,
            'vaccine_name' => 'Polio 1',
            'jenis' => 'VAKSIN',
            'immunization_date' => '2023-02-10',
            'status' => 'sudah',
        ])->assertStatus(201);

        // 3. Kader (hanya di posyandu binaan)
        $this->actingAs($this->kaderA)->postJson('/api/immunizations', [
            'child_id' => $this->childA->id,
            'vaccine_name' => 'DPT 1',
            'jenis' => 'VAKSIN',
            'immunization_date' => '2023-03-10',
            'status' => 'sudah',
        ])->assertStatus(201);

        $this->actingAs($this->kaderA)->postJson('/api/immunizations', [
            'child_id' => $this->childB->id,
            'vaccine_name' => 'DPT 2',
            'jenis' => 'VAKSIN',
            'immunization_date' => '2023-03-10',
            'status' => 'sudah',
        ])->assertStatus(403);

        // 4. Orang Tua (dilarang create & delete)
        $this->actingAs($this->ortuA)->postJson('/api/immunizations', [
            'child_id' => $this->childA->id,
            'vaccine_name' => 'Campak',
            'jenis' => 'VAKSIN',
            'immunization_date' => '2023-04-10',
            'status' => 'sudah',
        ])->assertStatus(403);

        $this->actingAs($this->ortuA)->deleteJson("/api/immunizations/{$imunisasi->id}")
            ->assertStatus(403);

        // Kader delete immunization
        $this->actingAs($this->kaderA)->deleteJson("/api/immunizations/{$imunisasi->id}")
            ->assertStatus(200);
    }

    /**
     * Matrix: Endpoints Children
     */
    public function test_security_matrix_children(): void
    {
        // 1. Guest
        $this->getJson('/api/children')->assertStatus(401);

        // 2. Admin
        $resAdmin = $this->actingAs($this->admin)->getJson('/api/children');
        $resAdmin->assertStatus(200);
        $this->assertCount(2, $resAdmin->json('data'));

        // 3. Kader (hanya posyandu binaan)
        $resKader = $this->actingAs($this->kaderA)->getJson('/api/children');
        $resKader->assertStatus(200);
        $this->assertCount(1, $resKader->json('data'));
        $this->assertSame($this->childA->id, $resKader->json('data.0.id'));

        $this->actingAs($this->kaderA)->getJson("/api/children/{$this->childB->id}")
            ->assertStatus(403);

        // 4. Orang Tua (hanya anak sendiri)
        $resOrtu = $this->actingAs($this->ortuA)->getJson('/api/children');
        $resOrtu->assertStatus(200);
        $this->assertCount(1, $resOrtu->json('data'));
        $this->assertSame($this->childA->id, $resOrtu->json('data.0.id'));

        $this->actingAs($this->ortuA)->getJson("/api/children/{$this->childB->id}")
            ->assertStatus(403);

        $this->actingAs($this->ortuA)->postJson('/api/children', [
            'posyandu_id' => $this->posyanduA->id,
            'nik' => '3201234567890055',
            'nama_lengkap' => 'Anak Palsu',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Palsu',
        ])->assertStatus(403);
    }
}
