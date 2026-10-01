<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Riwayat pemberian vaksin atau vitamin pada anak.
 *
 * Satu tabel untuk dua jenis pemberian, dibedakan kolom `jenis`, karena
 * keduanya memiliki struktur pencatatan yang sama dan sering dibaca
 * bersamaan untuk menilai kelengkapan paket pemberian.
 */
class Immunization extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id',
        'jenis',
        'vaccine_name',
        'batch',
        'vaccination_date',
        'status',
        'notes',
        'recorded_by',
    ];

    protected $casts = ['vaccination_date' => 'date', 'status' => 'string'];

    /** Nama pemberian yang ditampilkan, mengikuti jenisnya. */
    public const LABEL_JENIS = [
        'VAKSIN' => 'Vaksin',
        'VITAMIN' => 'Vitamin',
    ];

    public function child()
    {
        return $this->belongsTo(Child::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function scopeVaksin(Builder $query): Builder
    {
        return $query->where('jenis', 'VAKSIN');
    }

    public function scopeVitamin(Builder $query): Builder
    {
        return $query->where('jenis', 'VITAMIN');
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        if ($user->isOrangTua()) {
            return $query->whereHas(
                'child',
                fn ($q) => $q->whereHas('parents', fn ($p) => $p->where('parents.id', $user->parent_id))
            );
        }

        return $query->whereHas(
            'child',
            fn ($q) => $q->whereIn('posyandu_id', $user->posyanduIds())
        );
    }
}