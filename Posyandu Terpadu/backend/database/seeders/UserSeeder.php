<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Akun ADMIN dan KADER.
 *
 * Akun ORANG_TUA dibuat terpisah di OrangTuaSeeder karena membutuhkan
 * tautan ke baris tabel `parents`, yang baru tersedia setelah
 * ChildParentSeeder berjalan.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $posyandus = Posyandu::orderBy('kode_posyandu')->get()->keyBy('kode_posyandu');

        $users = [
            [
                'name' => 'Admin Posyandu Terpadu',
                'email' => 'admin@example.test',
                'role' => Role::ADMIN->value,
                'phone' => '081000000001',
                'posyandus' => $posyandus->pluck('id')->all(),
            ],
            [
                'name' => 'Admin Cut Nyak Dien',
                'email' => 'admin.cutnyakdien@example.test',
                'role' => Role::ADMIN->value,
                'phone' => '081000000002',
                'posyandus' => [$posyandus['PSY001']->id],
            ],
            [
                'name' => 'Kader Cut Nyak Dien',
                'email' => 'kader@example.test',
                'role' => Role::KADER->value,
                'phone' => '081000000003',
                'posyandus' => [$posyandus['PSY001']->id],
            ],
            [
                'name' => 'Kader Kartika',
                'email' => 'kader.kartika@example.test',
                'role' => Role::KADER->value,
                'phone' => '081000000004',
                'posyandus' => [$posyandus['PSY002']->id],
            ],
            [
                'name' => 'Kader Kartini',
                'email' => 'kader.kartini@example.test',
                'role' => Role::KADER->value,
                'phone' => '081000000005',
                'posyandus' => [$posyandus['PSY003']->id],
            ],
            [
                'name' => 'Kader Raden Intan',
                'email' => 'kader.radenintan@example.test',
                'role' => Role::KADER->value,
                'phone' => '081000000006',
                'posyandus' => [$posyandus['PSY004']->id],
            ],
        ];

        foreach ($users as $u) {
            $posyanduIds = $u['posyandus'];
            unset($u['posyandus']);

            $user = User::firstOrCreate(
                ['email' => $u['email']],
                array_merge($u, ['password' => Hash::make('password123')])
            );

            $user->posyandus()->sync($posyanduIds);
        }
    }
}