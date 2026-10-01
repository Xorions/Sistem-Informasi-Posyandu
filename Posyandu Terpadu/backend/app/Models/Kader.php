<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Kader extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kader';

    protected $fillable = [
        'posyandu_id',
        'user_id',
        'nama_kader',
        'nik_kader',
        'no_hp',
        'jabatan',
        'pendidikan',
        'alamat',
        'tanggal_mulai_tugas',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai_tugas' => 'date',
            'status' => 'string',
        ];
    }

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Batasi daftar kader sesuai cakupan posyandu pengguna. */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->whereIn('posyandu_id', $user->posyanduIds());
    }
}