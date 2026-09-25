<?php

namespace App\Services;

use App\Models\Child;
use App\Models\Examination;
use App\Models\GrowthStandard;
use Carbon\Carbon;

class GrowthAnalysisService
{
    // Labels per spec
    const LABELS = [
        'sesuai' => 'Sesuai Pemantauan',
        'perhatian' => 'Perlu Perhatian',
        'lanjut' => 'Perlu Pemantauan Lebih Lanjut',
        'konsultasi' => 'Perlu Konsultasi Tenaga Kesehatan',
    ];

    /**
     * Analyze growth for a given child based on latest examination
     * Uses GrowthStandard if available, otherwise fallback to simple rule-based
     * Never diagnose disease.
     */
    public function analyze(Child $child, ?Examination $examination = null): array
    {
        if (! $examination) {
            $examination = $child->examinations()->with('growthRecord')->latest('examination_date')->first();
            if (! $examination) {
                return $this->emptyResult('Belum ada data pemeriksaan untuk analisis.');
            }
        }
        $growth = $examination->growthRecord;
        if (! $growth) {
            return $this->emptyResult('Belum ada data pertumbuhan pada pemeriksaan ini.');
        }
        $ageMonths = Carbon::parse($child->tanggal_lahir)->diffInMonths(Carbon::parse($examination->examination_date));
        // fallback age 0 if future? ensure non-negative
        $ageMonths = max(0, $ageMonths);
        $gender = $child->jenis_kelamin;
        $results = [];
        $overall = self::LABELS['sesuai'];
        $worstScore = 0; // 0 sesuai, 1 perhatian, 2 lanjut, 3 konsultasi
        $indicators = [
            'weight' => $growth->weight,
            'height' => $growth->height ?? $growth->length,
            'head_circumference' => $growth->head_circumference,
            'arm_circumference' => $growth->arm_circumference,
        ];
        foreach ($indicators as $indicator => $value) {
            if ($value === null) {
                $results[$indicator] = [
                    'value' => null,
                    'status' => 'Tidak ada data',
                    'label' => 'Tidak ada data',
                    'message' => 'Data tidak tersedia untuk indikator ini.',
                ];

                continue;
            }
            $analysis = $this->analyzeIndicator($indicator, $gender, $ageMonths, (float) $value);
            $results[$indicator] = $analysis;
            $score = $this->labelToScore($analysis['label']);
            if ($score > $worstScore) {
                $worstScore = $score;
                $overall = $analysis['label'];
            }
        }
        // LiLA special: if arm <12.5 for >6mo maybe perlu perhatian but we keep configurable
        $summary = $this->generateSummary($results, $overall, $ageMonths, $gender);

        return [
            'child_id' => $child->id,
            'examination_id' => $examination->id,
            'age_months' => $ageMonths,
            'gender' => $gender,
            'indicators' => $results,
            'overall_status' => $overall,
            'summary' => $summary,
            'analyzed_at' => now()->toIso8601String(),
        ];
    }

    private function analyzeIndicator(string $indicator, string $gender, int $ageMonths, float $value): array
    {
        // Try to find growth_standards
        $standards = GrowthStandard::where('indicator', $indicator)
            ->whereIn('gender', [$gender, 'ALL'])
            ->where('age_min', '<=', $ageMonths)
            ->where('age_max', '>=', $ageMonths)
            ->get();
        if ($standards->isEmpty()) {
            // Fallback simple heuristic (non-medical arbitrary plausible ranges)
            return $this->fallbackAnalysis($indicator, $ageMonths, $value);
        }
        // Use standards: expect reference_value as median or cutoff
        // For MVP: if value deviates >15% from reference => perlu perhatian, >25% => lanjut, >35% => konsultasi
        // But direction matters: we take absolute; TODO replace with official Z-score when standards loaded
        $ref = $standards->first()->reference_value;
        $deviation = $ref != 0 ? abs($value - $ref) / $ref : 0;
        if ($deviation <= 0.15) {
            $label = self::LABELS['sesuai'];
        } elseif ($deviation <= 0.25) {
            $label = self::LABELS['perhatian'];
        } elseif ($deviation <= 0.35) {
            $label = self::LABELS['lanjut'];
        } else {
            $label = self::LABELS['konsultasi'];
        }

        return [
            'value' => $value,
            'reference' => $ref,
            'deviation_percent' => round($deviation * 100, 1),
            'label' => $label,
            'status' => $label,
            'message' => $this->messageForLabel($label, $indicator),
            'source' => $standards->first()->source ?? 'Standar konfigurasi sistem',
        ];
    }

