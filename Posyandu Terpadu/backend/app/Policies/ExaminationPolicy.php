<?php

namespace App\Policies;

use App\Enums\Role;
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
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            return $user->ownsChild($examination->child);
        }

        return $user->canAccessPosyandu($examination->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, Role::operator(), true);
    }

    public function update(User $user, Examination $examination): bool
    {
        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($examination->posyandu_id);
    }

    public function delete(User $user, Examination $examination): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        return $user->canAccessPosyandu($examination->posyandu_id);
    }
}