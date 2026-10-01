<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Education extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'educations';

    protected $fillable = ['category_id', 'title', 'slug', 'thumbnail', 'content', 'source', 'source_url', 'status', 'author_id', 'published_at'];

    protected $casts = ['published_at' => 'datetime', 'status' => 'string'];

    public function category()
    {
        return $this->belongsTo(EducationCategory::class, 'category_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    protected static function booted()
    {
        static::creating(function ($m) {
            if (empty($m->slug)) {
                $m->slug = Str::slug($m->title).'-'.uniqid();
            }
            if ($m->status === 'published' && ! $m->published_at) {
                $m->published_at = now();
            }
        });
        static::updating(function ($m) {
            if ($m->isDirty('title') && empty($m->slug)) {
                $m->slug = Str::slug($m->title).'-'.uniqid();
            }
            if ($m->isDirty('status') && $m->status === 'published' && ! $m->published_at) {
                $m->published_at = now();
            }
        });
    }

    public function scopePublished($q)
    {
        return $q->where('status', 'published');
    }
}
