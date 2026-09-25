<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FollowUp extends Model
{
    use HasFactory;

    protected $table = 'follow_ups';

    protected $fillable = ['child_id', 'posyandu_id', 'examination_id', 'type', 'status', 'follow_up_date', 'notes', 'handled_by'];

    protected $casts = ['follow_up_date' => 'date', 'status' => 'string'];

    public function child()
    {
        return $this->belongsTo(Child::class);
    }

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function examination()
    {
        return $this->belongsTo(Examination::class);
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
