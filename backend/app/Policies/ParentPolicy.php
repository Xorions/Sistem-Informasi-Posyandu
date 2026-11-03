<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\ParentModel;
use App\Models\User;

class ParentPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, Role::values(), true);
    }

    public function view(User $user, ParentModel $parent): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            return $user->parent_id !== null && (int) $user->parent_id === (int) $parent->id;
        }

        // Kader: hanya jika orang tua tersebut punya anak di posyandu binaannya.
        // Jika belum memiliki anak sama sekali, akses ditolak.
        $parentPosyandus = $parent->children()->pluck('posyandu_id')->toArray();
        if (empty($parentPosyandus)) {
            return false;
        }

        return ! empty(array_intersect($user->posyanduIds(), $parentPosyandus));
    }

    public function create(User $user): bool
    {
        return in_array($user->role, Role::operator(), true);
    }

    public function update(User $user, ParentModel $parent): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            return false;
        }

        $parentPosyandus = $parent->children()->pluck('posyandu_id')->toArray();
        if (empty($parentPosyandus)) {
            return false;
        }

        return ! empty(array_intersect($user->posyanduIds(), $parentPosyandus));
    }

    public function delete(User $user, ParentModel $parent): bool
    {
        return $user->isAdmin();
    }
}
