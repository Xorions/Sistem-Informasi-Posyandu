<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Support\Mask;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    public static function log(string $action, string $module, $recordId = null, $old = null, $new = null): void
    {
        $user = auth()->user();

        $oldArray = is_object($old) && method_exists($old, 'toArray') ? $old->toArray() : $old;
        $newArray = is_object($new) && method_exists($new, 'toArray') ? $new->toArray() : $new;

        if (is_string($oldArray)) {
            $decoded = json_decode($oldArray, true);
            if (is_array($decoded)) {
                $oldArray = $decoded;
            }
        }

        if (is_string($newArray)) {
            $decoded = json_decode($newArray, true);
            if (is_array($decoded)) {
                $newArray = $decoded;
            }
        }

        $sanitizedOld = is_array($oldArray) ? self::sanitize($oldArray) : $oldArray;
        $sanitizedNew = is_array($newArray) ? self::sanitize($newArray) : $newArray;

        AuditLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'module' => $module,
            'record_id' => $recordId,
            'old_values' => $sanitizedOld ? json_encode($sanitizedOld) : null,
            'new_values' => $sanitizedNew ? json_encode($sanitizedNew) : null,
            'ip_address' => Request::ip(),
            'user_agent' => Request::header('User-Agent'),
            'created_at' => now(),
        ]);
    }

    public static function sanitize(mixed $data): mixed
    {
        if (! is_array($data)) {
            return $data;
        }

        $redactKeys = [
            'password',
            'password_confirmation',
            'current_password',
            'token',
            'remember_token',
            'access_token',
            'api_token',
        ];

        $nikKeys = ['nik', 'nik_kader', 'nomor_kk'];
        $phoneKeys = ['nomor_telepon', 'no_hp', 'phone', 'telepon'];

        foreach ($data as $key => $val) {
            $lowerKey = strtolower((string) $key);

            if (in_array($lowerKey, $redactKeys, true)) {
                unset($data[$key]);

                continue;
            }

            if (is_array($val)) {
                $data[$key] = self::sanitize($val);

                continue;
            }

            if (is_string($val)) {
                if (in_array($lowerKey, $nikKeys, true)) {
                    $data[$key] = Mask::nik($val);
                } elseif (in_array($lowerKey, $phoneKeys, true)) {
                    $data[$key] = Mask::phone($val);
                }
            }
        }

        return $data;
    }
}
