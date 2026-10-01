<?php

namespace App\Http\Resources;

use App\Models\Immunization;
use Illuminate\Http\Resources\Json\JsonResource;

class KaderResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'posyandu_id' => $this->posyandu_id,
            'posyandu' => $this->whenLoaded('posyandu', fn () => new PosyanduResource($this->posyandu)),
            'user_id' => $this->user_id,
            'nama_kader' => $this->nama_kader,
            'nik_kader' => $this->nik_kader,
            'no_hp' => $this->no_hp,
            'jabatan' => $this->jabatan,
            'pendidikan' => $this->pendidikan,
            'alamat' => $this->alamat,
            'tanggal_mulai_tugas' => $this->tanggal_mulai_tugas?->format('Y-m-d'),
            'status' => $this->status,
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->role,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}