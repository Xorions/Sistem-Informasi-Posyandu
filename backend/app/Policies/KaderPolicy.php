<?php

namespace App\Policies;

use App\Models\Kader;
use App\Models\User;

class KaderPolicy
{
    public function viewAny(User $user): bool
    {
        // Kader boleh melihat rekan satu posyandu, admin semuanya.
        return ! $user->isOrangTua();
    }

    public function view(User $user, Kader $kader): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->canAccessPosyandu($kader->posyandu_id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Kader $kader): bool
    {
        if (! $user->isAdmin()) {
            return false;
        }

        return $user->canAccessPosyandu($kader->posyandu_id);
    }

    public function delete(User $user, Kader $kader): bool
    {
        return $user->isAdmin();
    }
}