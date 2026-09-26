<?php

namespace Database\Seeders;

use App\Models\Child;
use App\Models\Examination;
use App\Models\GrowthRecord;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PosyanduDemoSeeder extends Seeder
{
    public function run(): void
    {
        $posyandu = Posyandu::firstOrCreate(
            ['kode_posyandu' => 'PSY-MELATI'],
            [
                'nama_posyandu' => 'Posyandu Melati',
                'alamat' => 'Balai RW 05',
                'desa_kelurahan' => 'Desa Sehat',
                'kecamatan' => 'Kecamatan Makmur',
                'kabupaten_kota' => 'Kabupaten Sentosa',
                'provinsi' => 'Jawa Timur',
                'nama_ketua' => 'Ibu Rahma',
                'nomor_telepon' => '08123456789',
                'status' => 'active',
            ]
        );

        $user = User::firstOrCreate(
            ['email' => 'sari@example.test'],
            [
                'name' => 'Sari',
                'password' => Hash::make('password123'),
                'role' => 'ORANG_TUA',
                'phone' => '081234567890',
            ]
        );
        $user->posyandus()->syncWithoutDetaching([$posyandu->id]);

        $parent = ParentModel::firstOrCreate(
            ['nik' => '3500000000000001'],
            [
                'nama_lengkap' => 'Sari',
                'tempat_lahir' => 'Surabaya',
                'tanggal_lahir' => '1995-05-10',
                'jenis_kelamin' => 'P',
                'alamat' => 'Jl. Mawar No. 12 RW 05',
                'nomor_telepon' => '081234567890',
                'pekerjaan' => 'Ibu Rumah Tangga',
            ]
        );

        $child = Child::firstOrCreate(
            ['nik' => '3500000000000002'],
            [
                'posyandu_id' => $posyandu->id,
                'nama_lengkap' => 'Arka Pratama',
                'nama_panggilan' => 'Arka',
                'tempat_lahir' => 'Surabaya',
                'tanggal_lahir' => Carbon::now()->subMonths(12)->format('Y-m-d'),
                'jenis_kelamin' => 'L',
                'alamat' => 'Jl. Mawar No. 12 RW 05',
                'nomor_kk' => '3500000000000000',
                'status' => 'active',
            ]
        );

        $child->parents()->syncWithoutDetaching([
            $parent->id => ['relationship' => 'Ibu', 'is_primary_contact' => true]
        ]);

        $examiner = User::where('role', 'KADER')->first() ?? $user;

        $exam = Examination::firstOrCreate(
            [
                'child_id' => $child->id,
                'posyandu_id' => $posyandu->id,
                'examination_date' => Carbon::now()->format('Y-m-d')
            ],
            [
                'examiner_id' => $examiner->id,
                'notes' => 'Status: Normal. Tumbuh kembang Arka di jalur tepat.',
                'status' => 'active',
            ]
        );

        GrowthRecord::firstOrCreate(
            ['examination_id' => $exam->id],
            [
                'weight' => 9.80,
                'height' => 75.50,
                'length' => 75.50,
                'head_circumference' => 46.00,
                'arm_circumference' => 14.50,
            ]
        );

        Schedule::firstOrCreate(
            [
                'posyandu_id' => $posyandu->id,
                'title' => 'Jadwal Rutin Timbang & Imunisasi',
                'date' => Carbon::now()->next(Carbon::SATURDAY)->format('Y-m-d')
            ],
            [
                'start_time' => '08:00',
                'end_time' => '11:00',
                'location' => 'Posyandu Melati',
                'description' => 'Bawa KIA dan buku imunisasi ya, Bun.',
                'status' => 'active',
            ]
        );
    }
}
