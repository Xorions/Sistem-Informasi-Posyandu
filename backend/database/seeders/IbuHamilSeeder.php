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
 * Data Kesehatan Ibu dan Anak: satu ibu hamil per posyandu beserta riwayat
 * pemeriksaan rutinnya.
 *
 * Ibu dipilih secara dinamis dari tabel `parents` (ibu yang punya anak
 * terdaftar di posyandu tersebut), supaya tetap konsisten meskipun data
 * anak dan orang tua berubah.
 *
 * Usia kehamilan dihitung dari HPHT agar sesuai cara perhitungan klinis,
 * bukan disimpan ulang.
 */
class IbuHamilSeeder extends Seeder
{
    /** Kondisi kehamilan per kode posyandu, dibuat agarspread antar trimester. */
    private const KONDISI = [
        'PSY001' => ['minggu' => 12, 'jarak' => 26, 'anak_lahir' => 2, 'fundus' => 25.0, 'golongan' => 'O', 'riwayat' => null],
        'PSY002' => ['minggu' => 24, 'jarak' => 14, 'anak_lahir' => 1, 'fundus' => 30.5, 'golongan' => 'A', 'riwayat' => 'Riwayat anemia ringan'],
        'PSY003' => ['minggu' => 36, 'jarak' => 40, 'anak_lahir' => 3, 'fundus' => 33.0, 'golongan' => 'B', 'riwayat' => null],
        'PSY004' => ['minggu' => 8, 'jarak' => 10, 'anak_lahir' => 0, 'fundus' => 22.5, 'golongan' => 'AB', 'riwayat' => null],
    ];

    public function run(): void
    {
        $examiner = User::where('role', 'KADER')->first();

        foreach (self::KONDISI as $kode => $kondisi) {
            $ibu = $this->pilihIbu($kode);

            if (! $ibu) {
                continue;
            }

            $hpht = now()->subWeeks($kondisi['minggu']);
            $hpl = $hpht->copy()->addDays(280);

            $ibuHamil = IbuHamil::firstOrCreate(
                ['parent_id' => $ibu->id, 'posyandu_id' => $ibu->getAttribute('posyandu_id')],
                [
                    'hpht' => $hpht->toDateString(),
                    'tanggal_perkiraan_lahir' => $hpl->toDateString(),
                    'jarak_kehamilan' => $kondisi['jarak'],
                    'jumlah_anak_lahir' => $kondisi['anak_lahir'],
                    'tinggi_funds' => $kondisi['fundus'],
                    'golongan_darah' => $kondisi['golongan'],
                    'riwayat_penyakit' => $kondisi['riwayat'],
                    'status' => 'active',
                ]
            );

            if ($ibuHamil->pemeriksaanBumils()->exists()) {
                continue;
            }

            foreach ($this->pemeriksaanRows($ibuHamil, $examiner) as $row) {
                PemeriksaanBumil::create($row);
            }
        }
    }

    /**
     * Ibu yang punya anak terdaftar di posyandu tertentu.
     * Memakai relasi pivot `child_parent` dengan relationship 'Ibu'.
     */
    private function pilihIbu(string $kodePosyandu): ?ParentModel
    {
        $posyandu = Posyandu::where('kode_posyandu', $kodePosyandu)->first();

        if (! $posyandu) {
            return null;
        }

        $ibu = ParentModel::where('jenis_kelamin', 'P')
            ->whereHas('children', fn ($q) => $q->where('posyandu_id', $posyandu->id))
            ->first();

        if (! $ibu) {
            return null;
        }

        // Dipakai untuk mengisi posyandu_id pada record ibu hamil.
        $ibu->setAttribute('posyandu_id', $posyandu->id);

        return $ibu;
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
            $tanggal = Carbon::parse($ibuHamil->hpht)->addWeeks($t['usia']);

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