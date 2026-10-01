<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePemeriksaanBumilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'tanggal_periksa' => 'sometimes|date|before_or_equal:today',
            'usia_kehamilan' => 'sometimes|integer|min:0|max:42',
            'berat_badan' => 'nullable|numeric|min:30|max:150',
            'tinggi_badan' => 'nullable|numeric|min:120|max:200',
            'tekanan_darah' => 'nullable|string|regex:/^\d{2,3}\/\d{2,3}$/',
            'lingkar_lengan_atas' => 'nullable|numeric|min:15|max:50',
            'tinggi_funds' => 'nullable|numeric|min:10|max:45',
            'denyut_jantung_janin' => 'nullable|integer|min:80|max:200',
            'posisi_janin' => 'nullable|string|max:100',
            'keluhan' => 'nullable|string',
            'catatan' => 'nullable|string',
            'status' => 'nullable|in:normal,perlu_perhatian,danger',
        ];
    }
}