<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Immunization extends Model
{
    use HasFactory;

    protected $fillable = ['child_id', 'vaccine_name', 'vaccination_date', 'status', 'notes', 'recorded_by'];

    protected $casts = ['vaccination_date' => 'date', 'status' => 'string'];

    public function child()
    {
        return $this->belongsTo(Child::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
