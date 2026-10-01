<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Akun demo ORANG_TUA.
 *
 * Dijalankan setelah ChildParentSeeder. Akun ini ditautkan ke satu ibu di
 * posyandu pertama, sehingga hanya melihat anak-anaknya sendiri dan bukan
 * seluruh anak di posyandu tersebut.
 */
class OrangTuaSeeder extends Seeder
{
    public function run(): void
    {
        $posyandu = Posyandu::orderBy('kode_posyandu')->first();

        if (! $posyandu) {
            return;
        }

        // Ibu pertama yang punya anak di posyandu pertama.
        $ibu = ParentModel::where('jenis_kelamin', 'P')
            ->whereHas('children', fn ($q) => $q->where('posyandu_id', $posyandu->id))
            ->first();

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
