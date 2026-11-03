<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'posyandu_id' => $this->posyandu_id,
            'posyandu' => $this->whenLoaded('posyandu', fn () => new PosyanduResource($this->posyandu)),
            'title' => $this->title,
            'date' => $this->date ? $this->date->format('Y-m-d') : null,
            'start_time' => $this->start_time ? substr((string) $this->start_time, 0, 5) : null,
            'end_time' => $this->end_time ? substr((string) $this->end_time, 0, 5) : null,
            'location' => $this->location,
            'description' => $this->description,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
