<?php

namespace App\Services;

use App\Models\Child;
use App\Models\Examination;
use App\Models\SpecialCareEnrollment;
use Carbon\Carbon;

class SpecialCareCandidateService
{
    public function __construct(
        protected GrowthAnalysisService $growthAnalysisService
    ) {}

    /**
     * Evaluasi pemeriksaan dan tandai anak sebagai kandidat penanganan khusus jika memenuhi kriteria.
     *
     * Idempotent: Mengembalikan null jika anak sudah memiliki enrollment berstatus 'candidate' atau 'active'.
     * JANGAN PERNAH membuat peserta dengan status 'active' secara otomatis.
     */
    public function evaluate(Examination $examination): ?SpecialCareEnrollment
    {
        $child = $examination->child ?? Child::find($examination->child_id);
        if (! $child) {
            return null;
        }

        // Idempotency: jika anak sudah berstatus candidate atau active, jangan buat duplikat
        $hasOpenEnrollment = SpecialCareEnrollment::where('child_id', $child->id)
            ->whereIn('status', ['candidate', 'active'])
            ->exists();

        if ($hasOpenEnrollment) {
            return null;
        }

        $criteria = $this->analyzeCandidateCriteria($examination);
        if (! $criteria) {
            return null;
        }

        // Simpan sebagai CANDIDATE saja. JANGAN aktif otomatis.
        $enrollment = SpecialCareEnrollment::create([
            'child_id' => $child->id,
            'posyandu_id' => $examination->posyandu_id ?? $child->posyandu_id,
            'track' => $criteria['track'],
            'trigger_indicators' => $criteria['trigger_indicators'],
            'status' => 'candidate',
            'perlu_rujukan' => $criteria['perlu_rujukan'],
            'alasan_masuk' => implode('; ', $criteria['reasons']),
            'entry_examination_id' => $examination->id,
            'entry_date' => null,
            'exit_date' => null,
            'alasan_keluar' => null,
            'exit_examination_id' => null,
            'confirmed_by' => null,
            'notes' => null,
        ]);

        $user = auth()->user();
        AuditLogService::log(
            'CREATE',
            'special_care_enrollment',
            $enrollment->id,
            null,
            array_merge($enrollment->toArray(), [
                'status_sebelumnya' => null,
                'status_baru' => 'candidate',
                'alasan' => $enrollment->alasan_masuk,
                'siapa' => [
                    'id' => $user?->id,
                    'name' => $user?->name ?? 'Sistem Posyandu',
                    'role' => $user?->role instanceof \BackedEnum ? $user->role->value : ($user?->role ?? 'SYSTEM'),
                ],
                'kapan' => now()->toIso8601String(),
            ])
        );

        return $enrollment;
    }

    /**
     * Analisis kriteria kelayakan kandidat penanganan khusus tanpa persistensi.
     */
    public function analyzeCandidateCriteria(Examination $examination): ?array
    {
        $child = $examination->child ?? Child::find($examination->child_id);
        $growth = $examination->growthRecord;

        if (! $child || ! $growth) {
            return null;
        }

        $ageMonths = Carbon::parse($child->tanggal_lahir)->diffInMonths(Carbon::parse($examination->examination_date));
        $ageMonths = max(0, (int) $ageMonths);

        $isWasting = false;
        $isStunting = false;
        $perluRujukan = false;
        $reasons = [];
        $triggerIndicators = [];

        // 1. Evaluasi Wasting (Gizi Akut)
        $wastingCutoff = (float) config('special_care.wasting.candidate_lila_cm', 12.5);
        $referralCutoff = (float) config('special_care.wasting.referral_lila_cm', 11.5);
        $lila = $growth->arm_circumference !== null ? (float) $growth->arm_circumference : null;

        if ($ageMonths >= 6) {
            if ($lila !== null && $lila < $wastingCutoff) {
                $isWasting = true;
                $triggerIndicators[] = 'lila';
                $reasons[] = "LiLA {$lila} cm (< {$wastingCutoff} cm)";
                if ($lila < $referralCutoff) {
                    $perluRujukan = true;
                    $reasons[] = "LiLA sangat rendah (< {$referralCutoff} cm)";
                }
            }
        }

        // Analisis deviasi berat badan dan tinggi badan lewat GrowthAnalysisService
        $analysis = $this->growthAnalysisService->analyze($child, $examination);
        $weightAnalysis = $analysis['indicators']['weight'] ?? null;
        $heightAnalysis = $analysis['indicators']['height'] ?? null;

        if ($weightAnalysis && in_array($weightAnalysis['label'], [
            GrowthAnalysisService::LABELS['lanjut'],
            GrowthAnalysisService::LABELS['konsultasi'],
        ])) {
            $isWasting = true;
            $triggerIndicators[] = 'weight';
            if ($ageMonths < 6) {
                // Bayi < 6 bulan: kontraindikasi PMT padat/biskuit (wajib ASI eksklusif). Ditandai perlu tinjauan bidan/rujukan faskes.
                $perluRujukan = true;
                $reasons[] = "Bayi < 6 bulan: Berat badan {$growth->weight} kg ({$weightAnalysis['label']}) - Perlu ditinjau bidan (Konseling ASI Eksklusif & Rujukan Faskes, Tanpa PMT)";
            } else {
                $reasons[] = "Berat badan {$growth->weight} kg ({$weightAnalysis['label']})";
                if ($weightAnalysis['label'] === GrowthAnalysisService::LABELS['konsultasi']) {
                    $perluRujukan = true;
                }
            }
        }

        // 2. Evaluasi Stunting (Gizi Kronis)
        $stuntingEnabled = (bool) config('special_care.stunting.enabled', true);
        if ($stuntingEnabled && $heightAnalysis) {
            $heightVal = $growth->height ?? $growth->length;
            if (in_array($heightAnalysis['label'], [
                GrowthAnalysisService::LABELS['lanjut'],
                GrowthAnalysisService::LABELS['konsultasi'],
            ])) {
                $isStunting = true;
                $triggerIndicators[] = 'height';
                $reasons[] = "Tinggi/panjang badan {$heightVal} cm ({$heightAnalysis['label']})";
                if ($heightAnalysis['label'] === GrowthAnalysisService::LABELS['konsultasi']) {
                    $perluRujukan = true;
                }
            }
        }

        // 3. Evaluasi Tanda Klinis / Edema pada Catatan Pemeriksaan (WHO/Permenkes)
        if (! empty($examination->notes) && preg_match('/\b(edema|oedema|pembengkakan\s+kaki|tanda\s+bahaya)\b/i', $examination->notes)) {
            $isWasting = true;
            $perluRujukan = true;
            $triggerIndicators[] = 'edema';
            $reasons[] = 'Tanda klinis/edema tercatat pada pemeriksaan (Perlu Rujukan Medis Segera)';
        }

        // Jika tidak ada kriteria yang terpenuhi, bukan kandidat
        if (! $isWasting && ! $isStunting) {
            return null;
        }

        // Tentukan track
        $track = match (true) {
            $isWasting && $isStunting => 'both',
            $isWasting => 'wasting',
            default => 'stunting',
        };

        return [
            'track' => $track,
            'trigger_indicators' => array_values(array_unique($triggerIndicators)),
            'perlu_rujukan' => $perluRujukan,
            'reasons' => $reasons,
        ];
    }

