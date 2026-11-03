<?php

namespace App\Support;

class Mask
{
    /**
     * Mask NIK (16 digit) keeping first 4 and last 4 characters.
     */
    public static function nik(?string $nik): ?string
    {
        if (empty($nik)) {
            return $nik;
        }

        $len = strlen($nik);
        if ($len <= 8) {
            return str_repeat('*', $len);
        }

        return substr($nik, 0, 4).str_repeat('*', $len - 8).substr($nik, -4);
    }

    /**
     * Mask Nomor Kartu Keluarga (16 digit).
     */
    public static function kk(?string $kk): ?string
    {
        return self::nik($kk);
    }

    /**
     * Mask nomor telepon / HP keeping first 4 and last 3 characters.
     */
    public static function phone(?string $phone): ?string
    {
        if (empty($phone)) {
            return $phone;
        }

        $len = strlen($phone);
        if ($len <= 7) {
            return str_repeat('*', $len);
        }

        return substr($phone, 0, 4).str_repeat('*', $len - 7).substr($phone, -3);
    }
}
