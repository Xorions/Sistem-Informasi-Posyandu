<?php

namespace Database\Seeders;

use App\Models\Child;
use App\Models\Examination;
use App\Models\FollowUp;
use App\Models\GrowthStandard;
use App\Models\Immunization;
use App\Models\Posyandu;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ExaminationSeeder extends Seeder
{
    public function run(): void
    {
        $kader = User::where('role', 'KADER')->first();
        if (! $kader) {
            return;
        }
        $children = Child::all();
        foreach ($children as $child) {
            $count = rand(2, 4);
            for ($i = 0; $i < $count; $i++) {
                $date = Carbon::now()->subMonths(rand(0, 5))->subDays(rand(0, 20));
                $exam = Examination::create([
                    'child_id' => $child->id,
                    'posyandu_id' => $child->posyandu_id,
                    'examination_date' => $date->format('Y-m-d'),
                    'examiner_id' => $kader->id,
                    'notes' => 'Pemeriksaan rutin',
                    'status' => 'active',
                ]);
                // plausible growth based on age
                $ageMonths = Carbon::parse($child->tanggal_lahir)->diffInMonths($date);
                $weight = 3 + ($ageMonths * 0.5) + (rand(-10, 10) / 10);
                $weight = max(2.5, min(20, $weight));
                $height = 48 + ($ageMonths * 1.8) + (rand(-5, 5));
                $height = max(45, min(110, $height));
                $head = 35 + ($ageMonths * 0.4) + (rand(-10, 10) / 10);
                $head = max(35, min(52, $head));
                $arm = 11 + ($ageMonths * 0.1) + (rand(-5, 5) / 10);
                $arm = max(10.5, min(18, $arm));
                $exam->growthRecord()->create([
                    'weight' => round($weight, 1),
                    'height' => round($height, 1),
                    'length' => $ageMonths < 24 ? round($height, 1) : null,
                    'head_circumference' => round($head, 1),
                    'arm_circumference' => round($arm, 1),
                ]);
            }
        }
        // Add follow-ups for some
        $followUps = [
            ['type' => 'Pemantauan BB', 'status' => 'pending', 'follow_up_date' => now()->addDays(14)->format('Y-m-d'), 'notes' => 'Perlu pemantauan berat badan'],
            ['type' => 'Konsultasi Gizi', 'status' => 'pending', 'follow_up_date' => now()->addDays(7)->format('Y-m-d'), 'notes' => 'Perlu konsultasi gizi'],
        ];
        foreach ($children->take(2) as $child) {
            foreach ($followUps as $f) {
                FollowUp::firstOrCreate([
                    'child_id' => $child->id,
                    'type' => $f['type'],
                ], array_merge($f, [
                    'posyandu_id' => $child->posyandu_id,
                    'examination_id' => $child->examinations()->first()?->id,
                ]));
            }
        }
        // Schedules: dua kegiatan per posyandu, satu terjadwal dan satu selesai.
        foreach (Posyandu::all() as $pos) {
            Schedule::firstOrCreate(
                ['posyandu_id' => $pos->id, 'title' => 'Posyandu Rutin Bulanan'],
                [
                    'date' => now()->addDays(random_int(5, 20))->format('Y-m-d'),
                    'start_time' => '08:00',
                    'end_time' => '11:00',
                    'location' => $pos->alamat,
                    'description' => 'Penimbangan, pengukuran tinggi, dan pemeriksaan tumbuh kembang.',
                    'status' => 'scheduled',
                ]
            );

            Schedule::firstOrCreate(
                ['posyandu_id' => $pos->id, 'title' => 'Kaderotechnology Imunisasi'],
                [
                    'date' => now()->addDays(random_int(21, 40))->format('Y-m-d'),
                    'start_time' => '09:00',
                    'end_time' => '12:00',
                    'location' => $pos->alamat,
                    'description' => 'Sesi pemberian vaksin dan vitamin sesuai jadwal.',
                    'status' => 'scheduled',
                ]
            );

            Schedule::firstOrCreate(
                ['posyandu_id' => $pos->id, 'title' => 'Posyandu Rutin Bulanan'],
                [
                    'date' => now()->subDays(random_int(10, 25))->format('Y-m-d'),
                    'start_time' => '08:00',
                    'end_time' => '11:00',
                    'location' => $pos->alamat,
                    'description' => 'Kegiatan Posyandu rutin bulan lalu.',
                    'status' => 'completed',
                ]
            );
        }

        /**
         * Imunisasi dan vitamin.
         *
         * Setiap anak mendapat 4-7 vaksin dan 1-2 vitamin. Usia anak
         * menentukan tanggal pemberian sehingga tidak ada vaksin yang
         * tercatat sebelum anak lahir.
         */
        $vaksin = ['BCG', 'Hepatitis B', 'Polio 0', 'Polio 1', 'Polio 2', 'Polio 3', 'Polio 4', 'DPT HB 1', 'DPT HB 2', 'DPT HB 3', 'Campak'];
        $vitamin = ['Vitamin A Merah', 'Vitamin A Biru', 'Vitamin D'];

        foreach ($children as $child) {
            $lahir = Carbon::parse($child->tanggal_lahir);
            $usiaBulan = $lahir->diffInMonths(now());

            foreach (array_slice($vaksin, 0, random_int(4, 7)) as $nama) {
                // Tanggal pemberian dijaga tetap setelah tanggal lahir.
                $bulan = random_int(1, max(2, min(12, $usiaBulan)));

                Immunization::firstOrCreate(
                    ['child_id' => $child->id, 'jenis' => 'VAKSIN', 'vaccine_name' => $nama],
                    [
                        'vaccination_date' => $lahir->copy()->addMonths($bulan)->format('Y-m-d'),
                        'status' => 'sudah',
                        'batch' => 'BATCH-'.random_int(1000, 9999),
                        'recorded_by' => $kader->id,
                    ]
                );
            }

            // Vitamin A mulai diberikan sejak usia 6 bulan.
            if ($usiaBulan >= 6) {
                foreach (array_slice($vitamin, 0, random_int(1, 2)) as $nama) {
                    Immunization::firstOrCreate(
                        ['child_id' => $child->id, 'jenis' => 'VITAMIN', 'vaccine_name' => $nama],
                        [
                            'vaccination_date' => $lahir->copy()->addMonths(random_int(6, max(7, min(30, $usiaBulan))))->format('Y-m-d'),
                            'status' => 'sudah',
                            'recorded_by' => $kader->id,
                        ]
                    );
                }
            }
        }
        // Growth standards dummy
        $indicators = ['weight', 'height', 'head_circumference', 'arm_circumference'];
        foreach ($indicators as $ind) {
            for ($age = 0; $age < 60; $age += 6) {
                $val = match ($ind) {
                    'weight' => 3 + ($age * 0.45),
                    'height' => 50 + ($age * 1.5),
                    'head_circumference' => 35 + ($age * 0.35),
                    'arm_circumference' => 11 + ($age * 0.1),
                    default => 10,
                };
                GrowthStandard::firstOrCreate(['indicator' => $ind, 'gender' => 'ALL', 'age_min' => $age, 'age_max' => $age + 5], [
                    'reference_type' => 'median',
                    'reference_value' => round($val, 1),
                    'source' => 'Internal median approximation (ganti dengan standar resmi)',
                    'version' => '1.0',
                ]);
            }
        }
    }
}
