<?php

namespace App\Support;

class CsvSanitizer
{
    /**
     * Characters that trigger spreadsheet formula execution.
     *
     * @var array<int, string>
     */
    private const DANGEROUS_PREFIXES = ['=', '+', '-', '@', "\t", "\r"];

    /**
     * Sanitize a single value against CSV/Excel formula injection.
     * Pure numeric types (int, float) are preserved untouched.
     */
    public static function sanitizeValue(mixed $value): mixed
    {
        if (is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_array($value)) {
            return array_map([self::class, 'sanitizeValue'], $value);
        }

        if (! is_string($value) || $value === '') {
            return $value;
        }

        $trimmed = ltrim($value, " \t\r\n");
        if (in_array($value[0], self::DANGEROUS_PREFIXES, true) ||
            ($trimmed !== '' && in_array($trimmed[0], ['=', '+', '-', '@'], true))) {
            return "'".$value;
        }

        return $value;
    }

    /**
     * Sanitize an entire row (associative or indexed array).
     *
     * @param  array<mixed>  $row
     * @return array<mixed>
     */
    public static function sanitizeRow(array $row): array
    {
        $sanitized = [];
        foreach ($row as $k => $v) {
            $sanitized[$k] = self::sanitizeValue($v);
        }

        return $sanitized;
    }
}
