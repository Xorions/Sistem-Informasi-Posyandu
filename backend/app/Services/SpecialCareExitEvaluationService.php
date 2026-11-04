<?php

namespace App\Services;

use App\Models\Child;
use App\Models\Examination;
use App\Models\SpecialCareEnrollment;
use Carbon\Carbon;

class SpecialCareExitEvaluationService
{
    public function __construct(
        protected GrowthAnalysisService $growthAnalysisService
    ) {}

    /**
     * Hitung kelayakan keluar dari program penanganan khusus sesuai konfigurasi.
     *
     * HANYA menghasilkan usulan; tidak mengubah status database secara otomatis.
     */
    public function evaluate(SpecialCareEnrollment $enrollment): array
    {
        $wastingConfig = config('special_care.wasting', []);
        $stuntingConfig = config('special_care.stunting', []);

        $minDurationDays = (int) ($wastingConfig['min_duration_days'] ?? 90);
        $consecutiveRequired = (int) ($wastingConfig['consecutive_recoveries_required'] ?? 2);
        $recoveryLila = (float) ($wastingConfig['recovery_lila_cm'] ?? 12.5);
        $exitMode = (string) ($wastingConfig['exit_mode'] ?? 'strict');
        $stuntingAutoExit = (bool) ($stuntingConfig['auto_exit'] ?? false);

        $daysInProgram = $enrollment->days_in_program ?? 0;
        $durationMet = $daysInProgram >= $minDurationDays;

        $reasons = [];
        $blockers = [];

        if (! $enrollment->isActive()) {
            return [
                'eligible' => false,
                'status' => $enrollment->status,
                'track' => $enrollment->track,
                'days_in_program' => $daysInProgram,
                'min_duration_days' => $minDurationDays,
                'duration_met' => false,
                'consecutive_recoveries' => 0,
                'consecutive_required' => $consecutiveRequired,
                'recoveries_met' => false,
                'exit_mode' => $exitMode,
                'latest_examination_id' => null,
                'suggested_exit_date' => null,
                'reasons' => [],
                'blockers' => ['Enrollment tidak berstatus aktif.'],
            ];
        }

        // Jalur stunting murni tidak ada usulan keluar otomatis jika auto_exit nonaktif
        if ($enrollment->track === 'stunting' && ! $stuntingAutoExit) {
            return [
                'eligible' => false,
                'status' => $enrollment->status,
                'track' => $enrollment->track,
                'days_in_program' => $daysInProgram,
                'min_duration_days' => $minDurationDays,
                'duration_met' => $durationMet,
                'consecutive_recoveries' => 0,
                'consecutive_required' => $consecutiveRequired,
                'recoveries_met' => false,
                'exit_mode' => $exitMode,
                'latest_examination_id' => null,
                'suggested_exit_date' => null,
                'reasons' => $durationMet ? ["Durasi intervensi telah mencapai {$daysInProgram} hari."] : [],
                'blockers' => ['Jalur stunting memerlukan evaluasi klinis langsung oleh tenaga kesehatan / dokter spesialis anak (tidak ada kelulusan otomatis).'],
            ];
        }

        if ($durationMet) {
            $reasons[] = "Durasi intervensi telah mencapai {$daysInProgram} hari (target minimal {$minDurationDays} hari).";
        } else {
            $blockers[] = "Durasi intervensi baru {$daysInProgram} hari (belum memenuhi target minimal {$minDurationDays} hari).";
        }

        // Ambil riwayat pemeriksaan aktif sejak tanggal masuk
        $child = $enrollment->child;
        $triggerIndicators = $enrollment->trigger_indicators ?? [];
        $examinations = Examination::with('growthRecord')
            ->where('child_id', $enrollment->child_id)
            ->where('status', 'active')
            ->whereDate('examination_date', '>=', $enrollment->entry_date)
            ->orderBy('examination_date', 'desc')
            ->get();

        $consecutiveRecoveries = 0;
        foreach ($examinations as $exam) {
            if ($this->isExaminationRecovered($child, $exam, $recoveryLila, $exitMode, $triggerIndicators)) {
                $consecutiveRecoveries++;
            } else {
                break;
            }
        }

        $recoveriesMet = $consecutiveRecoveries >= $consecutiveRequired;

        if ($recoveriesMet) {
            $reasons[] = "Telah mencapai {$consecutiveRecoveries} pemeriksaan berturut-turut dalam rentang pemulihan (target minimal {$consecutiveRequired} kali).";
        } else {
            $blockers[] = "Pemeriksaan pulih berturut-turut baru {$consecutiveRecoveries} kali (target minimal {$consecutiveRequired} kali).";
        }

        $eligible = $durationMet && $recoveriesMet;
        $latestExam = $examinations->first();
        $suggestedExitDate = ($eligible && $latestExam)
            ? Carbon::parse($latestExam->examination_date)->format('Y-m-d')
            : null;

        if ($eligible) {
            $reasons[] = 'Memenuhi seluruh kriteria usulan kelulusan program.';
        }

        return [
            'eligible' => $eligible,
            'status' => $enrollment->status,
            'track' => $enrollment->track,
            'days_in_program' => $daysInProgram,
            'min_duration_days' => $minDurationDays,
            'duration_met' => $durationMet,
            'consecutive_recoveries' => $consecutiveRecoveries,
            'consecutive_required' => $consecutiveRequired,
            'recoveries_met' => $recoveriesMet,
            'exit_mode' => $exitMode,
            'latest_examination_id' => $latestExam?->id,
            'suggested_exit_date' => $suggestedExitDate,
            'reasons' => $reasons,
            'blockers' => $blockers,
        ];
    }

