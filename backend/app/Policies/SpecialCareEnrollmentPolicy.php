<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\SpecialCareEnrollment;
use App\Models\User;

class SpecialCareEnrollmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, SpecialCareEnrollment $enrollment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOrangTua()) {
            $child = $enrollment->child;

            return $child ? $user->ownsChild($child) : false;
        }

        return $user->canAccessPosyandu($enrollment->posyandu_id);
    }

    public function confirm(User $user, SpecialCareEnrollment $enrollment): bool
    {
        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($enrollment->posyandu_id);
    }

    public function reject(User $user, SpecialCareEnrollment $enrollment): bool
    {
        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($enrollment->posyandu_id);
    }

    public function exit(User $user, SpecialCareEnrollment $enrollment): bool
    {
        $authorizedRole = config('special_care.exit_authorized_role', 'ADMIN');

        if ($authorizedRole === 'ADMIN') {
            return $user->isAdmin();
        }

        if (! in_array($user->role, Role::operator(), true)) {
            return false;
        }

        return $user->canAccessPosyandu($enrollment->posyandu_id);
    }
}
