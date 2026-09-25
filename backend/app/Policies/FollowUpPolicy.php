<?php

namespace App\Policies;

use App\Models\FollowUp;
use App\Models\User;

class FollowUpPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FollowUp $f): bool
    {
        if ($user->role === 'SUPER_ADMIN') {
            return true;
        }

        return $user->canAccessPosyandu($f->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER']);
    }

    public function update(User $user, FollowUp $f): bool
    {
        return $user->canAccessPosyandu($f->posyandu_id);
    }

    public function delete(User $user, FollowUp $f): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }
}
