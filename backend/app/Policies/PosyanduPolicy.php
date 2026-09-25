<?php

namespace App\Policies;

use App\Models\Posyandu;
use App\Models\User;

class PosyanduPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Posyandu $posyandu): bool
    {
        if ($user->role === 'SUPER_ADMIN') {
            return true;
        }

        return $user->canAccessPosyandu($posyandu->id);
    }

    public function create(User $user): bool
    {
        return $user->role === 'SUPER_ADMIN';
    }

    public function update(User $user, Posyandu $posyandu): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }

    public function delete(User $user, Posyandu $posyandu): bool
    {
        return $user->role === 'SUPER_ADMIN';
    }
}
