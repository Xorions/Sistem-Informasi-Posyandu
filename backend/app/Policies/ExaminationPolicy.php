<?php

namespace App\Policies;

use App\Models\Examination;
use App\Models\User;

class ExaminationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Examination $examination): bool
    {
        if ($user->role === 'SUPER_ADMIN') {
            return true;
        }

        return $user->canAccessPosyandu($examination->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER']);
    }

    public function update(User $user, Examination $examination): bool
    {
        return $user->canAccessPosyandu($examination->posyandu_id);
    }

    public function delete(User $user, Examination $examination): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }
}
