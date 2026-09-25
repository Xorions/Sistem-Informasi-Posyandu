<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreScheduleRequest;
use App\Models\Schedule;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = Schedule::with('posyandu');
        if ($user->role !== 'SUPER_ADMIN') {
            $ids = $user->posyanduIds();
            $q->whereIn('posyandu_id', $ids);
        }
        if ($posyanduId = $request->query('posyandu_id')) {
            if (! $user->canAccessPosyandu((int) $posyanduId)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
            $q->where('posyandu_id', $posyanduId);
        }
        if ($from = $request->query('from')) {
            $q->whereDate('date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->whereDate('date', '<=', $to);
        }
        $q->orderBy('date', 'asc');
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data, 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function store(StoreScheduleRequest $request)
    {
        if (! $request->user()->canAccessPosyandu($request->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $s = Schedule::create($request->validated());
        AuditLogService::log('CREATE', 'schedules', $s->id, null, $s->toArray());

        return response()->json(['success' => true, 'message' => 'Jadwal berhasil dibuat', 'data' => $s->load('posyandu')], 201);
    }

    public function show(Schedule $schedule)
    {
        if (! auth()->user()->canAccessPosyandu($schedule->posyandu_id) && auth()->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $schedule->load('posyandu');

        return response()->json(['success' => true, 'data' => $schedule]);
    }

    public function update(Request $request, Schedule $schedule)
    {
        if (! $request->user()->canAccessPosyandu($schedule->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:scheduled,completed,cancelled',
            'posyandu_id' => 'sometimes|exists:posyandu,id',
        ]);
        $old = $schedule->toArray();
        $schedule->update($data);
        AuditLogService::log('UPDATE', 'schedules', $schedule->id, $old, $schedule->toArray());

        return response()->json(['success' => true, 'message' => 'Jadwal diperbarui', 'data' => $schedule]);
    }

    public function destroy(Request $request, Schedule $schedule)
    {
        if (! $request->user()->canAccessPosyandu($schedule->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $old = $schedule->toArray();
        $schedule->delete();
        AuditLogService::log('DELETE', 'schedules', $schedule->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Jadwal dihapus']);
    }
}
