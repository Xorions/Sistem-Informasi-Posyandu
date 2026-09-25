<?php

namespace App\Enums;

enum Role: string
{
    case SUPER_ADMIN = 'SUPER_ADMIN';
    case ADMIN_POSYANDU = 'ADMIN_POSYANDU';
    case KADER = 'KADER';
    case ORANG_TUA = 'ORANG_TUA';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
