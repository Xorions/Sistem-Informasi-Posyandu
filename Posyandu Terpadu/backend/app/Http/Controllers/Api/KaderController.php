<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreKaderRequest;
use App\Http\Requests\UpdateKaderRequest;
use App\Http\Resources\KaderResource;
use App\Models\Kader;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class KaderController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Kader::class);

        $q = Kader::with(['posyandu', 'user'])->forUser($request->user());

        if ($posyanduId = $request->query('posyandu_id')) {
            $q->where('posyandu_id', $posyanduId);
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('nama_kader', 'ilike', "%$search%")
                    ->orWhere('nik_kader', 'ilike', "%$search%");
            });
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->orderBy('nama_kader')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => KaderResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StoreKaderRequest $request)
    {
        if (! $request->user()->canAccessPosyandu((int) $request->validated('posyandu_id'))) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki akses ke posyandu tersebut',
            ], 403);
        }

        $kader = Kader::create($request->validated());

        AuditLogService::log('CREATE', 'kader', $kader->id, null, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Kader berhasil ditambahkan',
            'data' => new KaderResource($kader->load(['posyandu', 'user'])),
        ], 201);
    }

    public function show(Request $request, Kader $kader)
    {
        $this->authorize('view', $kader);

        return response()->json([
            'success' => true,
            'data' => new KaderResource($kader->load(['posyandu', 'user'])),
        ]);
    }

    public function update(UpdateKaderRequest $request, Kader $kader)
    {
        $this->authorize('update', $kader);

        $old = $kader->only(['nama_kader', 'nik_kader', 'posyandu_id', 'status']);

        $data = $request->validated();

        if (isset($data['posyandu_id'])
            && ! $request->user()->canAccessPosyandu((int) $data['posyandu_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki akses ke posyandu tujuan',
            ], 403);
        }

        $kader->update($data);

        AuditLogService::log('UPDATE', 'kader', $kader->id, $old, $data);

        return response()->json([
            'success' => true,
            'message' => 'Kader berhasil diperbarui',
            'data' => new KaderResource($kader->load(['posyandu', 'user'])),
        ]);
    }

    public function destroy(Kader $kader)
    {
        $this->authorize('delete', $kader);

        $old = $kader->only(['nama_kader', 'nik_kader', 'posyandu_id']);
        $kader->delete();

        AuditLogService::log('DELETE', 'kader', $kader->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Kader dihapus']);
    }
}