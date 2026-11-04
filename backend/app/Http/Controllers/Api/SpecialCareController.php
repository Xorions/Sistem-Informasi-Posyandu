<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmSpecialCareRequest;
use App\Http\Requests\ExitSpecialCareRequest;
use App\Http\Requests\RejectSpecialCareRequest;
use App\Http\Resources\SpecialCareEnrollmentResource;
use App\Models\AuditLog;
use App\Models\Child;
use App\Models\SpecialCareEnrollment;
use App\Services\AuditLogService;
use App\Services\SpecialCareExitEvaluationService;
use App\Support\SqlHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SpecialCareController extends Controller
{
    /**
     * Daftar kandidat penanganan khusus (status = candidate)
     */
    public function candidates(Request $request)
    {
        $user = $request->user();
        Gate::authorize('viewAny', SpecialCareEnrollment::class);

        $q = SpecialCareEnrollment::with(['child.parents', 'posyandu', 'entryExamination.growthRecord'])
            ->forUser($user)
            ->where('status', 'candidate');

        if ($posyanduId = $request->query('posyandu_id')) {
            if (! $user->canAccessPosyandu((int) $posyanduId)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
            $q->where('posyandu_id', $posyanduId);
        }

        if ($track = $request->query('track')) {
            $q->where('track', $track);
        }

        if ($request->has('perlu_rujukan')) {
            $q->where('perlu_rujukan', filter_var($request->query('perlu_rujukan'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->query('search')) {
            $escaped = SqlHelper::escapeLike($search);
            $q->whereHas('child', function ($cq) use ($escaped) {
                $cq->where('nama_lengkap', 'ilike', "%{$escaped}%")
                    ->orWhere('nik', 'ilike', "%{$escaped}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 15), 100);
        $candidates = $q->orderBy('created_at', 'desc')->paginate($perPage);

        return SpecialCareEnrollmentResource::collection($candidates);
    }

    /**
     * Daftar peserta aktif penanganan khusus (status = active)
     */
    public function active(Request $request)
    {
        $user = $request->user();
        Gate::authorize('viewAny', SpecialCareEnrollment::class);

        $q = SpecialCareEnrollment::with(['child.parents', 'posyandu', 'confirmedBy', 'entryExamination.growthRecord'])
            ->forUser($user)
            ->where('status', 'active');

        if ($posyanduId = $request->query('posyandu_id')) {
            if (! $user->canAccessPosyandu((int) $posyanduId)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
            $q->where('posyandu_id', $posyanduId);
        }

        if ($track = $request->query('track')) {
            $q->where('track', $track);
        }

        if ($search = $request->query('search')) {
            $escaped = SqlHelper::escapeLike($search);
            $q->whereHas('child', function ($cq) use ($escaped) {
                $cq->where('nama_lengkap', 'ilike', "%{$escaped}%")
                    ->orWhere('nik', 'ilike', "%{$escaped}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 15), 100);
        $active = $q->orderBy('entry_date', 'asc')->paginate($perPage);

        return SpecialCareEnrollmentResource::collection($active);
    }

    /**
     * Detail satu enrollment
     */
    public function show(Request $request, SpecialCareEnrollment $enrollment): JsonResponse
    {
        Gate::authorize('view', $enrollment);

        $enrollment->load([
            'child.parents',
            'posyandu',
            'confirmedBy',
            'entryExamination.growthRecord',
            'exitExamination.growthRecord',
        ]);

        $evaluation = null;
        if ($enrollment->isActive()) {
            $evaluation = app(SpecialCareExitEvaluationService::class)->evaluate($enrollment);
        }

        $statusHistory = AuditLog::with('user:id,name,role')
            ->where('module', 'special_care_enrollment')
            ->where('record_id', $enrollment->id)
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (AuditLog $log) {
                $newValues = is_string($log->new_values) ? json_decode($log->new_values, true) : (is_array($log->new_values) ? $log->new_values : []);
                $oldValues = is_string($log->old_values) ? json_decode($log->old_values, true) : (is_array($log->old_values) ? $log->old_values : []);

                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'siapa' => [
                        'user_id' => $log->user_id,
                        'nama' => $log->user?->name ?? ($newValues['siapa']['name'] ?? 'Sistem'),
                        'role' => $log->user?->role instanceof \BackedEnum ? $log->user->role->value : ($log->user?->role ?? ($newValues['siapa']['role'] ?? null)),
                    ],
                    'kapan' => $log->created_at?->toIso8601String(),
                    'status_sebelumnya' => $newValues['status_sebelumnya'] ?? ($oldValues['status'] ?? null),
                    'status_baru' => $newValues['status_baru'] ?? ($newValues['status'] ?? null),
                    'alasan' => $newValues['alasan'] ?? ($newValues['alasan_keluar'] ?? ($newValues['alasan_masuk'] ?? null)),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => new SpecialCareEnrollmentResource($enrollment),
            'exit_evaluation' => $evaluation,
            'status_history' => $statusHistory,
        ]);
    }

    /**
     * Riwayat audit log perubahan status untuk satu enrollment
     */
    public function auditLogs(Request $request, SpecialCareEnrollment $enrollment): JsonResponse
    {
        Gate::authorize('view', $enrollment);

        $logs = AuditLog::with('user:id,name,role')
            ->where('module', 'special_care_enrollment')
            ->where('record_id', $enrollment->id)
            ->orderBy('id', 'asc')
            ->get()
            ->map(function (AuditLog $log) {
                $newValues = is_string($log->new_values) ? json_decode($log->new_values, true) : (is_array($log->new_values) ? $log->new_values : []);
                $oldValues = is_string($log->old_values) ? json_decode($log->old_values, true) : (is_array($log->old_values) ? $log->old_values : []);

                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'siapa' => [
                        'user_id' => $log->user_id,
                        'nama' => $log->user?->name ?? ($newValues['siapa']['name'] ?? 'Sistem'),
                        'role' => $log->user?->role instanceof \BackedEnum ? $log->user->role->value : ($log->user?->role ?? ($newValues['siapa']['role'] ?? null)),
                    ],
                    'kapan' => $log->created_at?->toIso8601String(),
                    'status_sebelumnya' => $newValues['status_sebelumnya'] ?? ($oldValues['status'] ?? null),
                    'status_baru' => $newValues['status_baru'] ?? ($newValues['status'] ?? null),
                    'alasan' => $newValues['alasan'] ?? ($newValues['alasan_keluar'] ?? ($newValues['alasan_masuk'] ?? null)),
                    'ip_address' => $log->ip_address,
                ];
            });

        return response()->json([
            'success' => true,
            'enrollment_id' => $enrollment->id,
            'data' => $logs,
        ]);
    }

    /**
     * Konfirmasi masuk kandidat menjadi peserta aktif
     */
    public function confirm(ConfirmSpecialCareRequest $request, SpecialCareEnrollment $enrollment): JsonResponse
    {
        Gate::authorize('confirm', $enrollment);

        if ($enrollment->status !== 'candidate') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pendaftaran berstatus candidate yang dapat dikonfirmasi.',
            ], 422);
        }

        $old = $enrollment->toArray();
        $validated = $request->validated();
        $user = $request->user();
        $alasan = $validated['alasan'] ?? ($validated['notes'] ?? 'Dikonfirmasi masuk program penanganan khusus');

        DB::transaction(function () use ($enrollment, $user, $validated, $old, $alasan) {
            $enrollment->update([
                'status' => 'active',
                'entry_date' => $validated['entry_date'] ?? now()->toDateString(),
                'confirmed_by' => $user->id,
                'notes' => $validated['notes'] ?? $enrollment->notes,
            ]);

            AuditLogService::log(
                'CONFIRM',
                'special_care_enrollment',
                $enrollment->id,
                $old,
                array_merge($enrollment->fresh()->toArray(), [
                    'status_sebelumnya' => 'candidate',
                    'status_baru' => 'active',
                    'alasan' => $alasan,
                    'siapa' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role instanceof \BackedEnum ? $user->role->value : $user->role,
                    ],
                    'kapan' => now()->toIso8601String(),
                ])
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Peserta penanganan khusus berhasil dikonfirmasi menjadi aktif.',
            'data' => new SpecialCareEnrollmentResource($enrollment->fresh()->load(['child', 'posyandu', 'confirmedBy', 'entryExamination'])),
        ]);
    }

    /**
     * Tolak kandidat (wajib alasan penolakan)
     */
    public function reject(RejectSpecialCareRequest $request, SpecialCareEnrollment $enrollment): JsonResponse
    {
        Gate::authorize('reject', $enrollment);

        if ($enrollment->status !== 'candidate') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya pendaftaran berstatus candidate yang dapat ditolak.',
            ], 422);
        }

        $old = $enrollment->toArray();
        $validated = $request->validated();
        $user = $request->user();

        DB::transaction(function () use ($enrollment, $user, $validated, $old) {
            $enrollment->update([
                'status' => 'cancelled',
                'exit_date' => now()->toDateString(),
                'alasan_keluar' => $validated['alasan_keluar'],
                'confirmed_by' => $user->id,
                'notes' => $validated['notes'] ?? $enrollment->notes,
            ]);

            AuditLogService::log(
                'REJECT',
                'special_care_enrollment',
                $enrollment->id,
                $old,
                array_merge($enrollment->fresh()->toArray(), [
                    'status_sebelumnya' => 'candidate',
                    'status_baru' => 'cancelled',
                    'alasan' => $validated['alasan_keluar'],
                    'siapa' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role instanceof \BackedEnum ? $user->role->value : $user->role,
                    ],
                    'kapan' => now()->toIso8601String(),
                ])
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Kandidat penanganan khusus berhasil ditolak.',
            'data' => new SpecialCareEnrollmentResource($enrollment->fresh()->load(['child', 'posyandu', 'confirmedBy', 'entryExamination'])),
        ]);
    }

    /**
     * Daftar usulan keluar (layak dievaluasi keluar berdasarkan kriteria klinis)
     */
    public function exitProposals(Request $request): JsonResponse
    {
        $user = $request->user();
        Gate::authorize('viewAny', SpecialCareEnrollment::class);

        $q = SpecialCareEnrollment::with(['child.parents', 'posyandu', 'confirmedBy', 'entryExamination.growthRecord'])
            ->forUser($user)
            ->where('status', 'active');

        if ($posyanduId = $request->query('posyandu_id')) {
            if (! $user->canAccessPosyandu((int) $posyanduId)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
            $q->where('posyandu_id', $posyanduId);
        }

        $evalService = app(SpecialCareExitEvaluationService::class);
        $results = [];

        foreach ($q->get() as $enrollment) {
            $eval = $evalService->evaluate($enrollment);
            if ($eval['eligible']) {
                $results[] = [
                    'enrollment' => new SpecialCareEnrollmentResource($enrollment),
                    'evaluation' => $eval,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'total' => count($results),
            'data' => $results,
        ]);
    }

    /**
     * Konfirmasi keluar / batal (graduated, cancelled - rujuk/pindah/dsb)
     */
    public function exit(ExitSpecialCareRequest $request, SpecialCareEnrollment $enrollment): JsonResponse
    {
        Gate::authorize('exit', $enrollment);

        if ($enrollment->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya peserta berstatus active yang dapat dikeluarkan atau dibatalkan.',
            ], 422);
        }

        $old = $enrollment->toArray();
        $validated = $request->validated();
        $user = $request->user();

        DB::transaction(function () use ($enrollment, $user, $validated, $old) {
            $enrollment->update([
                'status' => $validated['status'],
                'exit_date' => $validated['exit_date'],
                'alasan_keluar' => $validated['alasan_keluar'],
                'exit_examination_id' => $validated['exit_examination_id'] ?? null,
                'notes' => $validated['notes'] ?? $enrollment->notes,
            ]);

            AuditLogService::log(
                'EXIT',
                'special_care_enrollment',
                $enrollment->id,
                $old,
                array_merge($enrollment->fresh()->toArray(), [
                    'status_sebelumnya' => 'active',
                    'status_baru' => $validated['status'],
                    'alasan' => $validated['alasan_keluar'],
                    'siapa' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'role' => $user->role instanceof \BackedEnum ? $user->role->value : $user->role,
                    ],
                    'kapan' => now()->toIso8601String(),
                ])
            );
        });

        $message = $validated['status'] === 'graduated'
            ? 'Peserta penanganan khusus berhasil dinyatakan lulus (graduated).'
            : 'Peserta penanganan khusus berhasil dikeluarkan/dibatalkan.';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => new SpecialCareEnrollmentResource($enrollment->fresh()->load([
                'child',
                'posyandu',
                'confirmedBy',
                'entryExamination',
                'exitExamination',
            ])),
        ]);
    }

    /**
     * Riwayat penanganan khusus per anak
     */
    public function childHistory(Request $request, Child $child): JsonResponse
    {
        $user = $request->user();
        Gate::authorize('view', $child);

        $enrollments = SpecialCareEnrollment::with([
            'posyandu',
            'confirmedBy',
            'entryExamination.growthRecord',
            'exitExamination.growthRecord',
        ])
            ->where('child_id', $child->id)
            ->forUser($user)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'child_id' => $child->id,
            'nama_anak' => $child->nama_lengkap,
            'data' => SpecialCareEnrollmentResource::collection($enrollments),
        ]);
    }
}
