<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreParentRequest;
use App\Http\Requests\UpdateParentRequest;
use App\Http\Resources\ParentResource;
use App\Models\ParentModel;
use App\Services\AuditLogService;
use App\Support\SqlHelper;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', ParentModel::class);

        $q = ParentModel::query()
            ->withCount('children')
            ->forUser($request->user());

        if ($search = $request->query('search')) {
            $escaped = SqlHelper::escapeLike($search);
            $q->where(function ($sub) use ($escaped) {
                $sub->where('nama_lengkap', 'ilike', "%{$escaped}%")
                    ->orWhere('nik', 'ilike', "%{$escaped}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->orderBy('nama_lengkap')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ParentResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StoreParentRequest $request)
    {
        $this->authorize('create', ParentModel::class);

        $parent = ParentModel::create($request->validated());

        AuditLogService::log('CREATE', 'parents', $parent->id, null, $parent->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Data orang tua berhasil ditambahkan',
            'data' => new ParentResource($parent),
        ], 201);
    }

    public function show(Request $request, ParentModel $parent)
    {
        $this->authorize('view', $parent);

        $parent->load('children.posyandu');

        return response()->json([
            'success' => true,
            'data' => new ParentResource($parent),
        ]);
    }

    public function update(UpdateParentRequest $request, ParentModel $parent)
    {
        $this->authorize('update', $parent);

        $old = $parent->toArray();
        $parent->update($request->validated());

        AuditLogService::log('UPDATE', 'parents', $parent->id, $old, $parent->toArray());

        return response()->json([
            'success' => true,
            'message' => 'Data orang tua berhasil diperbarui',
            'data' => new ParentResource($parent),
        ]);
    }

    public function destroy(Request $request, ParentModel $parent)
    {
        $this->authorize('delete', $parent);

        $id = $parent->id;
        $old = $parent->toArray();
        $parent->delete();

        AuditLogService::log('DELETE', 'parents', $id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data orang tua berhasil dihapus']);
    }
}
