<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    public static function log(string $action, string $module, $recordId = null, $old = null, $new = null): void
    {
        $user = auth()->user();
        if ($new && is_array($new)) {
            unset($new['password'], $new['password_confirmation']);
        }
        if ($old && is_array($old)) {
            unset($old['password']);
        }
        AuditLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'module' => $module,
            'record_id' => $recordId,
            'old_values' => $old ? json_encode($old) : null,
            'new_values' => $new ? json_encode($new) : null,
            'ip_address' => Request::ip(),
            'user_agent' => Request::header('User-Agent'),
            'created_at' => now(),
        ]);
    }
}
