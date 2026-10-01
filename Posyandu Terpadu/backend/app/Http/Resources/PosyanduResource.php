<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PosyanduResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'kode_posyandu' => $this->kode_posyandu,
            'nama_posyandu' => $this->nama_posyandu,
            'alamat' => $this->alamat,
            'desa_kelurahan' => $this->desa_kelurahan,
            'kecamatan' => $this->kecamatan,
            'kabupaten_kota' => $this->kabupaten_kota,
            'provinsi' => $this->provinsi,
            'nama_ketua' => $this->nama_ketua,
            'nomor_telepon' => $this->nomor_telepon,
            'status' => $this->status,
            'children_count' => $this->when(isset($this->children_count), $this->children_count),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
