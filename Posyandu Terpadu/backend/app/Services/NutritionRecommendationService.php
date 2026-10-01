<?php

namespace App\Services;

class NutritionRecommendationService
{
    public function recommend(array $analysis, int $ageMonths): array
    {
        $overall = $analysis['overall_status'] ?? 'Sesuai Pemantauan';
        $recs = [];
        // Base education
        $recs[] = [
            'title' => 'Pemantauan Rutin',
            'content' => 'Lakukan penimbangan dan pengukuran rutin setiap bulan di Posyandu untuk memantau tren pertumbuhan.',
            'priority' => 'normal',
        ];
        if ($ageMonths < 6) {
            $recs[] = [
                'title' => 'ASI Eksklusif',
                'content' => 'Berikan ASI eksklusif hingga usia 6 bulan. Konsultasikan dengan tenaga kesehatan jika ada kendala menyusui.',
                'priority' => 'high',
            ];
        } elseif ($ageMonths < 12) {
            $recs[] = [
                'title' => 'MPASI Bertahap',
                'content' => 'Perkenalkan MPASI sesuai usia dengan variasi bahan makanan, tekstur bertahap, dan kebersihan yang baik.',
                'priority' => 'high',
            ];
        } else {
            $recs[] = [
                'title' => 'Gizi Seimbang',
                'content' => 'Perhatikan variasi makanan sesuai usia: karbohidrat, protein hewani/nabati, sayur, buah, dan lemak sehat.',
                'priority' => 'high',
            ];
        }

        // Conditional based on overall
        if ($overall === 'Perlu Perhatian') {
            $recs[] = [
                'title' => 'Perhatikan Asupan',
                'content' => 'Pantau asupan harian, pastikan frekuensi makan sesuai anjuran usia, dan catat pertumbuhan pada kunjungan berikutnya.',
                'priority' => 'medium',
            ];
            $recs[] = [
                'title' => 'Konsultasi Kader',
                'content' => 'Diskusikan hasil pemantauan dengan kader Posyandu untuk tindak lanjut yang sesuai.',
                'priority' => 'medium',
            ];
        } elseif ($overall === 'Perlu Pemantauan Lebih Lanjut') {
            $recs[] = [
                'title' => 'Pemantauan Lebih Sering',
                'content' => 'Jadwalkan kunjungan lebih sering (2-4 minggu) untuk melihat tren. Bawa buku KIA dan catatan makan.',
                'priority' => 'high',
            ];
            $recs[] = [
                'title' => 'Edukasi Kebersihan',
                'content' => 'Jaga kebersihan tangan, alat makan, dan lingkungan untuk mendukung kesehatan anak.',
                'priority' => 'medium',
            ];
        } elseif ($overall === 'Perlu Konsultasi Tenaga Kesehatan') {
            $recs[] = [
                'title' => 'Segera Konsultasi',
                'content' => 'Jika memiliki kekhawatiran mengenai pertumbuhan anak, konsultasikan dengan tenaga kesehatan (bidan, dokter, puskesmas).',
                'priority' => 'urgent',
            ];
            $recs[] = [
                'title' => 'Rujukan',
                'content' => 'Kader dapat membantu membuat rujukan/tindak lanjut ke fasilitas kesehatan terdekat.',
                'priority' => 'urgent',
            ];
        }

        // Arm circumference specific
        if (isset($analysis['indicators']['arm_circumference'])) {
            $li = $analysis['indicators']['arm_circumference'];
            if (($li['label'] ?? '') === 'Perlu Konsultasi Tenaga Kesehatan' || ($li['label'] ?? '') === 'Perlu Pemantauan Lebih Lanjut') {
                $recs[] = [
                    'title' => 'Lingkar Lengan (LiLA)',
                    'content' => 'Pengukuran LiLA membantu skrining. Pastikan teknik ukur tepat dan lakukan verifikasi ulang oleh tenaga terlatih.',
                    'priority' => 'medium',
                ];
            }
        }

        // Always add disclaimer
        $recs[] = [
            'title' => 'Catatan',
            'content' => 'Rekomendasi ini bersifat edukasi dan pemantauan, bukan diagnosis medis. Untuk penilaian klinis, konsultasikan dengan tenaga kesehatan.',
            'priority' => 'info',
        ];

        return $recs;
    }
}
