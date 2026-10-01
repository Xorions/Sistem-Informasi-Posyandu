<?php

namespace Database\Seeders;

use App\Models\Child;
use App\Models\ParentModel;
use App\Models\Posyandu;
use Illuminate\Database\Seeder;

/**
 * Data anak dan orang tua/wali untuk keempat posyandu.
 *
 * Jumlah anak mengikuti data lapangan:
 *   PSY001 Cut Nyak Dien : 14
 *   PSY002 Kartika       : 15
 *   PSY003 Kartini       : 17
 *   PSY004 Raden Intan   : 15
 *
 * Anak dikelompokkan dalam keluarga dua bersaudara dan tetap berada di
 * posyandu yang sama, sesuai kondisi pendaftaran pada buku KIA.
 */
class ChildParentSeeder extends Seeder
{
    /** Jumlah anak per kode posyandu. */
    private const JUMLAH_ANAK = [
        'PSY001' => 14,
        'PSY002' => 15,
        'PSY003' => 17,
        'PSY004' => 15,
    ];

    private const NAMA_LAKI = [
        'Ahmad', 'Bagus', 'Dimas', 'Eko', 'Fajar', 'Galih', 'Hendra', 'Irfan',
        'Joko', 'Kevin', 'Lukman', 'Nanda', 'Oscar', 'Panji', 'Rizky', 'Satria',
        'Taufik', 'Wahyu', 'Yusuf', 'Zaki',
    ];

    private const NAMA_PEREMPUAN = [
        'Anisa', 'Bunga', 'Citra', 'Dewi', 'Endah', 'Fitri', 'Gita', 'Hesti',
        'Indah', 'Julia', 'Kartika', 'Lina', 'Maya', 'Nadia', 'Olivia', 'Putri',
        'Rina', 'Sari', 'Tiara', 'Wulan',
    ];

    private const NAMA_KELUARGA = [
        'Saputra', 'Wijaya', 'Hidayat', 'Nugroho', 'Setiawan',
        'Permata', 'Ramadhan', 'Maulana', 'Kusuma', 'Pratama',
    ];

    private const PEKERJAAN_LAKI = ['Petani', 'Wiraswasta', 'Buruh', 'Nelayan', 'Pedagang', 'Tukang'];

    private const PEKERJAAN_PEREMPUAN = ['Ibu Rumah Tangga', 'Guru', 'Pedagang', 'Penjahit', 'Perawat'];

    public function run(): void
    {
        $posyandus = Posyandu::orderBy('kode_posyandu')->get()->keyBy('kode_posyandu');

        $counterLaki = 0;
        $counterPerempuan = 0;
        $counterKeluarga = 0;
        $noUrut = 1;

        foreach (self::JUMLAH_ANAK as $kode => $jumlah) {
            $posyandu = $posyandus[$kode] ?? null;

            if (! $posyandu) {
                continue;
            }

            for ($i = 0; $i < $jumlah; $i++) {
                $jenisKelamin = $i % 2 === 0 ? 'P' : 'L';

                // Dua anak berbagi satu keluarga agar ada saudara sekandung,
                // dan tetap terdaftar di posyandu yang sama.
if ($i % 2 === 0) {
                    $counterKeluarga++;
                    $keluarga = $this->namaKeluarga($counterKeluarga);
                    $ayah = $this->buatOrangTua($keluarga['ayah'], 'L', $counterLaki++);
                    $ibu = $this->buatOrangTua($keluarga['ibu'], 'P', $counterPerempuan++);
                }

                $namaAnak = $this->namaAnak($jenisKelamin, $counterLaki, $counterPerempuan);
                $tanggalLahir = $this->tanggalLahir();

                $anak = Child::create([
                    'posyandu_id' => $posyandu->id,
                    'nik' => $this->nik($noUrut++),
                    'nama_lengkap' => $namaAnak,
                    'nama_panggilan' => explode(' ', $namaAnak)[0],
                    'tempat_lahir' => 'Bandung',
                    'tanggal_lahir' => $tanggalLahir,
                    'jenis_kelamin' => $jenisKelamin,
                    'alamat' => 'Desa Sukamaju RT '.(($i % 8) + 1).' RW 0'.(($counterKeluarga % 3) + 1),
                    'nomor_kk' => '32010100000000'.str_pad((string) $noUrut, 3, '0', STR_PAD_LEFT),
                    'status' => 'active',
                ]);

                if ($ayah) {
                    $anak->parents()->attach($ayah->id, [
                        'relationship' => 'Ayah',
                        'is_primary_contact' => false,
                    ]);
                }

                if ($ibu) {
                    $anak->parents()->attach($ibu->id, [
                        'relationship' => 'Ibu',
                        'is_primary_contact' => true,
                    ]);
                }
            }

            // Keluarga tidak boleh lintas posyandu, jadi reset penanda di
            // akhir tiap posyandu agar anak berikutnya tidak ikut
            // memakai keluarga posyandu sebelumnya.
            unset($ayah, $ibu);
        }
    }

