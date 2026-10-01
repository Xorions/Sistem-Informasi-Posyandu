<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PemeriksaanBumilResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'ibu_hamil_id' => $this->ibu_hamil_id,
            'examiner_id' => $this->examiner_id,
            'nama_pemeriksa' => $this->whenLoaded('examiner', fn () => $this->examiner?->name),
            'nama_ibu' => $this->whenLoaded(
                'ibuHamil',
                fn () => $this->ibuHamil?->parent?->nama_lengkap
            ),
            'tanggal_periksa' => $this->tanggal_periksa?->format('Y-m-d'),
            'usia_kehamilan' => $this->usia_kehamilan,
            'berat_badan' => $this->berat_badan !== null ? (float) $this->berat_badan : null,
            'tinggi_badan' => $this->tinggi_badan !== null ? (float) $this->tinggi_badan : null,
            'tekanan_darah' => $this->tekanan_darah,
            'lingkar_lengan_atas' => $this->lingkar_lengan_atas !== null ? (float) $this->lingkar_lengan_atas : null,
            'tinggi_funds' => $this->tinggi_funds !== null ? (float) $this->tinggi_funds : null,
            'denyut_jantung_janin' => $this->denyut_jantung_janin,
            'posisi_janin' => $this->posisi_janin,
            'keluhan' => $this->keluhan,
            'catatan' => $this->catatan,
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}