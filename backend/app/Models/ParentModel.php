<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ParentModel extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'parents';

    protected $fillable = ['nik', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'nomor_telepon', 'pekerjaan'];

    protected $casts = ['tanggal_lahir' => 'date'];

    public function children()
    {
        return $this->belongsToMany(Child::class, 'child_parent', 'parent_id', 'child_id')->withPivot(['relationship', 'is_primary_contact'])->withTimestamps();
    }

    /** Akun ORANG_TUA yang tertaut dengan profil ini. */
    public function user()
    {
        return $this->hasOne(User::class, 'parent_id');
    }

    public function ibuHamil()
    {
        return $this->hasOne(IbuHamil::class);
    }

    /**
     * Batasi daftar orang tua sesuai cakupan pengguna.
     * Orang tua hanya melihat profilnya sendiri, bukan database orang tua.
     */
    public function scopeForUser($query, User $user)
    {
        if ($user->isOrangTua()) {
            return $user->parent_id
                ? $query->where('id', $user->parent_id)
                : $query->whereRaw('1 = 0');
        }

        return $query;
    }
}