    /** @return array{ayah: string, ibu: string} */
    private function namaKeluarga(int $index): array
    {
        $a = self::NAMA_KELUARGA[$index % count(self::NAMA_KELUARGA)];
        $b = self::NAMA_KELUARGA[($index * 3 + 1) % count(self::NAMA_KELUARGA)];

        return ['ayah' => $a, 'ibu' => $b];
    }

    private function buatOrangTua(string $namaKeluarga, string $jenisKelamin, int $index): ParentModel
    {
        $namaDepan = $jenisKelamin === 'L'
            ? self::NAMA_LAKI[$index % count(self::NAMA_LAKI)]
            : self::NAMA_PEREMPUAN[$index % count(self::NAMA_PEREMPUAN)];

        $tahunLahir = $jenisKelamin === 'L' ? 1985 + ($index % 15) : 1988 + ($index % 13);

        return ParentModel::create([
            'nik' => $this->nikOrangTua($index, $jenisKelamin),
            'nama_lengkap' => $namaDepan.' '.$namaKeluarga,
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => $tahunLahir.'-0'.(($index % 9) + 1).'-1'.($index % 9),
            'jenis_kelamin' => $jenisKelamin,
            'alamat' => 'Desa Sukamaju',
            'nomor_telepon' => '0812'.str_pad((string) (3_000_000 + $index), 7, '0', STR_PAD_LEFT),
            'pekerjaan' => $jenisKelamin === 'L'
                ? self::PEKERJAAN_LAKI[$index % count(self::PEKERJAAN_LAKI)]
                : self::PEKERJAAN_PEREMPUAN[$index % count(self::PEKERJAAN_PEREMPUAN)],
        ]);
    }

    private function namaAnak(string $jenisKelamin, int $indexLaki, int $indexPerempuan): string
    {
        $namaDepan = $jenisKelamin === 'L'
            ? self::NAMA_LAKI[$indexLaki % count(self::NAMA_LAKI)]
            : self::NAMA_PEREMPUAN[$indexPerempuan % count(self::NAMA_PEREMPUAN)];

        $namaKeluarga = self::NAMA_KELUARGA[($indexLaki + $indexPerempuan) % count(self::NAMA_KELUARGA)];

        return $namaDepan.' '.$namaKeluarga;
    }

    /** Usia anak 3 bulan sampai 5 tahun, tersebar merata. */
    private function tanggalLahir(): string
    {
        $bulan = 3 + random_int(0, 57);

        return now()->subMonths($bulan)->toDateString();
    }

    private function nik(int $urut): string
    {
        return '320101'.str_pad((string) $urut, 4, '0', STR_PAD_LEFT).'000'.($urut % 10);
    }

/**
 * NIK 16 digit:pria berakhir angka ganjil, wanita angka genap.
 * Dipakai juga sebagai penjaga agar tidak ada NIK kembar.
 */
private function nikOrangTua(int $index, string $jenisKelamin): string
{
$nomor = 32_010_101_010_100_000 + ($index * 2) + ($jenisKelamin === 'L' ? 1 : 2);

return (string) $nomor;
}
}