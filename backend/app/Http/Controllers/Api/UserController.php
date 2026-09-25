<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Posyandu;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        if (! in_array($request->user()->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU'])) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $q = User::with('posyandus');
        if ($search = $request->query('search')) {
            $q->where('name', 'ilike', "%$search%")->orWhere('email', 'ilike', "%$search%");
        }
        if ($role = $request->query('role')) {
            $q->where('role', $role);
        }
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== 'SUPER_ADMIN' && $request->user()->role !== 'ADMIN_POSYANDU') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'role' => 'required|in:SUPER_ADMIN,ADMIN_POSYANDU,KADER,ORANG_TUA',
            'phone' => 'nullable|string|max:20',
            'posyandu_ids' => 'nullable|array',
            'posyandu_ids.*' => 'exists:posyandu,id',
        ]);
        // only SUPER_ADMIN can create SUPER_ADMIN
        if ($data['role'] === 'SUPER_ADMIN' && $request->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Hanya SUPER_ADMIN dapat membuat SUPER_ADMIN'], 403);
        }
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
        ]);
        if (! empty($data['posyandu_ids'])) {
            // check access to those posyandu
            foreach ($data['posyandu_ids'] as $pid) {
                if (! $request->user()->canAccessPosyandu($pid) && $request->user()->role !== 'SUPER_ADMIN') {
                    return response()->json(['success' => false, 'message' => 'Tidak memiliki akses ke Posyandu '.$pid], 403);
                }
            }
            $user->posyandus()->sync($data['posyandu_ids']);
        }
        AuditLogService::log('CREATE', 'users', $user->id, null, ['email' => $user->email, 'role' => $user->role]);

        return response()->json(['success' => true, 'message' => 'User berhasil dibuat', 'data' => $user->load('posyandus')], 201);
    }

    public function show(User $user)
    {
        if (! in_array(auth()->user()->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']) && auth()->user()->id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return response()->json(['success' => true, 'data' => $user->load('posyandus')]);
    }

    public function update(Request $request, User $user)
    {
        if ($request->user()->role !== 'SUPER_ADMIN' && $request->user()->id !== $user->id) {
            if ($request->user()->role === 'ADMIN_POSYANDU' && $user->role === 'SUPER_ADMIN') {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
        }
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|min:8|confirmed',
            'role' => 'sometimes|in:SUPER_ADMIN,ADMIN_POSYANDU,KADER,ORANG_TUA',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'posyandu_ids' => 'nullable|array',
            'posyandu_ids.*' => 'exists:posyandu,id',
        ]);
        $old = $user->toArray();
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        if (isset($data['role']) && $data['role'] === 'SUPER_ADMIN' && $request->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $posyanduIds = $data['posyandu_ids'] ?? null;
        unset($data['posyandu_ids']);
        $user->update($data);
        if (! is_null($posyanduIds)) {
            $user->posyandus()->sync($posyanduIds);
        }
        AuditLogService::log('UPDATE', 'users', $user->id, $old, ['email' => $user->email]);

        return response()->json(['success' => true, 'message' => 'User diperbarui', 'data' => $user->load('posyandus')]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->role !== 'SUPER_ADMIN') {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $old = $user->toArray();
        $user->delete();
        AuditLogService::log('DELETE', 'users', $user->id, $old, null);

        return response()->json(['success' => true, 'message' => 'User dihapus']);
    }
}
