<?php

namespace App\Policies;

use App\Models\IbuHamil;
use App\Models\User;

class IbuHamilPolicy
{
    public function viewAny(User $user): bool
    {
        // Orang tua tidak diberi akses ke data ibu hamil lain.
        return ! $user->isOrangTua();
    }

    public function view(User $user, IbuHamil $ibuHamil): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            // Hanya data kehamilan ibunya sendiri.
            return $user->parent_id !== null && $user->parent_id === $ibuHamil->parent_id;
        }

        return $user->canAccessPosyandu($ibuHamil->posyandu_id);
    }

    public function create(User $user): bool
    {
        return ! $user->isOrangTua();
    }

    public function update(User $user, IbuHamil $ibuHamil): bool
    {
        if (! $user->isAdmin() && $user->isOrangTua()) {
            return false;
        }

        return $user->canAccessPosyandu($ibuHamil->posyandu_id);
    }

    public function delete(User $user, IbuHamil $ibuHamil): bool
    {
        return $user->isAdmin();
    }
}