    /**
     * Periksa apakah satu pemeriksaan berada dalam rentang pemulihan.
     */
    public function isExaminationRecovered(
        Child $child,
        Examination $exam,
        float $recoveryLila,
        string $exitMode,
        ?array $triggerIndicators = null
    ): bool {
        $growth = $exam->growthRecord;
        if (! $growth) {
            return false;
        }

        $ageMonths = Carbon::parse($child->tanggal_lahir)->diffInMonths(Carbon::parse($exam->examination_date));
        $ageMonths = max(0, (int) $ageMonths);

        // LiLA pulih jika >= cutoff (valid usia >= 6 bulan; di bawah 6 bulan diabaikan)
        $lila = $growth->arm_circumference !== null ? (float) $growth->arm_circumference : null;
        $lilaRecovered = ($ageMonths < 6) ? true : ($lila !== null && $lila >= $recoveryLila);

        // Berat badan pulih jika tidak berstatus lanjut/konsultasi
        $analysis = $this->growthAnalysisService->analyze($child, $exam);
        $weightAnalysis = $analysis['indicators']['weight'] ?? null;
        $weightRecovered = $weightAnalysis && ! in_array($weightAnalysis['label'], [
            GrowthAnalysisService::LABELS['lanjut'],
            GrowthAnalysisService::LABELS['konsultasi'],
        ]);

        // Jika ada trigger indicators spesifik
        if (! empty($triggerIndicators)) {
            $hasLilaTrigger = in_array('lila', $triggerIndicators, true);
            $hasWeightTrigger = in_array('weight', $triggerIndicators, true);

            if ($hasLilaTrigger && $hasWeightTrigger) {
                return match ($exitMode) {
                    'any' => $lilaRecovered || $weightRecovered,
                    default => $lilaRecovered && $weightRecovered,
                };
            }

            if ($hasLilaTrigger) {
                return $lilaRecovered;
            }

            if ($hasWeightTrigger) {
                return $weightRecovered;
            }
        }

        return match ($exitMode) {
            'any' => $lilaRecovered || $weightRecovered,
            default => $lilaRecovered && $weightRecovered, // 'strict'
        };
    }
}
