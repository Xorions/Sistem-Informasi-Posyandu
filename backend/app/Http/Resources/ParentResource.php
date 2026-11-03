<?php

namespace App\Http\Resources;

use App\Support\HasPiiMasking;
use App\Support\Mask;
use Illuminate\Http\Resources\Json\JsonResource;

class ParentResource extends JsonResource
{
    use HasPiiMasking;

    public function toArray($request): array
    {
        $showRaw = $this->shouldShowRawPii($request, $this->resource);

        return [
            'id' => $this->id,
            'nik' => $showRaw ? $this->nik : Mask::nik($this->nik),
            'nama_lengkap' => $this->nama_lengkap,
            'tempat_lahir' => $this->tempat_lahir,
            'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
            'jenis_kelamin' => $this->jenis_kelamin,
            'alamat' => $this->alamat,
            'nomor_telepon' => $showRaw ? $this->nomor_telepon : Mask::phone($this->nomor_telepon),
            'pekerjaan' => $this->pekerjaan,
            'pivot' => $this->whenPivotLoaded('child_parent', fn () => [
                'relationship' => $this->pivot->relationship,
                'is_primary_contact' => (bool) $this->pivot->is_primary_contact,
            ]),
            'children_count' => $this->when(isset($this->children_count), $this->children_count),
        ];
    }
}
