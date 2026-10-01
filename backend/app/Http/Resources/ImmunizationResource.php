<?php

namespace App\Http\Resources;

use App\Models\Immunization;
use Illuminate\Http\Resources\Json\JsonResource;

class ImmunizationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'child_id' => $this->child_id,
            'nama_anak' => $this->whenLoaded('child', fn () => $this->child?->nama_lengkap),
            'jenis' => $this->jenis,
            'jenis_label' => Immunization::LABEL_JENIS[$this->jenis] ?? $this->jenis,
            'vaccine_name' => $this->vaccine_name,
            'batch' => $this->batch,
            'vaccination_date' => $this->vaccination_date?->format('Y-m-d'),
            'status' => $this->status,
            'notes' => $this->notes,
            'recorded_by' => $this->recorded_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}