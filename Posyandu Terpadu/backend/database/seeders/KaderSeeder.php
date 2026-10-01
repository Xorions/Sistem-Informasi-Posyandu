<?php

namespace Database\Seeders;

use App\Models\Kader;
use App\Models\Posyandu;
use Illuminate\Database\Seeder;

/**
 * Profil kader untuk keempat posyandu.
 *
 * Setiap kader ditautkan ke akun login KADER dengan NIK yang sama, sehingga
 * satu orang tidak terduplikasi di dua tabel.
 */
class KaderSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'posyandu' => 'PSY001',
                'nama_kader' => 'Siti Nurhayati',
                'nik_kader' => '3201014503780001',
                'no_hp' => '081200000001',
                'jabatan' => 'Ketua Posyandu',
                'pendidikan' => 'S1',
                'tanggal_mulai_tugas' => '2019-02-01',
            ],
            [
                'posyandu' => 'PSY001',
                'nama_kader' => 'Dewi Anggraini',
                'nik_kader' => '3201015205850002',
                'no_hp' => '081200000002',
                'jabatan' => 'Kader',
                'pendidikan' => 'SMA',
                'tanggal_mulai_tugas' => '2021-06-15',
            ],
            [
                'posyandu' => 'PSY002',
                'nama_kader' => 'Ani Rahmawati',
                'nik_kader' => '3201014810830003',
                'no_hp' => '081200000003',
                'jabatan' => 'Ketua Posyandu',
                'pendidikan' => 'S1',
                'tanggal_mulai_tugas' => '2018-09-01',
            ],
            [
                'posyandu' => 'PSY002',
                'nama_kader' => 'Putri Handayani',
                'nik_kader' => '3201016002900004',
                'no_hp' => '081200000004',
                'jabatan' => 'Kader',
                'pendidikan' => 'D3',
                'tanggal_mulai_tugas' => '2022-01-10',
            ],
            [
                'posyandu' => 'PSY003',
                'nama_kader' => 'Rina Marlina',
                'nik_kader' => '3201015505770005',
                'no_hp' => '081200000005',
                'jabatan' => 'Ketua Posyandu',
                'pendidikan' => 'S2',
                'tanggal_mulai_tugas' => '2017-03-20',
            ],
            [
                'posyandu' => 'PSY003',
                'nama_kader' => 'Lina Marliana',
                'nik_kader' => '3201016509950006',
                'no_hp' => '081200000006',
                'jabatan' => 'Kader',
                'pendidikan' => 'SMA',
                'tanggal_mulai_tugas' => '2023-05-02',
            ],
            [
                'posyandu' => 'PSY004',
                'nama_kader' => 'Dewi Lestari',
                'nik_kader' => '3201014911820007',
                'no_hp' => '081200000007',
                'jabatan' => 'Ketua Posyandu',
                'pendidikan' => 'S1',
                'tanggal_mulai_tugas' => '2019-11-05',
            ],
            [
                'posyandu' => 'PSY004',
                'nama_kader' => 'Maya Sari',
                'nik_kader' => '3201017011900008',
                'no_hp' => '081200000008',
                'jabatan' => 'Kader',
                'pendidikan' => 'D3',
                'tanggal_mulai_tugas' => '2022-08-22',
            ],
        ];

        foreach ($data as $d) {
            $posyandu = Posyandu::where('kode_posyandu', $d['posyandu'])->first();

            if (! $posyandu) {
                continue;
            }

            $kader = Kader::firstOrCreate(
                ['nik_kader' => $d['nik_kader']],
                [
                    'posyandu_id' => $posyandu->id,
                    'nama_kader' => $d['nama_kader'],
                    'no_hp' => $d['no_hp'],
                    'jabatan' => $d['jabatan'],
                    'pendidikan' => $d['pendidikan'],
                    'alamat' => 'Desa Sukamaju',
                    'tanggal_mulai_tugas' => $d['tanggal_mulai_tugas'],
                    'status' => 'active',
                ]
            );

            // Tautkan ke akun login KADER pada posyandu yang sama bila tersedia.
            $user = \App\Models\User::where('role', 'KADER')
                ->whereHas('posyandus', fn ($q) => $q->where('posyandu_id', $posyandu->id))
                ->first();

            if ($user && ! $kader->user_id) {
                $kader->forceFill(['user_id' => $user->id])->save();
            }
        }
    }
}