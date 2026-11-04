<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SpecialCareEnrollmentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'child_id' => $this->child_id,
            'posyandu_id' => $this->posyandu_id,
            'track' => $this->track,
            'status' => $this->status,
            'perlu_rujukan' => (bool) $this->perlu_rujukan,
            'alasan_masuk' => $this->alasan_masuk,
            'entry_examination_id' => $this->entry_examination_id,
            'entry_date' => $this->entry_date?->format('Y-m-d'),
            'exit_date' => $this->exit_date?->format('Y-m-d'),
            'alasan_keluar' => $this->alasan_keluar,
            'exit_examination_id' => $this->exit_examination_id,
            'confirmed_by' => $this->confirmed_by,
            'notes' => $this->notes,
            'days_in_program' => $this->days_in_program,

            // Relations
            'child' => $this->whenLoaded('child', fn () => new ChildResource($this->child)),
            'posyandu' => $this->whenLoaded('posyandu', fn () => [
                'id' => $this->posyandu->id,
                'kode_posyandu' => $this->posyandu->kode_posyandu,
                'nama_posyandu' => $this->posyandu->nama_posyandu,
            ]),
            'confirmed_by_user' => $this->whenLoaded('confirmedBy', fn () => [
                'id' => $this->confirmedBy->id,
                'name' => $this->confirmedBy->name,
                'role' => $this->confirmedBy->role,
            ]),
            'entry_examination' => $this->whenLoaded('entryExamination', fn () => [
                'id' => $this->entryExamination->id,
                'examination_date' => $this->entryExamination->examination_date?->format('Y-m-d'),
                'growth_record' => $this->entryExamination->growthRecord,
            ]),
            'exit_examination' => $this->whenLoaded('exitExamination', fn () => [
                'id' => $this->exitExamination->id,
                'examination_date' => $this->exitExamination->examination_date?->format('Y-m-d'),
                'growth_record' => $this->exitExamination->growthRecord,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