    /**
     * Evaluasi ulang kandidat saat pemeriksaan diupdate.
     */
    public function handleExaminationUpdated(Examination $examination): void
    {
        $examination->loadMissing(['child', 'growthRecord']);
        $candidate = SpecialCareEnrollment::where('child_id', $examination->child_id)
            ->where('status', 'candidate')
            ->first();

        $criteria = $this->analyzeCandidateCriteria($examination);

        if ($candidate) {
            $old = $candidate->toArray();
            if (! $criteria) {
                // Tidak lagi memenuhi kriteria kandidat setelah perbaikan data pemeriksaan
                $candidate->update([
                    'status' => 'cancelled',
                    'alasan_keluar' => 'Data pemeriksaan diperbarui: indikator tidak lagi memenuhi kriteria kandidat',
                    'exit_date' => now()->toDateString(),
                ]);
                $user = auth()->user();
                AuditLogService::log(
                    'UPDATE',
                    'special_care_enrollment',
                    $candidate->id,
                    $old,
                    array_merge($candidate->toArray(), [
                        'status_sebelumnya' => 'candidate',
                        'status_baru' => 'cancelled',
                        'alasan' => $candidate->alasan_keluar,
                        'siapa' => [
                            'id' => $user?->id,
                            'name' => $user?->name ?? 'Sistem Posyandu',
                            'role' => $user?->role instanceof \BackedEnum ? $user->role->value : ($user?->role ?? 'SYSTEM'),
                        ],
                        'kapan' => now()->toIso8601String(),
                    ])
                );
            } else {
                // Perbarui kriteria kandidat
                $candidate->update([
                    'track' => $criteria['track'],
                    'trigger_indicators' => $criteria['trigger_indicators'],
                    'perlu_rujukan' => $criteria['perlu_rujukan'],
                    'alasan_masuk' => implode('; ', $criteria['reasons']),
                ]);
            }
        } elseif ($criteria) {
            // Belum ada kandidat dan data baru sekarang memenuhi syarat
            $this->evaluate($examination);
        }
    }

    /**
     * Evaluasi ulang saat pemeriksaan dibatalkan/voided.
     */
    public function handleExaminationVoided(Examination $examination, ?string $reason = null): void
    {
        $candidates = SpecialCareEnrollment::where('child_id', $examination->child_id)
            ->where('status', 'candidate')
            ->get();

        $user = auth()->user();
        foreach ($candidates as $candidate) {
            $old = $candidate->toArray();
            $candidate->update([
                'status' => 'cancelled',
                'alasan_keluar' => 'Pemeriksaan dasar dibatalkan (voided): ' . ($reason ?? 'Dibatalkan'),
                'exit_date' => now()->toDateString(),
            ]);
            AuditLogService::log(
                'UPDATE',
                'special_care_enrollment',
                $candidate->id,
                $old,
                array_merge($candidate->toArray(), [
                    'status_sebelumnya' => 'candidate',
                    'status_baru' => 'cancelled',
                    'alasan' => $candidate->alasan_keluar,
                    'siapa' => [
                        'id' => $user?->id,
                        'name' => $user?->name ?? 'Sistem Posyandu',
                        'role' => $user?->role instanceof \BackedEnum ? $user->role->value : ($user?->role ?? 'SYSTEM'),
                    ],
                    'kapan' => now()->toIso8601String(),
                ])
            );
        }

        // Tandai enrollment aktif bila pemeriksaan masuk dibatalkan
        $activeEnrollments = SpecialCareEnrollment::where('entry_examination_id', $examination->id)
            ->where('status', 'active')
            ->get();

        foreach ($activeEnrollments as $act) {
            $act->update([
                'notes' => trim(($act->notes ?? '') . ' [PERINGATAN: Pemeriksaan masuk #' . $examination->id . ' telah dibatalkan]'),
            ]);
        }
    }
}
