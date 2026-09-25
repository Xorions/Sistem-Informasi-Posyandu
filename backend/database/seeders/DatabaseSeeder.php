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
            EducationSeeder::class,
            ChildParentSeeder::class,
            ExaminationSeeder::class,
        ]);
    }
}
