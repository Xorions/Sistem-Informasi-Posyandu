<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Child;
use App\Models\User;

class ChildPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, Role::values(), true);
    }

    public function view(User $user, Child $child): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // Orang tua hanya boleh melihat anaknya sendiri, bukan anak lain
        // meskipun berada di posyandu yang sama.
        if ($user->isOrangTua()) {
            return $user->ownsChild($child);
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, Role::operator(), true);
    }

    public function update(User $user, Child $child): bool
    {
        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function delete(User $user, Child $child): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        return $user->canAccessPosyandu($child->posyandu_id);
    }

    public function restore(User $user, Child $child): bool
    {
        return $user->isAdmin();
    }
}