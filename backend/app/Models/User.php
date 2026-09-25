<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'email', 'password', 'role', 'phone', 'is_active'];

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

    public function hasRole(string|array $roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];

        return in_array($this->role, $roles);
    }

    public function posyanduIds(): array
    {
        if ($this->role === 'SUPER_ADMIN') {
            return Posyandu::pluck('id')->toArray();
        }

        return $this->posyandus()->pluck('posyandu.id')->toArray();
    }

    public function canAccessPosyandu(?int $posyanduId): bool
    {
        if (! $posyanduId) {
            return true;
        }
        if ($this->role === 'SUPER_ADMIN') {
            return true;
        }

        return in_array($posyanduId, $this->posyanduIds());
    }

    public function examinations()
    {
        return $this->hasMany(Examination::class, 'examiner_id');
    }
}
