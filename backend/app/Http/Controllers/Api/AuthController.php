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
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'posyandus' => $user->posyandus()->get(['posyandu.id', 'nama_posyandu', 'kode_posyandu']),
                ],
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
        $user = $request->user()->load('posyandus');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'posyandus' => $user->posyandus->map(fn ($p) => ['id' => $p->id, 'nama_posyandu' => $p->nama_posyandu, 'kode_posyandu' => $p->kode_posyandu]),
            ],
        ]);
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
