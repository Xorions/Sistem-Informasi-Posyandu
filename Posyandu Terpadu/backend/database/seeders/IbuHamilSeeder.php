<?php

namespace Database\Seeders;

use App\Models\IbuHamil;
use App\Models\ParentModel;
use App\Models\PemeriksaanBumil;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Data Kesehatan Ibu dan Anak: ibu hamil beserta riwayat pemeriksaan rutinnya.
 *
 * Usia kehamilan dihitung dari HPHT agar konsisten dengan cara perhitungan
 * klinis, bukan disimpan ulang.
 */
class IbuHamilSeeder extends Seeder
{
    public function run(): void
    {
        $posyandus = Posyandu::orderBy('kode_posyandu')->get()->keyBy('kode_posyandu');
        $examiner = User::where('role', 'KADER')->first();

        $data = [
            [
                'parent_nik' => '3201010101010002',
                'posyandu' => 'PSY001',
                'hpht' => '2026-03-05',
                'jarak_kehamilan' => 30,
                'jumlah_anak_lahir' => 2,
                'tinggi_funds' => 32.0,
                'golongan_darah' => 'O',
                'riwayat_penyakit' => null,
            ],
            [
                'parent_nik' => '3201010101010004',
                'posyandu' => 'PSY002',
                'hpht' => '2026-06-20',
                'jarak_kehamilan' => 14,
                'jumlah_anak_lahir' => 1,
                'tinggi_funds' => 30.5,
                'golongan_darah' => 'A',
                'riwayat_penyakit' => 'Riwayat anemia ringan',
            ],
            [
                'parent_nik' => '3201010101010006',
                'posyandu' => 'PSY003',
                'hpht' => '2026-01-12',
                'jarak_kehamilan' => 42,
                'jumlah_anak_lahir' => 3,
                'tinggi_funds' => 33.0,
                'golongan_darah' => 'B',
                'riwayat_penyakit' => null,
            ],
            [
                'parent_nik' => '3201010101010007',
                'posyandu' => 'PSY004',
                'hpht' => '2026-07-08',
                'jarak_kehamilan' => 10,
                'jumlah_anak_lahir' => 0,
                'tinggi_funds' => 29.8,
                'golongan_darah' => 'AB',
                'riwayat_penyakit' => null,
            ],
        ];

        foreach ($data as $d) {
            // Hanya orang tua perempuan yang dapat menjadi ibu hamil.
            $parent = ParentModel::where('nik', $d['parent_nik'])
                ->where('jenis_kelamin', 'P')
                ->first();
            $posyandu = $posyandus[$d['posyandu']] ?? null;

            if (! $parent || ! $posyandu) {
                continue;
            }

            $hpl = Carbon::parse($d['hpht'])->addDays(280);

            $ibuHamil = IbuHamil::firstOrCreate(
                ['parent_id' => $parent->id, 'tanggal_perkiraan_lahir' => $hpl->toDateString()],
                [
                    'posyandu_id' => $posyandu->id,
                    'hpht' => $d['hpht'],
                    'jarak_kehamilan' => $d['jarak_kehamilan'],
                    'jumlah_anak_lahir' => $d['jumlah_anak_lahir'],
                    'tinggi_funds' => $d['tinggi_funds'],
                    'golongan_darah' => $d['golongan_darah'],
                    'riwayat_penyakit' => $d['riwayat_penyakit'],
                    'status' => 'active',
                ]
            );

            if ($ibuHamil->pemeriksaanBumils()->exists()) {
                continue;
            }

            // Tiga pemeriksaan terakhir, satu per trimester.
            foreach ($this->pemeriksaanRows($ibuHamil, $examiner) as $row) {
                PemeriksaanBumil::create($row);
            }
        }
    }

/**
     * @return array<int, array<string, mixed>>
     */
    private function pemeriksaanRows(IbuHamil $ibuHamil, ?User $examiner): array
    {
        $trimesters = [
            ['usia' => 2, 'bb' => 26.5, 'tds' => '120/80', 'lila' => 27.0, 'status' => 'normal'],
            ['usia' => 5, 'bb' => 27.8, 'tds' => '125/85', 'lila' => 28.0, 'status' => 'normal'],
            ['usia' => 8, 'bb' => 29.4, 'tds' => '130/85', 'lila' => 26.8, 'status' => 'perlu_perhatian'],
        ];

        $catatan = [
            'normal' => 'Lanjutkan ASI eksklusif dan periksa rutin bulanan.',
            'perlu_perhatian' => 'Tekanan darah mendekati batas. Anjurkan diet rendah garam dan kontrol 2 minggu lagi.',
        ];

        $rows = [];

        foreach ($trimesters as $t) {
            $tanggal = $ibuHamil->hpht
                ? Carbon::parse($ibuHamil->hpht)->addWeeks($t['usia'])
                : Carbon::now()->subWeeks($t['usia']);

            $rows[] = [
                'ibu_hamil_id' => $ibuHamil->id,
                'examiner_id' => $examiner?->id,
                'tanggal_periksa' => $tanggal->toDateString(),
                'usia_kehamilan' => $t['usia'],
                'berat_badan' => $t['bb'],
                'tinggi_badan' => 158.0,
                'tekanan_darah' => $t['tds'],
                'lingkar_lengan_atas' => $t['lila'],
                'tinggi_funds' => $ibuHamil->tinggi_funds,
                'denyut_jantung_janin' => 140,
                'posisi_janin' => 'Belum dapat ditentukan',
                'keluhan' => $t['status'] === 'normal' ? 'Tidak ada keluhan' : 'Mual dan pusing pada sore hari',
                'catatan' => $catatan[$t['status']],
                'status' => $t['status'],
            ];
        }

        return $rows;
    }
}