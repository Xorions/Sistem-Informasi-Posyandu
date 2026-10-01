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
        // Schedules
        foreach (Posyandu::all() as $pos) {
            Schedule::firstOrCreate(['posyandu_id' => $pos->id, 'title' => 'Posyandu Rutin'], [
                'date' => now()->addDays(rand(5, 20))->format('Y-m-d'),
                'start_time' => '08:00',
                'end_time' => '11:00',
                'location' => $pos->alamat,
                'description' => 'Kegiatan Posyandu rutin bulanan',
                'status' => 'scheduled',
            ]);
        }
        // Immunizations & vitamin
        $vaccines = ['BCG', 'Polio 0', 'Polio 1', 'Polio 3', 'Polio 4', 'DPT HB 1', 'DPT HB 2', 'DPT HB 3', 'Campak', 'Hepatitis B'];
        foreach ($children->take(5) as $child) {
            foreach (array_slice($vaccines, 0, rand(3, 5)) as $v) {
                Immunization::firstOrCreate(
                    ['child_id' => $child->id, 'jenis' => 'VAKSIN', 'vaccine_name' => $v],
                    [
                        'vaccination_date' => Carbon::parse($child->tanggal_lahir)->addMonths(rand(1, 12))->format('Y-m-d'),
                        'status' => 'sudah',
                        'batch' => 'BATCH-'.rand(1000, 9999),
                        'recorded_by' => $kader->id,
                    ]
                );
            }

            // Vitamin A diberikan setiap 6 bulan, mulai usia 6 bulan.
            $vitamins = ['Vitamin A Merah', 'Vitamin A Biru', 'Vitamin D'];
            foreach (array_slice($vitamins, 0, rand(1, 3)) as $v) {
                Immunization::firstOrCreate(
                    ['child_id' => $child->id, 'jenis' => 'VITAMIN', 'vaccine_name' => $v],
                    [
                        'vaccination_date' => Carbon::parse($child->tanggal_lahir)->addMonths(rand(6, 30))->format('Y-m-d'),
                        'status' => 'sudah',
                        'recorded_by' => $kader->id,
                    ]
                );
            }
        }

        // Vitamin untuk seluruh anak, supaya filter jenis pada modul
        // imunisasi/vitamin punya data di semua posyandu.
        foreach ($children->skip(5) as $child) {
            Immunization::firstOrCreate(
                ['child_id' => $child->id, 'jenis' => 'VITAMIN', 'vaccine_name' => 'Vitamin A Merah'],
                [
                    'vaccination_date' => Carbon::parse($child->tanggal_lahir)->addMonths(6)->format('Y-m-d'),
                    'status' => 'sudah',
                    'recorded_by' => $kader->id,
                ]
            );
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
