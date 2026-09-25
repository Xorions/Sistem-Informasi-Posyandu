<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class EducationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->whenLoaded('category', fn () => ['id' => $this->category->id, 'name' => $this->category->name, 'slug' => $this->category->slug]),
            'category_id' => $this->category_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'thumbnail' => $this->thumbnail ? asset('storage/'.$this->thumbnail) : null,
            'content' => $this->content,
            'source' => $this->source,
            'source_url' => $this->source_url,
            'status' => $this->status,
            'author' => $this->whenLoaded('author', fn () => ['id' => $this->author->id, 'name' => $this->author->name]),
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
