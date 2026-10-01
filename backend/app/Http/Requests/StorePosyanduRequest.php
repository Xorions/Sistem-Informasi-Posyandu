<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePosyanduRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kode_posyandu' => 'required|string|max:50|unique:posyandu,kode_posyandu',
            'nama_posyandu' => 'required|string|max:255',
            'alamat' => 'required|string',
            'desa_kelurahan' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kabupaten_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'nama_ketua' => 'nullable|string|max:100',
            'nomor_telepon' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
        ];
    }
}
