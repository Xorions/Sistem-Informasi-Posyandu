<?php

namespace App\Support;

use App\Models\Child;
use App\Models\Kader;
use App\Models\ParentModel;
use Illuminate\Http\Request;

trait HasPiiMasking
{
    /**
     * Tentukan apakah PII boleh ditampilkan mentah atau harus dimask.
     */
    protected function shouldShowRawPii(Request $request, $model, ?int $posyanduId = null): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        // Pada endpoint index atau export, kader SELALU dimask
        $isIndex = $request->routeIs('*.index') || $request->query('export') !== null;

        if ($user->isOrangTua()) {
            if ($model instanceof ParentModel) {
                return (int) $user->parent_id === (int) $model->id;
            }
            if ($model instanceof Child) {
                return $user->ownsChild($model);
            }

            return false;
        }

        if ($user->isKader()) {
            if ($isIndex) {
                return false;
            }

            // Pada show / edit, sediakan nilai utuh untuk kader yang berwenang
            if ($posyanduId !== null) {
                return $user->canAccessPosyandu($posyanduId);
            }

            if ($model instanceof Kader) {
                return (int) $model->user_id === (int) $user->id || $user->canAccessPosyandu($model->posyandu_id);
            }

            if ($model instanceof ParentModel) {
                return $model->children()->whereIn('posyandu_id', $user->posyanduIds())->exists();
            }

            if ($model instanceof Child) {
                return $user->canAccessPosyandu($model->posyandu_id);
            }
        }

        return false;
    }
}
