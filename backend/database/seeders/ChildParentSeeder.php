<?php

namespace Database\Seeders;

use App\Models\Child;
use App\Models\ParentModel;
use App\Models\Posyandu;
use Illuminate\Database\Seeder;

class ChildParentSeeder extends Seeder
{
    public function run(): void
    {
        $posyandus = Posyandu::all();
        $parentsData = [
            ['nik' => '3201010101010001', 'nama_lengkap' => 'Budi Santoso', 'jenis_kelamin' => 'L', 'pekerjaan' => 'Petani', 'nomor_telepon' => '081111111001'],
            ['nik' => '3201010101010002', 'nama_lengkap' => 'Siti Aminah', 'jenis_kelamin' => 'P', 'pekerjaan' => 'Ibu Rumah Tangga', 'nomor_telepon' => '081111111002'],
            ['nik' => '3201010101010003', 'nama_lengkap' => 'Joko Widodo', 'jenis_kelamin' => 'L', 'pekerjaan' => 'Wiraswasta', 'nomor_telepon' => '081111111003'],
            ['nik' => '3201010101010004', 'nama_lengkap' => 'Dewi Lestari', 'jenis_kelamin' => 'P', 'pekerjaan' => 'Guru', 'nomor_telepon' => '081111111004'],
            ['nik' => '3201010101010005', 'nama_lengkap' => 'Ahmad Fauzi', 'jenis_kelamin' => 'L', 'pekerjaan' => 'Buruh', 'nomor_telepon' => '081111111005'],
        ];
        $parents = [];
        foreach ($parentsData as $pd) {
            $parents[] = ParentModel::firstOrCreate(['nik' => $pd['nik']], array_merge($pd, ['alamat' => 'Desa Sukamaju', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '1990-01-01']));
        }
        $childrenData = [
            ['nama_lengkap' => 'Ananda Putra', 'nama_panggilan' => 'Ananda', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2023-03-10', 'jenis_kelamin' => 'L'],
            ['nama_lengkap' => 'Citra Dewi', 'nama_panggilan' => 'Citra', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2022-07-15', 'jenis_kelamin' => 'P'],
            ['nama_lengkap' => 'Bima Sakti', 'nama_panggilan' => 'Bima', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2023-01-20', 'jenis_kelamin' => 'L'],
            ['nama_lengkap' => 'Dina Safitri', 'nama_panggilan' => 'Dina', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2024-02-05', 'jenis_kelamin' => 'P'],
            ['nama_lengkap' => 'Eko Prasetyo', 'nama_panggilan' => 'Eko', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2022-11-30', 'jenis_kelamin' => 'L'],
            ['nama_lengkap' => 'Fani Anggraini', 'nama_panggilan' => 'Fani', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2023-05-12', 'jenis_kelamin' => 'P'],
            ['nama_lengkap' => 'Gilang Ramadhan', 'nama_panggilan' => 'Gilang', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2023-09-18', 'jenis_kelamin' => 'L'],
            ['nama_lengkap' => 'Hana Maulida', 'nama_panggilan' => 'Hana', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2022-09-25', 'jenis_kelamin' => 'P'],
            ['nama_lengkap' => 'Irfan Hakim', 'nama_panggilan' => 'Irfan', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2024-01-10', 'jenis_kelamin' => 'L'],
            ['nama_lengkap' => 'Jihan Aulia', 'nama_panggilan' => 'Jihan', 'tempat_lahir' => 'Bandung', 'tanggal_lahir' => '2023-06-22', 'jenis_kelamin' => 'P'],
        ];
        foreach ($childrenData as $i => $cd) {
            $pos = $posyandus[$i % count($posyandus)];
            $nik = '320101'.str_pad((string) (1000 + $i), 4, '0', STR_PAD_LEFT).'000'.($i + 1);
            $child = Child::firstOrCreate(['nik' => $nik], array_merge($cd, [
                'posyandu_id' => $pos->id,
                'alamat' => 'Desa Sukamaju RT '.($i + 1).' RW 01',
                'nomor_kk' => '320101000000000'.($i + 1),
                'status' => 'active',
            ]));
            // attach 2 parents alternately
            if ($i % 2 == 0) {
                $child->parents()->syncWithoutDetaching([$parents[0]->id => ['relationship' => 'Ayah', 'is_primary_contact' => false], $parents[1]->id => ['relationship' => 'Ibu', 'is_primary_contact' => true]]);
            } else {
                $child->parents()->syncWithoutDetaching([$parents[2]->id => ['relationship' => 'Ayah', 'is_primary_contact' => false], $parents[3]->id => ['relationship' => 'Ibu', 'is_primary_contact' => true]]);
            }
            // occasionally add wali
            if ($i == 2) {
                $child->parents()->syncWithoutDetaching([$parents[4]->id => ['relationship' => 'Wali', 'is_primary_contact' => false]]);
            }
        }
    }
}
