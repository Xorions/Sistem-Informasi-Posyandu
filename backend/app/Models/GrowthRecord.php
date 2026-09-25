<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GrowthRecord extends Model
{
    use HasFactory;

    protected $fillable = ['examination_id', 'weight', 'height', 'length', 'head_circumference', 'arm_circumference'];

    protected $casts = ['weight' => 'decimal:2', 'height' => 'decimal:2', 'length' => 'decimal:2', 'head_circumference' => 'decimal:2', 'arm_circumference' => 'decimal:2'];

    public function examination()
    {
        return $this->belongsTo(Examination::class);
    }
}
