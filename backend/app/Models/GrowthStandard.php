<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GrowthStandard extends Model
{
    use HasFactory;

    protected $fillable = ['indicator', 'gender', 'age_min', 'age_max', 'reference_type', 'reference_value', 'source', 'version'];
}
