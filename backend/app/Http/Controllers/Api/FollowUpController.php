<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFollowUpRequest;
use App\Models\Child;
use App\Models\FollowUp;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class FollowUpController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = FollowUp::with(['child', 'posyandu', 'examination', 'handler']);
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
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($childId = $request->query('child_id')) {
            $q->where('child_id', $childId);
        }
        $q->latest();
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data, 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function store(StoreFollowUpRequest $request)
    {
        $child = Child::findOrFail($request->child_id);
        if (! $request->user()->canAccessPosyandu($request->posyandu_id) || ! $request->user()->canAccessPosyandu($child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $data = $request->validated();
        $f = FollowUp::create($data);
        AuditLogService::log('CREATE', 'follow_ups', $f->id, null, $f->toArray());

        return response()->json(['success' => true, 'message' => 'Tindak lanjut berhasil dibuat', 'data' => $f->load(['child', 'posyandu'])], 201);
    }

    public function show(FollowUp $followUp)
    {
        $this->authorize('view', $followUp);
        $followUp->load(['child', 'posyandu', 'examination', 'handler']);

        return response()->json(['success' => true, 'data' => $followUp]);
    }

    public function update(Request $request, FollowUp $followUp)
    {
        $this->authorize('update', $followUp);
        $data = $request->validate([
            'type' => 'sometimes|string|max:100',
            'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
            'follow_up_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'handled_by' => 'nullable|exists:users,id',
        ]);
        $old = $followUp->toArray();
        $followUp->update($data);
        AuditLogService::log('UPDATE', 'follow_ups', $followUp->id, $old, $followUp->toArray());

        return response()->json(['success' => true, 'message' => 'Tindak lanjut diperbarui', 'data' => $followUp]);
    }

    public function destroy(Request $request, FollowUp $followUp)
    {
        $this->authorize('delete', $followUp);
        $old = $followUp->toArray();
        $followUp->delete();
        AuditLogService::log('DELETE', 'follow_ups', $followUp->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Tindak lanjut dihapus']);
    }
}
