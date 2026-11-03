<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\Examination;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPhaseFourValidationTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyandu;

    private User $admin;

    private User $kader;

    private User $ortu;

    private Child $child;

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

        $this->kader = User::factory()->create([
            'role' => Role::KADER->value,
            'is_active' => true,
        ]);
        $this->kader->posyandus()->attach($this->posyandu->id);

        $parent = ParentModel::create([
            'nik' => '3201234567890001',
            'nama_lengkap' => 'Budi Santoso',
            'jenis_kelamin' => 'L',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Mawar No. 1',
        ]);

        $this->ortu = User::factory()->create([
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $parent->id,
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
            'status' => 'active',
        ]);
    }

    public function test_examination_requires_arm_circumference_lila(): void
    {
        $response = $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'weight' => 12.5,
            'height' => 85.0,
            // arm_circumference sengaja tidak diisi
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['arm_circumference']);
    }

    public function test_examination_rejects_out_of_range_anthropometry(): void
    {
        // BB < 1 kg atau > 40 kg
        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'weight' => 0.5,
            'arm_circumference' => 14.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['weight']);

        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'weight' => 45.0,
            'arm_circumference' => 14.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['weight']);

        // TB < 30 cm atau > 150 cm
        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'height' => 20.0,
            'arm_circumference' => 14.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['height']);

        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'height' => 160.0,
            'arm_circumference' => 14.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['height']);

        // LK < 25 cm atau > 65 cm
        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'head_circumference' => 20.0,
            'arm_circumference' => 14.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['head_circumference']);

        // LiLA < 7 cm atau > 30 cm
        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'arm_circumference' => 5.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['arm_circumference']);

        $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'arm_circumference' => 35.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['arm_circumference']);
    }

    public function test_examination_accepts_valid_anthropometry_ranges(): void
    {
        $response = $this->actingAs($this->kader)->postJson('/api/examinations', [
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examination_date' => now()->toDateString(),
            'weight' => 12.5,
            'height' => 85.0,
            'length' => 85.0,
            'head_circumference' => 46.0,
            'arm_circumference' => 15.0,
            'notes' => 'Tumbuh kembang baik',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('growth_records', [
            'weight' => 12.5,
            'arm_circumference' => 15.0,
        ]);
    }

    public function test_examination_update_validates_ranges(): void
    {
        $exam = Examination::create([
            'child_id' => $this->child->id,
            'posyandu_id' => $this->posyandu->id,
            'examiner_id' => $this->kader->id,
            'examination_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        $exam->growthRecord()->create([
            'weight' => 10.0,
            'arm_circumference' => 14.0,
        ]);

        // Gagal jika melebihi batas
        $this->actingAs($this->kader)->putJson("/api/examinations/{$exam->id}", [
            'weight' => 45.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['weight']);

        // Gagal jika LiLA di bawah 7 cm
        $this->actingAs($this->kader)->putJson("/api/examinations/{$exam->id}", [
            'arm_circumference' => 4.0,
        ])->assertStatus(422)->assertJsonValidationErrors(['arm_circumference']);

        // Sukses jika nilai valid
        $this->actingAs($this->kader)->putJson("/api/examinations/{$exam->id}", [
            'weight' => 11.2,
            'arm_circumference' => 14.5,
        ])->assertOk();
    }

    public function test_child_nik_and_kk_must_be_16_digits(): void
    {
        // NIK kurang dari 16 digit
        $this->actingAs($this->kader)->postJson('/api/children', [
            'posyandu_id' => $this->posyandu->id,
            'nama_lengkap' => 'Anak Test',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-05-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar',
            'nik' => '12345',
        ])->assertStatus(422)->assertJsonValidationErrors(['nik']);

        // NIK 17 digit
        $this->actingAs($this->kader)->postJson('/api/children', [
            'posyandu_id' => $this->posyandu->id,
            'nama_lengkap' => 'Anak Test',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-05-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar',
            'nik' => '32010101010100001',
        ])->assertStatus(422)->assertJsonValidationErrors(['nik']);

        // KK bukan 16 digit
        $this->actingAs($this->kader)->postJson('/api/children', [
            'posyandu_id' => $this->posyandu->id,
            'nama_lengkap' => 'Anak Test',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-05-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar',
            'nomor_kk' => '320101',
        ])->assertStatus(422)->assertJsonValidationErrors(['nomor_kk']);

        // Valid 16 digit NIK & KK
        $this->actingAs($this->kader)->postJson('/api/children', [
            'posyandu_id' => $this->posyandu->id,
            'nama_lengkap' => 'Anak Valid',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-05-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar',
            'nik' => '3201010101010099',
            'nomor_kk' => '3201010101010088',
        ])->assertCreated();
    }

    public function test_parent_nik_16_digits_and_indonesian_phone_format(): void
    {
        // NIK orang tua salah & telepon nomor rumah/luar negeri
        $this->actingAs($this->kader)->postJson('/api/parents', [
            'nama_lengkap' => 'Orang Tua Baru',
            'nik' => '123',
            'nomor_telepon' => '0211234567',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['nik', 'nomor_telepon']);

        // Telepon acak huruf
        $this->actingAs($this->kader)->postJson('/api/parents', [
            'nama_lengkap' => 'Orang Tua Baru',
            'nomor_telepon' => 'not-a-phone',
        ])->assertStatus(422)->assertJsonValidationErrors(['nomor_telepon']);

        // Valid: 08... dan +628...
        $this->actingAs($this->kader)->postJson('/api/parents', [
            'nama_lengkap' => 'Orang Tua Valid 1',
            'nik' => '3201010101019991',
            'nomor_telepon' => '081234567890',
        ])->assertCreated();

        $this->actingAs($this->kader)->postJson('/api/parents', [
            'nama_lengkap' => 'Orang Tua Valid 2',
            'nik' => '3201010101019992',
            'nomor_telepon' => '+6281234567890',
        ])->assertCreated();
    }

    public function test_kader_nik_16_digits_and_indonesian_phone_format(): void
    {
        // NIK salah & No HP salah
        $this->actingAs($this->admin)->postJson('/api/kader', [
            'posyandu_id' => $this->posyandu->id,
            'nama_kader' => 'Kader Baru',
            'nik_kader' => '99999',
            'no_hp' => '022123456',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['nik_kader', 'no_hp']);

        // Valid 16 digit dan 08...
        $this->actingAs($this->admin)->postJson('/api/kader', [
            'posyandu_id' => $this->posyandu->id,
            'nama_kader' => 'Kader Valid',
            'nik_kader' => '3201010101015555',
            'no_hp' => '085712345678',
        ])->assertCreated();
    }
}
