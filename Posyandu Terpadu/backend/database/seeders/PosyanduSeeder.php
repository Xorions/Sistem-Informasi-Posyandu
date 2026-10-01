<?php

namespace Database\Seeders;

use App\Models\Posyandu;
use Illuminate\Database\Seeder;

class PosyanduSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'kode_posyandu' => 'PSY001',
                'nama_posyandu' => 'Posyandu Cut Nyak Dien',
                'alamat' => 'Jl. Cut Nyak Dien No.10',
                'desa_kelurahan' => 'Desa Sukamaju',
                'kecamatan' => 'Kec. Sukamaju',
                'kabupaten_kota' => 'Kab. Bandung',
                'provinsi' => 'Jawa Barat',
                'nama_ketua' => 'Ibu Siti Nurhayati',
                'nomor_telepon' => '081234567001',
                'status' => 'active',
            ],
            [
                'kode_posyandu' => 'PSY002',
                'nama_posyandu' => 'Posyandu Kartika',
                'alamat' => 'Jl. Kartika No.20',
                'desa_kelurahan' => 'Desa Sukamaju',
                'kecamatan' => 'Kec. Sukamaju',
                'kabupaten_kota' => 'Kab. Bandung',
                'provinsi' => 'Jawa Barat',
                'nama_ketua' => 'Ibu Ani Rahmawati',
                'nomor_telepon' => '081234567002',
                'status' => 'active',
            ],
            [
                'kode_posyandu' => 'PSY003',
                'nama_posyandu' => 'Posyandu Kartini',
                'alamat' => 'Jl. Kartini No.30',
                'desa_kelurahan' => 'Desa Sukamaju',
                'kecamatan' => 'Kec. Sukamaju',
                'kabupaten_kota' => 'Kab. Bandung',
                'provinsi' => 'Jawa Barat',
                'nama_ketua' => 'Ibu Rina Marlina',
                'nomor_telepon' => '081234567003',
                'status' => 'active',
            ],
            [
                'kode_posyandu' => 'PSY004',
                'nama_posyandu' => 'Posyandu Raden Intan',
                'alamat' => 'Jl. Raden Intan No.40',
                'desa_kelurahan' => 'Desa Sukamaju',
                'kecamatan' => 'Kec. Sukamaju',
                'kabupaten_kota' => 'Kab. Bandung',
                'provinsi' => 'Jawa Barat',
                'nama_ketua' => 'Ibu Dewi Lestari',
                'nomor_telepon' => '081234567004',
                'status' => 'active',
            ],
        ];

        foreach ($data as $d) {
            Posyandu::firstOrCreate(['kode_posyandu' => $d['kode_posyandu']], $d);
        }
    }
}