<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
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
        $q = ParentModel::query()
            ->withCount('children')
            ->forUser($request->user());

        if ($search = $request->query('search')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('nama_lengkap', 'ilike', "%$search%")
                    ->orWhere('nik', 'ilike', "%$search%");
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
        $this->authorizeMutation($request);

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
        if (! $this->canRead($request, $parent)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $parent->load('children.posyandu');

        return response()->json([
            'success' => true,
            'data' => new ParentResource($parent),
        ]);
    }

    public function update(UpdateParentRequest $request, ParentModel $parent)
    {
        if (! $this->canRead($request, $parent)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $this->authorizeMutation($request);

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
        // Penghapusan data orang tua impacting banyak anak, jadi khusus ADMIN.
        if ($request->user()->role !== Role::ADMIN->value) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $old = $parent->toArray();
        $parent->delete();

        AuditLogService::log('DELETE', 'parents', $parent->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data orang tua berhasil dihapus']);
    }

    /** Orang tua hanya boleh membaca profilnya sendiri. */
    private function canRead(Request $request, ParentModel $parent): bool
    {
        $user = $request->user();

        if ($user->isOrangTua()) {
            return $user->parent_id !== null && $user->parent_id === $parent->id;
        }

        return true;
    }

    /** Orang tua bersifat read-only pada modul ini. */
    private function authorizeMutation(Request $request): void
    {
        abort_if($request->user()->isOrangTua(), 403, 'Forbidden');
    }
}