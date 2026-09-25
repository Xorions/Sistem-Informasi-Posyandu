<?php

namespace Database\Seeders;

use App\Models\Posyandu;
use Illuminate\Database\Seeder;

class PosyanduSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['kode_posyandu' => 'PSY001', 'nama_posyandu' => 'Posyandu Melati A', 'alamat' => 'Jl. Melati No.1', 'desa_kelurahan' => 'Desa Sukamaju', 'kecamatan' => 'Kec. Sukamaju', 'kabupaten_kota' => 'Kab. Bandung', 'provinsi' => 'Jawa Barat', 'nama_ketua' => 'Ibu Siti', 'nomor_telepon' => '081234567001', 'status' => 'active'],
            ['kode_posyandu' => 'PSY002', 'nama_posyandu' => 'Posyandu Mawar B', 'alamat' => 'Jl. Mawar No.2', 'desa_kelurahan' => 'Desa Sukamaju', 'kecamatan' => 'Kec. Sukamaju', 'kabupaten_kota' => 'Kab. Bandung', 'provinsi' => 'Jawa Barat', 'nama_ketua' => 'Ibu Ani', 'nomor_telepon' => '081234567002', 'status' => 'active'],
            ['kode_posyandu' => 'PSY003', 'nama_posyandu' => 'Posyandu Anggrek C', 'alamat' => 'Jl. Anggrek No.3', 'desa_kelurahan' => 'Desa Sukamaju', 'kecamatan' => 'Kec. Sukamaju', 'kabupaten_kota' => 'Kab. Bandung', 'provinsi' => 'Jawa Barat', 'nama_ketua' => 'Ibu Rina', 'nomor_telepon' => '081234567003', 'status' => 'active'],
        ];
        foreach ($data as $d) {
            Posyandu::firstOrCreate(['kode_posyandu' => $d['kode_posyandu']], $d);
        }
    }
}
