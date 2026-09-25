<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EducationCategory extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description'];

    public function educations()
    {
        return $this->hasMany(Education::class, 'category_id');
    }
}
