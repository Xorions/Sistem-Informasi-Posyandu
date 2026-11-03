<?php

namespace App\Support;

class SqlHelper
{
    /**
     * Escape special characters in a string for use in SQL LIKE / ILIKE clauses.
     * Escapes backslash, percent, and underscore.
     */
    public static function escapeLike(string $value): string
    {
        return str_replace(
            ['\\', '%', '_'],
            ['\\\\', '\\%', '\\_'],
            $value
        );
    }
}
