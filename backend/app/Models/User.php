<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'email', 'password', 'role', 'phone', 'is_active', 'parent_id'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function posyandus()
    {
        return $this->belongsToMany(Posyandu::class, 'user_posyandu')->withTimestamps();
    }

    /** Data orang tua yang tertaut dengan akun ini. Hanya relevan untuk ORANG_TUA. */
    public function parent()
    {
        return $this->belongsTo(ParentModel::class, 'parent_id');
    }

    /** Profil kader yang tertaut dengan akun ini, bila ada. */
    public function kader()
    {
        return $this->hasOne(Kader::class);
    }

    public function examinations()
    {
        return $this->hasMany(Examination::class, 'examiner_id');
    }

    public function hasRole(string|array $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];

        return in_array($this->role, $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::ADMIN->value;
    }

    public function isOrangTua(): bool
    {
        return $this->role === Role::ORANG_TUA->value;
    }

    /**
     * Daftar id posyandu yang boleh diakses pengguna ini.
     *
     * ADMIN selalu punya akses ke seluruh posyandu. ORANG_TUA mendapat
     * akses ke posyandu tempat anaknya terdaftar. Sisanya mengikuti pivot
     * user_posyandu.
     */
    public function posyanduIds(): array
    {
        if ($this->isAdmin()) {
            return Posyandu::pluck('id')->toArray();
        }

        if ($this->isOrangTua()) {
            if (! $this->parent_id) {
                return [];
            }

            return Child::whereHas('parents', fn ($q) => $q->where('parents.id', $this->parent_id))
                ->distinct()
                ->pluck('posyandu_id')
                ->toArray();
        }

        return $this->posyandus()->pluck('posyandu.id')->toArray();
    }

    public function canAccessPosyandu(?int $posyanduId): bool
    {
        if (! $posyanduId) {
            return true;
        }

        if ($this->isAdmin()) {
            return true;
        }

        return in_array($posyanduId, $this->posyanduIds(), true);
    }

    /** Apakah anak ini milik pengguna ini? Dipakai policy untuk ORANG_TUA. */
    public function ownsChild(Child $child): bool
    {
        if (! $this->isOrangTua() || ! $this->parent_id) {
            return false;
        }

        return $child->parents()->where('parents.id', $this->parent_id)->exists();
    }
}