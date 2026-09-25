<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = ['posyandu_id', 'title', 'date', 'start_time', 'end_time', 'location', 'description', 'status'];

    protected $casts = ['date' => 'date', 'status' => 'string'];

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }
}
