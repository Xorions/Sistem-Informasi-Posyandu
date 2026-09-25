<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExaminationRequest;
use App\Http\Resources\ExaminationResource;
use App\Models\Child;
use App\Models\Examination;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ExaminationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = Examination::with(['child', 'posyandu', 'examiner', 'growthRecord'])->where('status', 'active');
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
        if ($childId = $request->query('child_id')) {
            $q->where('child_id', $childId);
        }
        if ($from = $request->query('from')) {
            $q->whereDate('examination_date', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->whereDate('examination_date', '<=', $to);
        }
        $q->orderBy('examination_date', 'desc');
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => ExaminationResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function store(StoreExaminationRequest $request)
    {
        Gate::authorize('create', Examination::class);
        $user = $request->user();
        $child = Child::findOrFail($request->child_id);
        if (! $user->canAccessPosyandu($child->posyandu_id) || ! $user->canAccessPosyandu($request->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Tidak memiliki akses ke Posyandu'], 403);
        }

        // ensure posyandu matches child posyandu or user has access to both
        return DB::transaction(function () use ($request, $user) {
            $exam = Examination::create([
                'child_id' => $request->child_id,
                'posyandu_id' => $request->posyandu_id,
                'examination_date' => $request->examination_date,
                'examiner_id' => $user->id,
                'notes' => $request->notes,
                'status' => 'active',
            ]);
            $exam->growthRecord()->create([
                'weight' => $request->weight,
                'height' => $request->height,
                'length' => $request->length,
                'head_circumference' => $request->head_circumference,
                'arm_circumference' => $request->arm_circumference,
            ]);
            AuditLogService::log('CREATE', 'examinations', $exam->id, null, $exam->load('growthRecord')->toArray());
            $exam->load(['child', 'posyandu', 'examiner', 'growthRecord']);

            return response()->json(['success' => true, 'message' => 'Pemeriksaan berhasil disimpan', 'data' => new ExaminationResource($exam)], 201);
        });
    }

    public function show(Request $request, Examination $examination)
    {
        Gate::authorize('view', $examination);
        $examination->load(['child', 'posyandu', 'examiner', 'growthRecord']);

        return response()->json(['success' => true, 'data' => new ExaminationResource($examination)]);
    }

    public function update(Request $request, Examination $examination)
    {
        Gate::authorize('update', $examination);
        $request->validate([
            'examination_date' => 'sometimes|date|before_or_equal:today',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0|max:100',
            'height' => 'nullable|numeric|min:0|max:250',
            'length' => 'nullable|numeric|min:0|max:250',
            'head_circumference' => 'nullable|numeric|min:0|max:100',
            'arm_circumference' => 'nullable|numeric|min:0|max:50',
        ]);

        return DB::transaction(function () use ($request, $examination) {
            $old = $examination->load('growthRecord')->toArray();
            if ($request->has('examination_date') || $request->has('notes')) {
                $examination->update($request->only(['examination_date', 'notes']));
            }
            if ($examination->growthRecord) {
                $examination->growthRecord->update($request->only(['weight', 'height', 'length', 'head_circumference', 'arm_circumference']));
            } else {
                $examination->growthRecord()->create($request->only(['weight', 'height', 'length', 'head_circumference', 'arm_circumference']));
            }
            AuditLogService::log('UPDATE', 'examinations', $examination->id, $old, $examination->load('growthRecord')->toArray());
            $examination->load(['child', 'posyandu', 'examiner', 'growthRecord']);

            return response()->json(['success' => true, 'message' => 'Pemeriksaan berhasil diperbarui', 'data' => new ExaminationResource($examination)]);
        });
    }

    public function destroy(Request $request, Examination $examination)
    {
        Gate::authorize('delete', $examination);
        $request->validate(['void_reason' => 'nullable|string']);
        $old = $examination->toArray();
        // soft void, not delete per spec
        $examination->update(['status' => 'voided', 'void_reason' => $request->void_reason ?? 'Dibatalkan']);
        AuditLogService::log('DELETE', 'examinations', $examination->id, $old, $examination->toArray());

        return response()->json(['success' => true, 'message' => 'Pemeriksaan berhasil dibatalkan']);
    }

    public function childHistory(Request $request, Child $child)
    {
        Gate::authorize('view', $child);
        $exams = $child->examinations()->with(['growthRecord', 'examiner', 'posyandu'])->orderBy('examination_date', 'desc')->paginate(min((int) $request->query('per_page', 10), 100));

        return response()->json(['success' => true, 'data' => ExaminationResource::collection($exams), 'meta' => ['current_page' => $exams->currentPage(), 'last_page' => $exams->lastPage(), 'total' => $exams->total(), 'per_page' => $exams->perPage()]]);
    }

    public function growthChart(Request $request, Child $child)
    {
        Gate::authorize('view', $child);
        $exams = $child->examinations()->with('growthRecord')->orderBy('examination_date', 'asc')->get();
        $chart = $exams->map(fn ($e) => [
            'date' => $e->examination_date->format('Y-m-d'),
            'weight' => $e->growthRecord?->weight,
            'height' => $e->growthRecord?->height,
            'length' => $e->growthRecord?->length,
            'head_circumference' => $e->growthRecord?->head_circumference,
            'arm_circumference' => $e->growthRecord?->arm_circumference,
        ]);

        return response()->json(['success' => true, 'data' => $chart]);
    }
}
