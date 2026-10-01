<?php

namespace App\Policies;

use App\Models\PemeriksaanBumil;
use App\Models\User;

class PemeriksaanBumilPolicy
{
    public function viewAny(User $user): bool
    {
        return ! $user->isOrangTua();
    }

    public function view(User $user, PemeriksaanBumil $pemeriksaan): bool
    {
        return $this->update($user, $pemeriksaan);
    }

    public function create(User $user): bool
    {
        return ! $user->isOrangTua();
    }

    public function update(User $user, PemeriksaanBumil $pemeriksaan): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            return $user->parent_id !== null
                && $user->parent_id === $pemeriksaan->ibuHamil?->parent_id;
        }

        return $user->canAccessPosyandu($pemeriksaan->ibuHamil?->posyandu_id);
    }

    public function delete(User $user, PemeriksaanBumil $pemeriksaan): bool
    {
        return $user->isAdmin();
    }
}