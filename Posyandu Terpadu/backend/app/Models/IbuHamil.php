<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class IbuHamil extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ibu_hamil';

    protected $fillable = [
        'parent_id',
        'posyandu_id',
        'hpht',
        'tanggal_perkiraan_lahir',
        'jarak_kehamilan',
        'jumlah_anak_lahir',
        'tinggi_funds',
        'berat_badan',
        'golongan_darah',
        'riwayat_penyakit',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'hpht' => 'date',
            'tanggal_perkiraan_lahir' => 'date',
            'status' => 'string',
        ];
    }

    public function parent()
    {
        return $this->belongsTo(ParentModel::class, 'parent_id');
    }

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function pemeriksaanBumils()
    {
        return $this->hasMany(PemeriksaanBumil::class)->latest('tanggal_periksa');
    }

    /**
     * Usia kehamilan dalam minggu, dihitung dari HPHT.
     *
     * Bila HPHT kosong, diturunkan mundur dari HPL (280 hari).
     * Nilai dibatasi 0-42 minggu agar data tidak tampak tidak masuk akal
     * bila tanggalnya salah input.
     */
    public function getUsiaKehamilanAttribute(): int
    {
        $acuan = $this->hpht
            ? Carbon::parse($this->hpht)
            : Carbon::parse($this->tanggal_perkiraan_lahir)->subDays(280);

        return max(0, min(42, (int) floor($acuan->diffInDays(Carbon::now()) / 7)));
    }

    /** Trimester saat ini: 1, 2, atau 3. */
    public function getTrimesterAttribute(): int
    {
        $usia = $this->usia_kehamilan;

        return $usia <= 13 ? 1 : ($usia <= 27 ? 2 : 3);
    }

    /** Pemeriksaan terakhir yang tercatat. */
    public function pemeriksaanTerakhir(): ?PemeriksaanBumil
    {
        return $this->pemeriksaanBumils()->first();
    }

    /** Apakah pemeriksaan bulan ini sudah tercatat? */
    public function sudahDiperiksa(): bool
    {
        return $this->pemeriksaanBumils()
            ->where('tanggal_periksa', '>=', Carbon::now()->startOfMonth()->toDateString())
            ->exists();
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->whereIn('posyandu_id', $user->posyanduIds());
    }
}