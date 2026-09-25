<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreParentRequest;
use App\Http\Requests\UpdateParentRequest;
use App\Http\Resources\ParentResource;
use App\Models\ParentModel;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    public function index(Request $request)
    {
        $q = ParentModel::query()->withCount('children');
        if ($search = $request->query('search')) {
            $q->where('nama_lengkap', 'ilike', "%$search%")->orWhere('nik', 'ilike', "%$search%");
        }
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => ParentResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function store(StoreParentRequest $request)
    {
        $parent = ParentModel::create($request->validated());
        AuditLogService::log('CREATE', 'parents', $parent->id, null, $parent->toArray());

        return response()->json(['success' => true, 'message' => 'Data orang tua berhasil ditambahkan', 'data' => new ParentResource($parent)], 201);
    }

    public function show(ParentModel $parent)
    {
        $parent->load('children');

        return response()->json(['success' => true, 'data' => new ParentResource($parent)]);
    }

    public function update(UpdateParentRequest $request, ParentModel $parent)
    {
        $old = $parent->toArray();
        $parent->update($request->validated());
        AuditLogService::log('UPDATE', 'parents', $parent->id, $old, $parent->toArray());

        return response()->json(['success' => true, 'message' => 'Data orang tua berhasil diperbarui', 'data' => new ParentResource($parent)]);
    }

    public function destroy(ParentModel $parent)
    {
        $old = $parent->toArray();
        $parent->delete();
        AuditLogService::log('DELETE', 'parents', $parent->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data orang tua berhasil dihapus']);
    }
}
