<?php

namespace App\Policies;

use App\Models\Education;
use App\Models\User;

class EducationPolicy
{
    public function viewAny(?User $user, ?Education $e = null): bool
    {
        return true;
    }

    public function view(?User $user, Education $education): bool
    {
        if ($education->status === 'published') {
            return true;
        }
        if (! $user) {
            return false;
        }

        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }

    public function update(User $user, Education $education): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }

    public function delete(User $user, Education $education): bool
    {
        return in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU']);
    }
}
