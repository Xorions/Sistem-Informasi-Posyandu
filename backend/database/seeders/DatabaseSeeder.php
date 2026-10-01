<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PosyanduSeeder::class,
            UserSeeder::class,
            KaderSeeder::class,
            EducationSeeder::class,
            ChildParentSeeder::class,
            // Setelah ChildParentSeeder: butuh baris tabel parents untuk tautan akun.
            OrangTuaSeeder::class,
            IbuHamilSeeder::class,
            ExaminationSeeder::class,
        ]);
    }
}