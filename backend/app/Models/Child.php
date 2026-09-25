<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Child extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['posyandu_id', 'nik', 'nama_lengkap', 'nama_panggilan', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'nomor_kk', 'status'];

    protected $casts = ['tanggal_lahir' => 'date', 'status' => 'string'];

    protected $appends = ['umur_bulan', 'umur_tahun'];

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function parents()
    {
        return $this->belongsToMany(ParentModel::class, 'child_parent', 'child_id', 'parent_id')->withPivot(['relationship', 'is_primary_contact'])->withTimestamps();
    }

    public function examinations()
    {
        return $this->hasMany(Examination::class)->where('status', 'active');
    }

    public function allExaminations()
    {
        return $this->hasMany(Examination::class);
    }

    public function immunizations()
    {
        return $this->hasMany(Immunization::class);
    }

    public function followUps()
    {
        return $this->hasMany(FollowUp::class);
    }

    public function getUmurBulanAttribute(): int
    {
        return Carbon::parse($this->tanggal_lahir)->diffInMonths(now());
    }

    public function getUmurTahunAttribute(): float
    {
        return round(Carbon::parse($this->tanggal_lahir)->diffInMonths(now()) / 12, 1);
    }

    public function getAgeInMonthsAttribute(): int
    {
        return $this->umur_bulan;
    }
}
