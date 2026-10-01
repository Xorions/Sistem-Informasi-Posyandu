<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Posyandu extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'posyandu';

    protected $fillable = ['kode_posyandu', 'nama_posyandu', 'alamat', 'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi', 'nama_ketua', 'nomor_telepon', 'status'];

    protected $casts = ['status' => 'string'];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_posyandu')->withTimestamps();
    }

    public function children()
    {
        return $this->hasMany(Child::class);
    }

    public function examinations()
    {
        return $this->hasMany(Examination::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    public function followUps()
    {
        return $this->hasMany(FollowUp::class);
    }

    public function kaders()
    {
        return $this->hasMany(Kader::class);
    }

    public function ibuHamils()
    {
        return $this->hasMany(IbuHamil::class);
    }
}
