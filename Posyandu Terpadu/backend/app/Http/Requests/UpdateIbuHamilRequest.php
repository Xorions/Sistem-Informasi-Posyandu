<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIbuHamilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'posyandu_id' => 'sometimes|exists:posyandu,id',
            'hpht' => 'nullable|date|before_or_equal:today',
            'tanggal_perkiraan_lahir' => 'nullable|date',
            'jarak_kehamilan' => 'nullable|integer|min:0|max:60',
            'jumlah_anak_lahir' => 'nullable|integer|min:0|max:15',
            'tinggi_funds' => 'nullable|numeric|min:10|max:45',
            'berat_badan' => 'nullable|numeric|min:30|max:150',
            'golongan_darah' => 'nullable|string|in:A,B,AB,O',
            'riwayat_penyakit' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ];
    }
}