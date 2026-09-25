<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ChildResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'posyandu' => $this->whenLoaded('posyandu', fn () => new PosyanduResource($this->posyandu)),
            'posyandu_id' => $this->posyandu_id,
            'nik' => $this->nik,
            'nama_lengkap' => $this->nama_lengkap,
            'nama_panggilan' => $this->nama_panggilan,
            'tempat_lahir' => $this->tempat_lahir,
            'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
            'jenis_kelamin' => $this->jenis_kelamin,
            'alamat' => $this->alamat,
            'nomor_kk' => $this->nomor_kk,
            'status' => $this->status,
            'umur_bulan' => $this->umur_bulan ?? null,
            'umur_tahun' => $this->umur_tahun ?? null,
            'parents' => ParentResource::collection($this->whenLoaded('parents')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
