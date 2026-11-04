<?php

/**
 * Konfigurasi Modul Penanganan Khusus & Pendampingan Tumbuh Kembang
 *
 * STANDAR ACUAN:
 * 1. Peraturan Menteri Kesehatan Republik Indonesia No. 2 Tahun 2020 tentang Standar Antropometri Anak.
 * 2. WHO Child Growth Standards (2006) - Length/height-for-age, weight-for-age, weight-for-length/height.
 * 3. Petunjuk Teknis Pemberian Makanan Tambahan (PMT) Berbahan Pangan Lokal Bagi Balita dan Ibu Hamil (Kemenkes RI, 2023).
 * 4. Pedoman Pencegahan dan Tata Laksana Gizi Buruk pada Balita di Layanan Rawat Jalan (Kemenkes RI).
 *
 * STATUS VALIDASI DATA REFERENSI:
 * [BELUM DIVALIDASI DENGAN STANDAR RESMI KEMENKES/WHO LMS FULL TABLE]
 * Tabel `growth_standards` pada basis data saat ini memuat estimasi median dan rentang pendekatan internal.
 * `GrowthAnalysisService` melakukan kalkulasi deviasi linier median terhadap nilai referensi tersebut,
 * bukan kurva Box-Cox Cole & Green (LMS) kontinyu. Seluruh penetapan diagnosis klinis definitif dan
 * peresepan PMT wajib dikonsultasikan dengan Tenaga Pelaksana Gizi (TPG) Puskesmas setempat.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Jalur Wasting (Gizi Akut)
    |--------------------------------------------------------------------------
    | Sumber: WHO Child Growth Standards / Permenkes No. 2 Tahun 2020
    | dan Pedoman Teknis PMT Pemulihan Kemenkes RI.
    */
    'wasting' => [
        'min_age_months' => 6,
        'max_age_months' => 59,

        // Kriteria kandidat masuk: BB/PB-TB < -2 SD ATAU LiLA < 12.5 cm
        'candidate_zscore_cutoff' => -2.0,
        'candidate_lila_cm' => 12.5,

        // Penanda perlu rujukan nakes: BB/PB-TB < -3 SD ATAU LiLA < 11.5 cm
        'referral_zscore_cutoff' => -3.0,
        'referral_lila_cm' => 11.5,

        // Kriteria usulan keluar
        'min_duration_days' => 90, // Minimal 90 hari PMT Pemulihan (Kemenkes)
        'consecutive_recoveries_required' => 2, // 2 pemeriksaan berturut-turut pulih
        'recovery_zscore_cutoff' => -2.0, // Ambang batas pulih BB/PB-TB: Z-score >= -2.0 SD (status normal / bukan deviasi lanjutan)
        'recovery_lila_cm' => 12.5, // Ambang batas pulih LiLA: LiLA >= 12.5 cm (batas pita hijau / gizi baik)
        'exit_mode' => 'strict', // 'strict' (seluruh indikator pemicu masuk wajib pulih) atau 'any' (salah satu pulih)
    ],

    /*
    |--------------------------------------------------------------------------
    | Bayi < 6 Bulan
    |--------------------------------------------------------------------------
    | Sumber: Pedoman Tatalaksana Gizi Buruk Kemenkes RI.
    | LiLA tidak valid untuk usia < 6 bulan. Makanan padat/PMT dikontraindikasikan.
    */
    'infant_under_6m' => [
        'use_lila' => false,
        'candidate_zscore_cutoff' => -2.0, // BB/PB < -2 SD hanya tandai tinjau bidan
    ],

    /*
    |--------------------------------------------------------------------------
    | Edema Bilateral & Tanda Bahaya Klinis
    |--------------------------------------------------------------------------
    | Sumber: Pedoman Tatalaksana Gizi Buruk Kemenkes RI / WHO.
    | Adanya edema bilateral (+, ++, +++) mengindikasikan gizi buruk komplikasi
    | yang wajib dirujuk SEGERA ke Fasilitas Pelayanan Kesehatan / Rumah Sakit.
    | Catatan: Skema database belum memiliki kolom boolean terdedikasi 'edema'
    | pada tabel 'examinations'. Deteksi didukung melalui catatan (notes)
    | atau tinjauan langsung nakes/bidan.
    */
    'clinical_danger_signs' => [
        'edema_requires_immediate_referral' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Hak Akses Konfirmasi Keluar / Kelulusan (Exit Authorization)
    |--------------------------------------------------------------------------
    | Menentukan role minimal yang berhak mengonfirmasi kelulusan (graduated)
    | atau penghentian (cancelled) peserta dari program penanganan khusus:
    | - 'ADMIN': Hanya admin/bidan puskesmas koordinator (rekomendasi klinis).
    | - 'OPERATOR': Admin dan Kader posyandu binaan.
    | Default: 'ADMIN'
    */
    'exit_authorized_role' => env('SPECIAL_CARE_EXIT_ROLE', 'ADMIN'),

    /*
    |--------------------------------------------------------------------------
    | Jalur Stunting (Gizi Kronis)
    |--------------------------------------------------------------------------
    | Sumber: Standar Antropometri Anak Permenkes No. 2 Tahun 2020.
    */
    'stunting' => [
        'enabled' => env('SPECIAL_CARE_STUNTING_ENABLED', true),
        'candidate_zscore_cutoff' => -2.0, // Pendek: -3 s.d. <-2 SD, Sangat Pendek: < -3 SD
        'severe_cutoff' => -3.0,
        'review_interval_days' => 60, // Pengingat evaluasi berkala per 60 hari
        'auto_exit' => false, // Tidak ada usulan keluar otomatis; keputusan manual bidan
    ],
];
