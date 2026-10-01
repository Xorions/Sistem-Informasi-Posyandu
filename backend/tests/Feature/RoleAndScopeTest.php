<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Child;
use App\Models\IbuHamil;
use App\Models\Immunization;
use App\Models\Kader;
use App\Models\ParentModel;
use App\Models\PemeriksaanBumil;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mengunci aturan main yang diminta:
 * 1. hanya ada 3 role,
 * 2. orang tua hanya melihat anaknya sendiri,
 * 3. kader hanya melihat posyandu yang ditugaskan,
 * 4. modul baru (kader, ibu hamil, pemeriksaan bumil, imunisasi) tersedia.
 */
class RoleAndScopeTest extends TestCase
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
            'name' => 'Uji '.$role->value,
            'email' => strtolower($role->value).'-'.uniqid().'@example.test',
            'password' => 'password123',
            'role' => $role->value,
            'parent_id' => $parent?->id,
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

    public function test_role_hanya_tiga(): void
    {
        $this->assertSame(['ADMIN', 'KADER', 'ORANG_TUA'], Role::values());

        $roles = User::query()->pluck('role')->unique()->all();
        $this->assertEmpty($roles);
    }

    public function test_admin_melihat_seluruh_anak(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $this->makeChild('Anak A', $this->posyanduA);
        $this->makeChild('Anak B', $this->posyanduB);

        $response = $this->actingAs($admin)->getJson('/api/children');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_kader_hanya_melihat_posyandu_yang_ditugaskan(): void
    {
        $kader = $this->makeUser(Role::KADER, $this->posyanduA);
        $anakLokal = $this->makeChild('Anak Lokal', $this->posyanduA);
        $anakLain = $this->makeChild('Anak Posyandu Lain', $this->posyanduB);

        $response = $this->actingAs($kader)->getJson('/api/children');

        $response->assertOk();
        $this->assertSame(['Anak Lokal'], array_column($response->json('data'), 'nama_lengkap'));

        // Akses detail di luar cakupan harus ditolak.
        $this->actingAs($kader)
            ->getJson("/api/children/{$anakLain->id}")
            ->assertForbidden();

        $this->actingAs($kader)
            ->getJson("/api/children/{$anakLokal->id}")
            ->assertOk();
    }

    public function test_orang_tua_hanya_melihat_anaknya_sendiri(): void
    {
        $ortu = ParentModel::create([
            'nama_lengkap' => 'Siti Aminah',
            'jenis_kelamin' => 'P',
            'alamat' => 'Desa Sukamaju',
        ]);

        $orangTua = $this->makeUser(Role::ORANG_TUA, null, $ortu);

        // Satu anak di posyandu yang sama, satu di posyandu berbeda.
        $anakSendiri = $this->makeChild('Anak Sendiri', $this->posyanduA, $ortu);
        $anakOrangLain = $this->makeChild('Anak Orang Lain', $this->posyanduA);

        $response = $this->actingAs($orangTua)->getJson('/api/children');

        $response->assertOk();
        $this->assertSame(['Anak Sendiri'], array_column($response->json('data'), 'nama_lengkap'));

        $this->actingAs($orangTua)
            ->getJson("/api/children/{$anakSendiri->id}")
            ->assertOk();

        // Meskipun satu posyandu, anak milik orang lain tidak boleh terbaca.
        $this->actingAs($orangTua)
            ->getJson("/api/children/{$anakOrangLain->id}")
            ->assertForbidden();
    }

    public function test_orang_tua_tidak_bisa_menulis_data(): void
    {
        $ortu = ParentModel::create(['nama_lengkap' => 'Siti Aminah', 'jenis_kelamin' => 'P']);
        $orangTua = $this->makeUser(Role::ORANG_TUA, null, $ortu);

        $this->actingAs($orangTua)
            ->postJson('/api/children', [
                'posyandu_id' => $this->posyanduA->id,
                'nama_lengkap' => 'Anak Baru',
                'tempat_lahir' => 'Bandung',
                'tanggal_lahir' => '2024-01-01',
                'jenis_kelamin' => 'P',
                'alamat' => 'Desa Sukamaju',
            ])
            ->assertForbidden();

        $this->actingAs($orangTua)
            ->postJson('/api/immunizations', [
                'child_id' => 1,
                'vaccine_name' => 'BCG',
                'status' => 'sudah',
            ])
            ->assertForbidden();
    }

    public function test_orang_tua_dibatasi_dari_modul_kader_dan_ibu_hamil(): void
    {
        $ortu = ParentModel::create(['nama_lengkap' => 'Siti Aminah', 'jenis_kelamin' => 'P']);
        $orangTua = $this->makeUser(Role::ORANG_TUA, null, $ortu);

        $this->actingAs($orangTua)->getJson('/api/kader')->assertForbidden();
        $this->actingAs($orangTua)->getJson('/api/ibu-hamil')->assertForbidden();
        $this->actingAs($orangTua)->getJson('/api/users')->assertForbidden();
        $this->actingAs($orangTua)->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_hanya_admin_yang_bisa_mengelola_kader_dan_pengguna(): void
    {
        $kader = $this->makeUser(Role::KADER, $this->posyanduA);
        $admin = $this->makeUser(Role::ADMIN);

        $this->actingAs($kader)->getJson('/api/users')->assertForbidden();
        $this->actingAs($kader)->postJson('/api/kader', [
            'posyandu_id' => $this->posyanduA->id,
            'nama_kader' => 'Kader Baru',
        ])->assertForbidden();

        $this->actingAs($admin)->getJson('/api/users')->assertOk();
        $this->actingAs($admin)->postJson('/api/kader', [
            'posyandu_id' => $this->posyanduA->id,
            'nama_kader' => 'Kader Baru',
            'nik_kader' => '3201014503780001',
        ])->assertCreated();

        $this->assertDatabaseHas('kader', ['nama_kader' => 'Kader Baru']);
    }

    public function test_kader_hanya_melihat_kader_posyandunya(): void
    {
        $kader = $this->makeUser(Role::KADER, $this->posyanduA);

        Kader::create(['posyandu_id' => $this->posyanduA->id, 'nama_kader' => 'Kader A']);
        Kader::create(['posyandu_id' => $this->posyanduB->id, 'nama_kader' => 'Kader B']);

        $response = $this->actingAs($kader)->getJson('/api/kader');

        $response->assertOk();
        $this->assertSame(['Kader A'], array_column($response->json('data'), 'nama_kader'));
    }

    public function test_modul_ibu_hamil_dan_pemeriksaan_berjalan(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $ibu = ParentModel::create(['nama_lengkap' => 'Dewi Lestari', 'jenis_kelamin' => 'P']);

        $ibuHamil = IbuHamil::create([
            'parent_id' => $ibu->id,
            'posyandu_id' => $this->posyanduA->id,
            'hpht' => now()->subWeeks(12)->toDateString(),
            'tanggal_perkiraan_lahir' => now()->addDays(196)->toDateString(),
            'tinggi_funds' => 24.5,
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/ibu-hamil');
        $response->assertOk();
        $this->assertSame('Dewi Lestari', $response->json('data.0.nama_ibu'));
        // 12 minggu-developer pada trimester pertama.
        $this->assertSame(1, $response->json('data.0.trimester'));

        $this->actingAs($admin)->postJson('/api/pemeriksaan-bumil', [
            'ibu_hamil_id' => $ibuHamil->id,
            'tanggal_periksa' => now()->toDateString(),
            'usia_kehamilan' => 12,
            'tekanan_darah' => '120/80',
            'berat_badan' => 58.5,
            'lingkar_lengan_atas' => 26.5,
            'status' => 'normal',
        ])->assertCreated();

        $this->assertDatabaseHas('pemeriksaan_bumil', [
            'ibu_hamil_id' => $ibuHamil->id,
            'tekanan_darah' => '120/80',
        ]);

        $this->assertSame(1, PemeriksaanBumil::count());
    }

    public function test_tekanan_darah_tidak_valid_ditolak(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $ibu = ParentModel::create(['nama_lengkap' => 'Dewi Lestari', 'jenis_kelamin' => 'P']);

        $ibuHamil = IbuHamil::create([
            'parent_id' => $ibu->id,
            'posyandu_id' => $this->posyanduA->id,
            'tanggal_perkiraan_lahir' => now()->addDays(200)->toDateString(),
            'status' => 'active',
        ]);

        $this->actingAs($admin)->postJson('/api/pemeriksaan-bumil', [
            'ibu_hamil_id' => $ibuHamil->id,
            'tanggal_periksa' => now()->toDateString(),
            'usia_kehamilan' => 8,
            'tekanan_darah' => 'tekanan tinggi',
        ])->assertStatus(422);
    }

    public function test_imunisasi_dipisahkan_vaksin_dan_vitamin(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $anak = $this->makeChild('Anak Imunisasi', $this->posyanduA);

        Immunization::create([
            'child_id' => $anak->id,
            'jenis' => 'VAKSIN',
            'vaccine_name' => 'BCG',
            'vaccination_date' => now()->toDateString(),
            'status' => 'sudah',
        ]);

        Immunization::create([
            'child_id' => $anak->id,
            'jenis' => 'VITAMIN',
            'vaccine_name' => 'Vitamin A Merah',
            'vaccination_date' => now()->toDateString(),
            'status' => 'sudah',
        ]);

        $vaksin = $this->actingAs($admin)->getJson('/api/immunizations?jenis=VAKSIN');
        $vaksin->assertOk();
        $this->assertSame(1, count($vaksin->json('data')));
        $this->assertSame('VAKSIN', $vaksin->json('data.0.jenis'));

        $vitamin = $this->actingAs($admin)->getJson('/api/immunizations?jenis=VITAMIN');
        $vitamin->assertOk();
        $this->assertSame(1, count($vitamin->json('data')));
        $this->assertSame('VITAMIN', $vitamin->json('data.0.jenis'));
        $this->assertSame('Vitamin', $vitamin->json('data.0.jenis_label'));
    }

    public function test_akun_orang_tua_wajib_tertaut_profil(): void
    {
        $admin = $this->makeUser(Role::ADMIN);
        $ibu = ParentModel::create(['nama_lengkap' => 'Siti Aminah', 'jenis_kelamin' => 'P']);

        // Tanpa parent_id, akun ORANG_TUA tidak boleh dibuat.
        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'Orang Tua Tanpa Profil',
            'email' => 'tanpa-profil@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => Role::ORANG_TUA->value,
        ])->assertStatus(422);

        $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'Orang Tua Tertaut',
            'email' => 'tertaut@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $ibu->id,
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'tertaut@example.test',
            'role' => Role::ORANG_TUA->value,
            'parent_id' => $ibu->id,
        ]);
    }
}