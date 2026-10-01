<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePemeriksaanBumilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'ibu_hamil_id' => 'required|exists:ibu_hamil,id',
            'tanggal_periksa' => 'required|date|before_or_equal:today',
            'usia_kehamilan' => 'required|integer|min:0|max:42',
            'berat_badan' => 'nullable|numeric|min:30|max:150',
            'tinggi_badan' => 'nullable|numeric|min:120|max:200',
            // Disimpan sebagai teks "120/80" agar sistol/diastol tidak hilang.
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

    public function messages(): array
    {
        return [
            'ibu_hamil_id.required' => 'Data ibu hamil wajib dipilih.',
            'tanggal_periksa.required' => 'Tanggal periksa wajib diisi.',
            'tanggal_periksa.before_or_equal' => 'Tanggal periksa tidak boleh di masa depan.',
            'usia_kehamilan.required' => 'Usia kehamilan wajib diisi.',
            'usia_kehamilan.max' => 'Usia kehamilan maksimal 42 minggu.',
            'tekanan_darah.regex' => 'Format tekanan darah harus 120/80.',
            'lingkar_lengan_atas.min' => 'Lingkar lengan atas minimal 15 cm.',
            'lingkar_lengan_atas.max' => 'Lingkar lengan atas maksimal 50 cm.',
            'denyut_jantung_janin.min' => 'Denyut jantung janin minimal 80/menit.',
            'denyut_jantung_janin.max' => 'Denyut jantung janin maksimal 200/menit.',
        ];
    }
}