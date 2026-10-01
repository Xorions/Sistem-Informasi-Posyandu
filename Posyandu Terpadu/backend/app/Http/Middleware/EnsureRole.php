<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        if (! in_array($user->role, $roles)) {
            return response()->json(['success' => false, 'message' => 'Forbidden: role tidak memiliki akses'], 403);
        }

        return $next($request);
    }
}
