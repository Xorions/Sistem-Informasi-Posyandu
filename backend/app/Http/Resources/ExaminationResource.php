<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExaminationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'child_id' => $this->child_id,
            'child' => $this->whenLoaded('child', fn () => new ChildResource($this->child)),
            'posyandu_id' => $this->posyandu_id,
            'posyandu' => $this->whenLoaded('posyandu', fn () => new PosyanduResource($this->posyandu)),
            'examination_date' => $this->examination_date?->format('Y-m-d'),
            'examiner' => $this->whenLoaded('examiner', fn () => ['id' => $this->examiner->id, 'name' => $this->examiner->name]),
            'examiner_id' => $this->examiner_id,
            'notes' => $this->notes,
            'status' => $this->status,
            'growth_record' => $this->whenLoaded('growthRecord', fn () => [
                'id' => $this->growthRecord->id,
                'weight' => $this->growthRecord->weight,
                'height' => $this->growthRecord->height,
                'length' => $this->growthRecord->length,
                'head_circumference' => $this->growthRecord->head_circumference,
                'arm_circumference' => $this->growthRecord->arm_circumference,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
