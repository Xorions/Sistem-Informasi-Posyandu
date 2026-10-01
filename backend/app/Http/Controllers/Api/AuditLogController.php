<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $q = AuditLog::with('user')->orderBy('created_at', 'desc');
        if ($module = $request->query('module')) {
            $q->where('module', $module);
        }
        if ($action = $request->query('action')) {
            $q->where('action', $action);
        }
        if ($from = $request->query('from')) {
            $q->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->whereDate('created_at', '<=', $to);
        }
        $perPage = min((int) $request->query('per_page', 20), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }
}
