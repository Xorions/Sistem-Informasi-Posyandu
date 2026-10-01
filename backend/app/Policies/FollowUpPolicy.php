<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\FollowUp;
use App\Models\User;

class FollowUpPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FollowUp $followUp): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            return $user->ownsChild($followUp->child);
        }

        return $user->canAccessPosyandu($followUp->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, Role::operator(), true);
    }

    public function update(User $user, FollowUp $followUp): bool
    {
        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($followUp->posyandu_id);
    }

    public function delete(User $user, FollowUp $followUp): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        return $user->canAccessPosyandu($followUp->posyandu_id);
    }
}