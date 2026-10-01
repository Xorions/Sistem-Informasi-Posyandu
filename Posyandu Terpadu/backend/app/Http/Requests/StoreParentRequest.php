<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreParentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Orang tua bersifat read-only pada modul anak.
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'nik' => 'nullable|string|max:20|unique:parents,nik',
            'nama_lengkap' => 'required|string|max:255',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before_or_equal:today',
            'jenis_kelamin' => 'nullable|in:L,P',
            'alamat' => 'nullable|string',
            'nomor_telepon' => 'nullable|string|max:20',
            'pekerjaan' => 'nullable|string|max:100',
        ];
    }
}
