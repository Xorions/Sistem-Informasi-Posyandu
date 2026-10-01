<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreImmunizationRequest;
use App\Http\Requests\UpdateImmunizationRequest;
use App\Http\Resources\ImmunizationResource;
use App\Models\Child;
use App\Models\Immunization;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class ImmunizationController extends Controller
{
    public function index(Request $request)
    {
        $q = Immunization::with(['child', 'recorder'])
            ->forUser($request->user());

        if ($childId = $request->query('child_id')) {
            $q->where('child_id', $childId);
        }

        // Filter jenis untuk memisahkan catatan vaksin dan vitamin.
        if ($jenis = $request->query('jenis')) {
            $q->where('jenis', $jenis);
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        if ($from = $request->query('from')) {
            $q->whereDate('vaccination_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $q->whereDate('vaccination_date', '<=', $to);
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->orderByDesc('vaccination_date')->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ImmunizationResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StoreImmunizationRequest $request)
    {
        $child = Child::findOrFail($request->child_id);

        if (! $request->user()->canAccessPosyandu($child->posyandu_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden: tidak mengakses posyandu anak ini',
            ], 403);
        }

        $data = $request->validated();
        $data['recorded_by'] = $request->user()->id;

        $immunization = Immunization::create($data);

        AuditLogService::log('CREATE', 'immunizations', $immunization->id, null, $data);

        return response()->json([
            'success' => true,
            'message' => 'Pemberian berhasil dicatat',
            'data' => new ImmunizationResource($immunization->load('child')),
        ], 201);
    }

    public function show(Request $request, Immunization $immunization)
    {
        if (! $request->user()->canAccessPosyandu($immunization->child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => new ImmunizationResource($immunization->load(['child', 'recorder'])),
        ]);
    }

    public function update(UpdateImmunizationRequest $request, Immunization $immunization)
    {
        if (! $request->user()->canAccessPosyandu($immunization->child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $old = $immunization->only(['jenis', 'vaccine_name', 'batch', 'vaccination_date', 'status']);

        $immunization->update($request->validated());

        AuditLogService::log('UPDATE', 'immunizations', $immunization->id, $old, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Data pemberian berhasil diperbarui',
            'data' => new ImmunizationResource($immunization->load('child')),
        ]);
    }

    public function destroy(Request $request, Immunization $immunization)
    {
        if (! $request->user()->canAccessPosyandu($immunization->child->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $old = $immunization->only(['jenis', 'vaccine_name', 'vaccination_date', 'status']);
        $immunization->delete();

        AuditLogService::log('DELETE', 'immunizations', $immunization->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data pemberian dihapus']);
    }

    public function childImmunizations(Request $request, Child $child)
    {
        $this->authorize('view', $child);

        $q = $child->immunizations()->with('recorder');

        if ($jenis = $request->query('jenis')) {
            $q->where('jenis', $jenis);
        }

        return response()->json([
            'success' => true,
            'data' => ImmunizationResource::collection(
                $q->orderByDesc('vaccination_date')->get()
            ),
        ]);
    }
}