    private function fallbackAnalysis(string $indicator, int $ageMonths, float $value): array
    {
        // Very light heuristic: Provide generic monitoring labels based on plausible thresholds
        // This is NOT medical diagnosis - just screening reminder
        // We use age-adjusted plausible intervals stored as arrays
        $ranges = $this->getPlausibleRanges($indicator);
        // Find range for age
        $range = null;
        foreach ($ranges as $r) {
            if ($ageMonths >= $r[0] && $ageMonths <= $r[1]) {
                $range = $r;
                break;
            }
        }
        if (! $range) {
            $range = end($ranges);
        }
        [$min, $max] = [$range[2], $range[3]];
        // Simple logic: inside range => sesuai, slightly outside => perhatian, far => konsultasi
        if ($value >= $min && $value <= $max) {
            $label = self::LABELS['sesuai'];
        } elseif ($value >= $min * 0.85 && $value <= $max * 1.15) {
            $label = self::LABELS['perhatian'];
        } elseif ($value >= $min * 0.7 && $value <= $max * 1.30) {
            $label = self::LABELS['lanjut'];
        } else {
            $label = self::LABELS['konsultasi'];
        }

        // Special for LiLA: WHO cutoff 12.5 cm for acute, 11.5 severe (not used as diagnosis)
        if ($indicator === 'arm_circumference' && $ageMonths >= 6) {
            if ($value < 11.5) {
                $label = self::LABELS['konsultasi'];
            } elseif ($value < 12.5) {
                $label = self::LABELS['lanjut'];
            }
        }

        return [
            'value' => $value,
            'plausible_min' => $min,
            'plausible_max' => $max,
            'label' => $label,
            'status' => $label,
            'message' => $this->messageForLabel($label, $indicator).' (Rentang pemantauan: '.$min.' - '.$max.')',
            'source' => 'Rentang pemantauan internal (konfigurasi, bukan diagnosis medis)',
        ];
    }

    private function getPlausibleRanges(string $indicator): array
    {
        // [age_min, age_max, min, max] - very approximate, illustrative
        return match ($indicator) {
            'weight' => [[0, 6, 2.5, 8], [6, 12, 6, 11], [12, 24, 8, 14], [24, 60, 10, 20]],
            'height','length' => [[0, 6, 45, 70], [6, 12, 65, 80], [12, 24, 75, 90], [24, 60, 85, 110]],
            'head_circumference' => [[0, 6, 35, 45], [6, 12, 42, 48], [12, 24, 44, 50], [24, 60, 46, 52]],
            'arm_circumference' => [[0, 6, 10, 15], [6, 12, 11, 16], [12, 24, 12, 17], [24, 60, 13, 18]],
            default => [[0, 60, 0, 100]],
        };
    }

    private function labelToScore(string $label): int
    {
        return match ($label) {
            self::LABELS['sesuai'] => 0,
            self::LABELS['perhatian'] => 1,
            self::LABELS['lanjut'] => 2,
            self::LABELS['konsultasi'] => 3,
            default => 0,
        };
    }

    private function messageForLabel(string $label, string $indicator): string
    {
        $ind = match ($indicator) {
            'weight' => 'Berat badan',
            'height','length' => 'Tinggi/panjang badan',
            'head_circumference' => 'Lingkar kepala',
            'arm_circumference' => 'Lingkar lengan atas (LiLA)',
            default => $indicator,
        };

        return match ($label) {
            self::LABELS['sesuai'] => "$ind dalam rentang pemantauan. Lanjutkan pemantauan rutin.",
            self::LABELS['perhatian'] => "$ind perlu perhatian. Pantau lebih sering dan pastikan asupan gizi sesuai usia.",
            self::LABELS['lanjut'] => "$ind perlu pemantauan lebih lanjut. Jadwalkan kunjungan berikutnya lebih dekat.",
            self::LABELS['konsultasi'] => "$ind perlu konsultasi tenaga kesehatan. Segera konsultasikan dengan bidan/dokter/petugas kesehatan.",
            default => '',
        };
    }

    private function generateSummary(array $results, string $overall, int $ageMonths, string $gender): string
    {
        $countConcern = collect($results)->filter(fn ($r) => in_array($r['label'] ?? '', [self::LABELS['perhatian'], self::LABELS['lanjut'], self::LABELS['konsultasi']]))->count();
        if ($countConcern === 0) {
            return "Secara umum pertumbuhan terpantau sesuai untuk usia $ageMonths bulan. Tetap lakukan pemantauan rutin di Posyandu.";
        }
        if ($overall === self::LABELS['konsultasi']) {
            return 'Terdapat indikator yang perlu konsultasi tenaga kesehatan. Segera konsultasikan dengan petugas kesehatan terdekat.';
        }
        if ($overall === self::LABELS['lanjut']) {
            return 'Beberapa indikator perlu pemantauan lebih lanjut. Pantau pertumbuhan pada kunjungan berikutnya dan perhatikan variasi makanan sesuai usia.';
        }

        return 'Ada indikator yang perlu perhatian. Perhatikan variasi makanan sesuai usia dan pantau pertumbuhan berikutnya.';
    }

    private function emptyResult(string $msg): array
    {
        return [
            'overall_status' => 'Belum ada data',
            'summary' => $msg,
            'indicators' => [],
            'analyzed_at' => now()->toIso8601String(),
        ];
    }

    public function analyzeHistory(Child $child): array
    {
        $exams = $child->examinations()->with('growthRecord')->orderBy('examination_date')->get();
        $history = [];
        foreach ($exams as $ex) {
            $history[] = $this->analyze($child, $ex);
        }

        return $history;
    }
}
