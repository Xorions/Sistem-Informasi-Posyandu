<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== Role::ADMIN->value) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $q = User::with(['posyandus', 'parent', 'kader']);
        if ($search = $request->query('search')) {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'ilike', "%$search%")
                    ->orWhere('email', 'ilike', "%$search%");
            });
        }
        if ($role = $request->query('role')) {
            $q->where('role', $role);
        }
        $perPage = min((int) $request->query('per_page', 10), 100);

        return response()->json([
            'success' => true,
            'data' => $q->paginate($perPage),
        ]);
    }

    public function store(Request $request)
    {
        if ($request->user()->role !== Role::ADMIN->value) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'role' => 'required|in:'.implode(',', Role::values()),
            'phone' => 'nullable|string|max:20',
            // Wajib untuk ORANG_TUA agar pembatasan akses ke anaknya bisa ditegakkan.
            'parent_id' => 'required_if:role,'.Role::ORANG_TUA->value.'|nullable|exists:parents,id',
            'posyandu_ids' => 'nullable|array',
            'posyandu_ids.*' => 'exists:posyandu,id',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'parent_id' => $data['role'] === Role::ORANG_TUA->value ? $data['parent_id'] : null,
        ]);

        if (! empty($data['posyandu_ids'])) {
            $user->posyandus()->sync($data['posyandu_ids']);
        }

        AuditLogService::log('CREATE', 'users', $user->id, null, [
            'email' => $user->email,
            'role' => $user->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dibuat',
            'data' => $user->load(['posyandus', 'parent']),
        ], 201);
    }

    public function show(Request $request, User $user)
    {
        if ($request->user()->role !== Role::ADMIN->value && $request->user()->id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $user->load(['posyandus', 'parent', 'kader']),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $isAdmin = $request->user()->role === Role::ADMIN->value;

        if (! $isAdmin && $request->user()->id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|min:8|confirmed',
            // Hanya ADMIN yang boleh mengubah role.
            'role' => ($isAdmin ? 'sometimes' : 'prohibited').'|in:'.implode(',', Role::values()),
            'phone' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'parent_id' => 'nullable|exists:parents,id',
            'posyandu_ids' => 'nullable|array',
            'posyandu_ids.*' => 'exists:posyandu,id',
        ]);

        if (array_key_exists('password', $data)) {
            if (empty($data['password'])) {
                unset($data['password']);
            } else {
                $data['password'] = Hash::make($data['password']);
            }
        }

        $old = $user->only(['name', 'email', 'role', 'phone', 'is_active', 'parent_id']);

        $posyanduIds = $data['posyandu_ids'] ?? null;
        unset($data['posyandu_ids']);

        $user->update($data);

        if (! is_null($posyanduIds)) {
            $user->posyandus()->sync($posyanduIds);
        }

        AuditLogService::log('UPDATE', 'users', $user->id, $old, [
            'email' => $user->email,
            'role' => $user->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User diperbarui',
            'data' => $user->load(['posyandus', 'parent']),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($request->user()->role !== Role::ADMIN->value) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        if ($request->user()->id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus akun sendiri',
            ], 422);
        }

        $old = $user->only(['name', 'email', 'role']);
        $user->delete();

        AuditLogService::log('DELETE', 'users', $user->id, $old, null);

        return response()->json(['success' => true, 'message' => 'User dihapus']);
    }
}