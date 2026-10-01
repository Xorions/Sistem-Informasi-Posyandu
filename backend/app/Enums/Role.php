<?php

namespace App\Enums;

/**
 * Tiga role aplikasi.
 *
 * Role lama SUPER_ADMIN dan ADMIN_POSYANDU telah digabung menjadi ADMIN
 * karena keduanya memiliki cakupan akses yang sama. ADMIN memiliki akses ke
 * seluruh posyandu; KADER hanya ke posyandu yang ditugaskan; ORANG_TUA
 * hanya ke data anaknya sendiri.
 */
enum Role: string
{
    case ADMIN = 'ADMIN';
    case KADER = 'KADER';
    case ORANG_TUA = 'ORANG_TUA';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Role yang boleh mengelola data master: pengguna, posyandu, kader, edukasi.
     */
    public static function adminOnly(): array
    {
        return [self::ADMIN->value];
    }

    /**
     * Role yang boleh memasukkan data operasional anak: pemeriksaan,
     * imunisasi, ibu hamil, tindak lanjut, jadwal.
     */
    public static function operator(): array
    {
        return [self::ADMIN->value, self::KADER->value];
    }
}