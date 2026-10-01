<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreChildRequest;
use App\Http\Requests\UpdateChildRequest;
use App\Http\Resources\ChildResource;
use App\Models\Child;
use App\Models\ParentModel;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ChildController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        Gate::authorize('viewAny', Child::class);
        $q = Child::with(['posyandu', 'parents'])->withCount('examinations');
        // Data isolation: ADMIN melihat semua, KADER terbatas pada posyandu yang
        // ditugaskan, ORANG_TUA hanya melihat anaknya sendiri.
        $q->forUser($user);

        if ($posyanduId = $request->query('posyandu_id')) {
            if (! $user->canAccessPosyandu((int) $posyanduId)) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
            $q->where('posyandu_id', $posyanduId);
        }
        if ($search = $request->query('search')) {
            $q->where(function ($qq) use ($search) {
                $qq->where('nama_lengkap', 'ilike', "%$search%")
                    ->orWhere('nik', 'ilike', "%$search%")
                    ->orWhere('tempat_lahir', 'ilike', "%$search%");
            });
        }
        if ($jk = $request->query('jenis_kelamin')) {
            $q->where('jenis_kelamin', $jk);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        // usia filter? optionally
        if ($request->query('sort_by')) {
            $allowed = ['nama_lengkap', 'tanggal_lahir', 'created_at'];
            $sortBy = in_array($request->query('sort_by'), $allowed) ? $request->query('sort_by') : 'created_at';
            $dir = $request->query('sort_dir', 'desc') === 'asc' ? 'asc' : 'desc';
            $q->orderBy($sortBy, $dir);
        } else {
            $q->latest();
        }
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ChildResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StoreChildRequest $request)
    {
        Gate::authorize('create', Child::class);
        $user = $request->user();
        if (! $user->canAccessPosyandu($request->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Tidak memiliki akses ke Posyandu ini'], 403);
        }

        return DB::transaction(function () use ($request) {
            $child = Child::create($request->only(['posyandu_id', 'nik', 'nama_lengkap', 'nama_panggilan', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'nomor_kk', 'status']));
            $child->load(['posyandu', 'parents']);
            // handle parents pivot
            if ($request->parents) {
                foreach ($request->parents as $p) {
                    if (! empty($p['parent_id'])) {
                        $child->parents()->attach($p['parent_id'], ['relationship' => $p['relationship'], 'is_primary_contact' => $p['is_primary_contact'] ?? false]);
                    } else {
                        $parent = ParentModel::create([
                            'nik' => $p['nik'] ?? null,
                            'nama_lengkap' => $p['nama_lengkap'],
                            'tempat_lahir' => $p['tempat_lahir'] ?? null,
                            'tanggal_lahir' => $p['tanggal_lahir'] ?? null,
                            'jenis_kelamin' => $p['jenis_kelamin'] ?? null,
                            'alamat' => $p['alamat'] ?? null,
                            'nomor_telepon' => $p['nomor_telepon'] ?? null,
                            'pekerjaan' => $p['pekerjaan'] ?? null,
                        ]);
                        $child->parents()->attach($parent->id, ['relationship' => $p['relationship'], 'is_primary_contact' => $p['is_primary_contact'] ?? false]);
                    }
                }
            }
            AuditLogService::log('CREATE', 'children', $child->id, null, $child->toArray());
            $child->load(['posyandu', 'parents']);

            return response()->json(['success' => true, 'message' => 'Data anak berhasil ditambahkan', 'data' => new ChildResource($child)], 201);
        });
    }

    public function show(Request $request, Child $child)
    {
        Gate::authorize('view', $child);
        $child->load(['posyandu', 'parents', 'examinations.growthRecord', 'examinations.examiner']);

        return response()->json(['success' => true, 'data' => new ChildResource($child)]);
    }

    public function update(UpdateChildRequest $request, Child $child)
    {
        Gate::authorize('update', $child);
        $user = $request->user();
        if ($request->has('posyandu_id') && ! $user->canAccessPosyandu($request->posyandu_id)) {
            return response()->json(['success' => false, 'message' => 'Tidak memiliki akses ke Posyandu ini'], 403);
        }
        $old = $child->toArray();
        $child->update($request->validated());
        AuditLogService::log('UPDATE', 'children', $child->id, $old, $child->toArray());
        $child->load(['posyandu', 'parents']);

        return response()->json(['success' => true, 'message' => 'Data anak berhasil diperbarui.', 'data' => new ChildResource($child)]);
    }

    public function destroy(Request $request, Child $child)
    {
        Gate::authorize('delete', $child);
        $old = $child->toArray();
        $child->delete();
        AuditLogService::log('DELETE', 'children', $child->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data anak berhasil dihapus']);
    }

    public function trashed(Request $request)
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $q = Child::onlyTrashed()->with(['posyandu']);
        if ($search = $request->query('search')) {
            $q->where('nama_lengkap', 'ilike', "%$search%");
        }
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => ChildResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function restore(Request $request, $id)
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $child = Child::onlyTrashed()->findOrFail($id);
        $child->restore();
        AuditLogService::log('RESTORE', 'children', $child->id, null, $child->toArray());

        return response()->json(['success' => true, 'message' => 'Data berhasil dipulihkan', 'data' => new ChildResource($child->load('posyandu'))]);
    }

    public function attachParent(Request $request, Child $child)
    {
        Gate::authorize('update', $child);
        $request->validate([
            'parent_id' => 'required_without:nama_lengkap|exists:parents,id',
            'nama_lengkap' => 'required_without:parent_id|string|max:255',
            'relationship' => 'required|in:Ayah,Ibu,Wali',
            'is_primary_contact' => 'nullable|boolean',
            'nik' => 'nullable|string|max:20',
            'nomor_telepon' => 'nullable|string|max:20',
            'alamat' => 'nullable|string',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'jenis_kelamin' => 'nullable|in:L,P',
            'pekerjaan' => 'nullable|string|max:100',
        ]);
        if (! empty($request->parent_id)) {
            $child->parents()->syncWithoutDetaching([$request->parent_id => ['relationship' => $request->relationship, 'is_primary_contact' => $request->is_primary_contact ?? false]]);
        } else {
            $parent = ParentModel::create($request->only(['nik', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'nomor_telepon', 'pekerjaan']));
            $child->parents()->attach($parent->id, ['relationship' => $request->relationship, 'is_primary_contact' => $request->is_primary_contact ?? false]);
        }
        AuditLogService::log('UPDATE', 'children', $child->id, null, ['attach_parent' => $request->all()]);

        return response()->json(['success' => true, 'message' => 'Orang tua berhasil dihubungkan']);
    }

    public function detachParent(Request $request, Child $child, $parentId)
    {
        Gate::authorize('update', $child);
        $child->parents()->detach($parentId);
        AuditLogService::log('UPDATE','children',$child->id,null,['detach_parent' => $parentId]);

        return response()->json(['success' => true, 'message' => 'Orang tua berhasil dilepas']);
    }
}
