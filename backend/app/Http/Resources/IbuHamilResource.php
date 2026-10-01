<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class IbuHamilResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'posyandu_id' => $this->posyandu_id,
            'nama_ibu' => $this->whenLoaded('parent', fn () => $this->parent?->nama_lengkap),
            'nik' => $this->whenLoaded('parent', fn () => $this->parent?->nik),
            'nomor_telepon' => $this->whenLoaded('parent', fn () => $this->parent?->nomor_telepon),
            'alamat' => $this->whenLoaded('parent', fn () => $this->parent?->alamat),
            'orang_tua' => $this->whenLoaded('parent', fn () => $this->parent ? new ParentResource($this->parent) : null),
            'posyandu' => $this->whenLoaded('posyandu', fn () => new PosyanduResource($this->posyandu)),
            'hpht' => $this->hpht?->format('Y-m-d'),
            'tanggal_perkiraan_lahir' => $this->tanggal_perkiraan_lahir?->format('Y-m-d'),
            'usia_kehamilan' => $this->usia_kehamilan,
            'trimester' => $this->trimester,
            'sudah_diperiksa' => $this->sudahDiperiksa(),
            'jarak_kehamilan' => $this->jarak_kehamilan,
            'jumlah_anak_lahir' => $this->jumlah_anak_lahir,
            'tinggi_funds' => $this->tinggi_funds !== null ? (float) $this->tinggi_funds : null,
            'berat_badan' => $this->berat_badan !== null ? (float) $this->berat_badan : null,
            'golongan_darah' => $this->golongan_darah,
            'riwayat_penyakit' => $this->riwayat_penyakit,
            'status' => $this->status,
            'pemeriksaan_terakhir' => $this->whenLoaded(
                'pemeriksaanBumils',
                fn () => $this->pemeriksaanBumils->isNotEmpty()
                    ? new PemeriksaanBumilResource($this->pemeriksaanBumils->first())
                    : null
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}