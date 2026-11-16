<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Ambil relasi posyandu secara dinamis dari database (via pivot user_posyandu atau profil kader)
        $posyandu = $this->posyandus?->first() ?? $this->kader?->posyandu;
        $posyanduId = $posyandu?->id ?? $this->kader?->posyandu_id ?? $this->posyandus()->value('posyandu.id');

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            // ID dan objek posyandu dinamis milik user/kader
            'posyandu_id' => $posyanduId,
            'posyandu' => $posyandu ? [
                'id' => $posyandu->id,
                'nama_posyandu' => $posyandu->nama_posyandu,
                'kode_posyandu' => $posyandu->kode_posyandu,
            ] : null,
            'posyandus' => $this->posyandus ? $this->posyandus->map(fn ($p) => [
                'id' => $p->id,
                'nama_posyandu' => $p->nama_posyandu,
                'kode_posyandu' => $p->kode_posyandu,
            ])->values() : [],
            'parent' => $this->parent ? [
                'id' => $this->parent->id,
                'nama_lengkap' => $this->parent->nama_lengkap,
                'nik' => $this->parent->nik,
                'nomor_telepon' => $this->parent->nomor_telepon,
            ] : null,
            'kader' => $this->kader ? [
                'id' => $this->kader->id,
                'nama_kader' => $this->kader->nama_kader,
                'nik_kader' => $this->kader->nik_kader,
                'jabatan' => $this->kader->jabatan,
                'posyandu_id' => $this->kader->posyandu_id,
            ] : null,
        ];
    }
}
