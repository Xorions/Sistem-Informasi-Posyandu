<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePosyanduRequest;
use App\Http\Resources\PosyanduResource;
use App\Models\Posyandu;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class PosyanduController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $q = Posyandu::query()->withCount('children');
        if ($user->role !== 'SUPER_ADMIN') {
            $ids = $user->posyanduIds();
            $q->whereIn('id', $ids);
        }
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('nama_posyandu', 'ilike', "%$search%")->orWhere('kode_posyandu', 'ilike', "%$search%");
            });
        }
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => PosyanduResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function store(StorePosyanduRequest $request)
    {
        $this->authorize('create', Posyandu::class);
        $posyandu = Posyandu::create($request->validated());
        AuditLogService::log('CREATE', 'posyandu', $posyandu->id, null, $posyandu->toArray());

        return response()->json(['success' => true, 'message' => 'Posyandu berhasil dibuat', 'data' => new PosyanduResource($posyandu)], 201);
    }

    public function show(Request $request, Posyandu $posyandu)
    {
        $this->authorize('view', $posyandu);
        $posyandu->loadCount('children');

        return response()->json(['success' => true, 'data' => new PosyanduResource($posyandu)]);
    }

    public function update(Request $request, Posyandu $posyandu)
    {
        $this->authorize('update', $posyandu);
        $old = $posyandu->toArray();
        $posyandu->update($request->validate([
            'kode_posyandu' => 'sometimes|string|max:50|unique:posyandu,kode_posyandu,'.$posyandu->id,
            'nama_posyandu' => 'sometimes|string|max:255',
            'alamat' => 'sometimes|string',
            'desa_kelurahan' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kabupaten_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'nama_ketua' => 'nullable|string|max:100',
            'nomor_telepon' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
        ]));
        AuditLogService::log('UPDATE', 'posyandu', $posyandu->id, $old, $posyandu->toArray());

        return response()->json(['success' => true, 'message' => 'Posyandu berhasil diperbarui', 'data' => new PosyanduResource($posyandu)]);
    }

    public function destroy(Posyandu $posyandu)
    {
        $this->authorize('delete', $posyandu);
        $old = $posyandu->toArray();
        $posyandu->delete();
        AuditLogService::log('DELETE', 'posyandu', $posyandu->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Posyandu berhasil dihapus']);
    }

    public function assignUser(Request $request, Posyandu $posyandu)
    {
        $this->authorize('update', $posyandu);
        $request->validate(['user_id' => 'required|exists:users,id']);
        $posyandu->users()->syncWithoutDetaching([$request->user_id]);

        return response()->json(['success' => true, 'message' => 'User berhasil ditambahkan ke Posyandu']);
    }
}
