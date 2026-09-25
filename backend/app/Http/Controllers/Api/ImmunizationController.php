<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImmunizationRequest;
use App\Models\Child;
use App\Models\Immunization;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class ImmunizationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = Immunization::with(['child', 'recorder']);
        if ($user->role !== 'SUPER_ADMIN') {
            $ids = $user->posyanduIds();
            $q->whereHas('child', fn ($qq) => $qq->whereIn('posyandu_id', $ids));
        }
        if ($childId = $request->query('child_id')) {
            $q->where('child_id', $childId);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        $q->latest();
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function store(StoreImmunizationRequest $request)
    {
        $child = Child::findOrFail($request->child_id);
        if (! $request->user()->canAccessPosyandu($child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $data = $request->validated();
        $data['recorded_by'] = $request->user()->id;
        $imm = Immunization::create($data);
        AuditLogService::log('CREATE', 'immunizations', $imm->id, null, $imm->toArray());

        return response()->json(['success' => true, 'message' => 'Imunisasi berhasil dicatat', 'data' => $imm->load(['child'])], 201);
    }

    public function show(Immunization $immunization)
    {
        $immunization->load(['child', 'recorder']);

        return response()->json(['success' => true, 'data' => $immunization]);
    }

    public function update(Request $request, Immunization $immunization)
    {
        $child = $immunization->child;
        if (! $request->user()->canAccessPosyandu($child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'vaccine_name' => 'sometimes|string|max:100',
            'vaccination_date' => 'nullable|date|before_or_equal:today',
            'status' => 'sometimes|in:sudah,belum,terjadwal',
            'notes' => 'nullable|string',
        ]);
        $old = $immunization->toArray();
        $immunization->update($data);
        AuditLogService::log('UPDATE', 'immunizations', $immunization->id, $old, $immunization->toArray());

        return response()->json(['success' => true, 'message' => 'Imunisasi berhasil diperbarui', 'data' => $immunization]);
    }

    public function destroy(Request $request, Immunization $immunization)
    {
        $child = $immunization->child;
        if (! $request->user()->canAccessPosyandu($child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $old = $immunization->toArray();
        $immunization->delete();
        AuditLogService::log('DELETE', 'immunizations', $immunization->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Imunisasi berhasil dihapus']);
    }

    public function childImmunizations(Child $child)
    {
        $this->authorize('view', $child);
        $data = $child->immunizations()->orderBy('vaccination_date', 'desc')->get();

        return response()->json(['success' => true, 'data' => $data]);
    }
}
