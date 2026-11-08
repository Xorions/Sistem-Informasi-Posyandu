<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PreviewDatabaseSeeder extends Seeder
{
    /**
     * Seed preview database safely without default development credentials.
     */
    public function run(): void
    {
        // 1. Ensure master posyandu data exists
        if (Posyandu::count() === 0) {
            $this->command?->info('Seeding master Posyandu data...');
            $this->call(PosyanduSeeder::class);
        }

        // 2. Check if admin user already exists
        $adminExists = User::where('role', Role::ADMIN->value)->exists();

        if ($adminExists) {
            $this->command?->info('Admin user already exists in preview database. Skipping account creation.');
            return;
        }

        // 3. Generate random password for preview administrator
        $randomPassword = Str::password(16, letters: true, numbers: true, symbols: false);
        $email = 'admin.preview@posyandu-terpadu.internal';

        $admin = User::create([
            'name' => 'Preview Administrator',
            'email' => $email,
            'password' => Hash::make($randomPassword),
            'role' => Role::ADMIN->value,
            'phone' => '081000009999',
        ]);

        $posyanduIds = Posyandu::pluck('id')->all();
        if (!empty($posyanduIds)) {
            $admin->posyandus()->sync($posyanduIds);
        }

        // Output credentials clearly to CI/CD output
        $this->command?->newLine();
        $this->command?->line('========================================================');
        $this->command?->info(' [PREVIEW] Safe preview administrator created successfully');
        $this->command?->line('  Email    : ' . $email);
        $this->command?->line('  Password : ' . $randomPassword);
        $this->command?->comment(' Copy this password from CI log to access preview environment.');
        $this->command?->line('========================================================');
        $this->command?->newLine();
    }
}
