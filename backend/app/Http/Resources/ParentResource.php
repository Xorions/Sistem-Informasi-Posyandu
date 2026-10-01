<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ParentResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'nik' => $this->nik,
            'nama_lengkap' => $this->nama_lengkap,
            'tempat_lahir' => $this->tempat_lahir,
            'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
            'jenis_kelamin' => $this->jenis_kelamin,
            'alamat' => $this->alamat,
            'nomor_telepon' => $this->nomor_telepon,
            'pekerjaan' => $this->pekerjaan,
            'pivot' => $this->whenPivotLoaded('child_parent', fn () => [
                'relationship' => $this->pivot->relationship,
                'is_primary_contact' => (bool) $this->pivot->is_primary_contact,
            ]),
            'children_count' => $this->when(isset($this->children_count), $this->children_count),
        ];
    }
}
