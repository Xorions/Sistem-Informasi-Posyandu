<?php

namespace App\Policies;

use App\Models\Child;
use App\Models\User;

class ChildPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER', 'ORANG_TUA']);
    }

    public function view(User $user, Child $child): bool
    {
        if ($user->role === 'SUPER_ADMIN') {
            return true;
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER']);
    }

    public function update(User $user, Child $child): bool
    {
        if (! in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER'])) {
            return false;
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function delete(User $user, Child $child): bool
    {
        if (! in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU'])) {
            return false;
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function restore(User $user, Child $child): bool
    {
        return $user->role === 'SUPER_ADMIN';
    }
}
