<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\ParentModel;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Akun demo ORANG_TUA.
 *
 * Dijalankan setelah ChildParentSeeder agar `parent_id` bisa diisi. Akun ini
 * hanya akan melihat anak-anaknya sendiri, bukan seluruh anak di posyandu.
 */
class OrangTuaSeeder extends Seeder
{
    public function run(): void
    {
        // Siti Aminah adalah ibu dari anak-anak bernomor genap.
        $ibu = ParentModel::where('nik', '3201010101010002')->first();

        if (! $ibu) {
            return;
        }

        User::firstOrCreate(
            ['email' => 'orangtua@example.test'],
            [
                'name' => $ibu->nama_lengkap,
                'password' => Hash::make('password123'),
                'role' => Role::ORANG_TUA->value,
                'phone' => $ibu->nomor_telepon,
                'parent_id' => $ibu->id,
            ]
        );
    }
}