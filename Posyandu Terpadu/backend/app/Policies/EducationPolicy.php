<?php

namespace App\Policies;

use App\Models\Education;
use App\Models\User;

class EducationPolicy
{
    public function viewAny(?User $user, ?Education $education = null): bool
    {
        return true;
    }

    /** Konten published dapat dibaca semua, termasuk pengunjung tanpa login. */
    public function view(?User $user, Education $education): bool
    {
        if ($education->status === 'published') {
            return true;
        }

        return $user?->isAdmin() ?? false;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Education $education): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Education $education): bool
    {
        return $user->isAdmin();
    }
}