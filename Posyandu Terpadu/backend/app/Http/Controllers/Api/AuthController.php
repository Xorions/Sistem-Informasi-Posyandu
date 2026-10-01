<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['success' => false, 'message' => 'Email atau password salah'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['success' => false, 'message' => 'Akun tidak aktif'], 403);
        }

        $token = $user->createToken('posyandu-token')->plainTextToken;

        AuditLogService::log('LOGIN', 'auth', $user->id, null, ['email' => $user->email]);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'user' => $this->userPayload($user->fresh(['posyandus', 'parent', 'kader'])),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $request->user()->currentAccessToken()->delete();

        AuditLogService::log('LOGOUT', 'auth', $user->id);

        return response()->json(['success' => true, 'message' => 'Logout berhasil']);
    }

    public function user(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->userPayload($request->user()->load(['posyandus', 'parent', 'kader.posyandu'])),
        ]);
    }

    /**
     * Bentuk data pengguna yang dikembalikan ke frontend.
     *
     * `parent` diperlukan role ORANG_TUA agar frontend bisa menampilkan anak
     * sendiri, `kader` diperlukan role KADER agar nama petugasnya tampil.
     *
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'posyandus' => $user->posyandus->map(fn ($p) => [
                'id' => $p->id,
                'nama_posyandu' => $p->nama_posyandu,
                'kode_posyandu' => $p->kode_posyandu,
            ])->values(),
            'parent' => $user->parent ? [
                'id' => $user->parent->id,
                'nama_lengkap' => $user->parent->nama_lengkap,
                'nik' => $user->parent->nik,
                'nomor_telepon' => $user->parent->nomor_telepon,
            ] : null,
            'kader' => $user->kader ? [
                'id' => $user->kader->id,
                'nama_kader' => $user->kader->nama_kader,
                'nik_kader' => $user->kader->nik_kader,
                'jabatan' => $user->kader->jabatan,
                'posyandu_id' => $user->kader->posyandu_id,
            ] : null,
        ];
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['success' => true, 'message' => 'Link reset password telah dikirim ke email'])
            : response()->json(['success' => false, 'message' => 'Email tidak ditemukan'], 404);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);
        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password)])->setRememberToken(Str::random(60));
            $user->save();
            event(new PasswordReset($user));
        });

        return $status === Password::PASSWORD_RESET
            ? response()->json(['success' => true, 'message' => 'Password berhasil direset'])
            : response()->json(['success' => false, 'message' => __($status)], 400);
    }
}
