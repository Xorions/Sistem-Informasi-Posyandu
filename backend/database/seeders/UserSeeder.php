<?php

namespace Database\Seeders;

use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $posyanduA = Posyandu::where('kode_posyandu', 'PSY001')->first();
        $posyanduB = Posyandu::where('kode_posyandu', 'PSY002')->first();
        $posyanduC = Posyandu::where('kode_posyandu', 'PSY003')->first();
        $users = [
            ['name' => 'Super Admin', 'email' => 'superadmin@example.test', 'password' => Hash::make('password123'), 'role' => 'SUPER_ADMIN', 'phone' => '081000000001', 'posyandus' => []],
            ['name' => 'Admin Desa', 'email' => 'admin@example.test', 'password' => Hash::make('password123'), 'role' => 'ADMIN_POSYANDU', 'phone' => '081000000002', 'posyandus' => [$posyanduA->id, $posyanduB->id, $posyanduC->id]],
            ['name' => 'Admin Posyandu A', 'email' => 'admin.a@example.test', 'password' => Hash::make('password123'), 'role' => 'ADMIN_POSYANDU', 'phone' => '081000000003', 'posyandus' => [$posyanduA->id]],
            ['name' => 'Kader A', 'email' => 'kader@example.test', 'password' => Hash::make('password123'), 'role' => 'KADER', 'phone' => '081000000004', 'posyandus' => [$posyanduA->id]],
            ['name' => 'Kader B', 'email' => 'kader.b@example.test', 'password' => Hash::make('password123'), 'role' => 'KADER', 'phone' => '081000000005', 'posyandus' => [$posyanduB->id]],
            ['name' => 'Kader C', 'email' => 'kader.c@example.test', 'password' => Hash::make('password123'), 'role' => 'KADER', 'phone' => '081000000006', 'posyandus' => [$posyanduC->id]],
            ['name' => 'Orang Tua Demo', 'email' => 'orangtua@example.test', 'password' => Hash::make('password123'), 'role' => 'ORANG_TUA', 'phone' => '081000000007', 'posyandus' => [$posyanduA->id]],
        ];
        foreach ($users as $u) {
            $pos = $u['posyandus'];
            unset($u['posyandus']);
            $user = User::firstOrCreate(['email' => $u['email']], $u);
            if (! empty($pos)) {
                $user->posyandus()->syncWithoutDetaching($pos);
            }
        }
    }
}
