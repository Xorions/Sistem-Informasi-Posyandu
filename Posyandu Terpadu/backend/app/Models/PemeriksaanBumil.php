<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PemeriksaanBumil extends Model
{
    use HasFactory;

    protected $table = 'pemeriksaan_bumil';

    protected $fillable = [
        'ibu_hamil_id',
        'examiner_id',
        'tanggal_periksa',
        'usia_kehamilan',
        'berat_badan',
        'tinggi_badan',
        'tekanan_darah',
        'lingkar_lengan_atas',
        'tinggi_funds',
        'denyut_jantung_janin',
        'posisi_janin',
        'keluhan',
        'catatan',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_periksa' => 'date',
            'status' => 'string',
        ];
    }

    public function ibuHamil()
    {
        return $this->belongsTo(IbuHamil::class, 'ibu_hamil_id');
    }

    public function examiner()
    {
        return $this->belongsTo(User::class, 'examiner_id');
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->whereHas(
            'ibuHamil',
            fn ($q) => $q->whereIn('posyandu_id', $user->posyanduIds())
        );
    }
}