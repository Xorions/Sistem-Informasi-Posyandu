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
}
