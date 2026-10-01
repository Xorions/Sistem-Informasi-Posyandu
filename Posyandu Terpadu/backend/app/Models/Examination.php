<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Examination extends Model
{
    use HasFactory;

    protected $fillable = ['child_id', 'posyandu_id', 'examination_date', 'examiner_id', 'notes', 'status', 'void_reason'];

    protected $casts = ['examination_date' => 'date', 'status' => 'string'];

    public function child()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function examiner()
    {
        return $this->belongsTo(User::class, 'examiner_id');
    }

    public function growthRecord()
    {
        return $this->hasOne(GrowthRecord::class);
    }

    public function followUps()
    {
        return $this->hasMany(FollowUp::class);
    }

    public function scopeActive($q)
    {
        return $q->where('status', 'active');
    }

    /** Batasi pemeriksaan sesuai cakupan pengguna; orang tua hanya anaknya. */
    public function scopeForUser($query, User $user)
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

        return $query->whereIn('posyandu_id', $user->posyanduIds());
    }
}
