<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIbuHamilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'parent_id' => 'required|exists:parents,id',
            'posyandu_id' => 'required|exists:posyandu,id',
            // Salah satu dari HPHT atau HPL wajib diisi agar usia kehamilan bisa dihitung.
            'hpht' => 'nullable|date|before_or_equal:today|required_without:tanggal_perkiraan_lahir',
            'tanggal_perkiraan_lahir' => 'nullable|date|after:today|required_without:hpht',
            'jarak_kehamilan' => 'nullable|integer|min:0|max:60',
            'jumlah_anak_lahir' => 'nullable|integer|min:0|max:15',
            'tinggi_funds' => 'nullable|numeric|min:10|max:45',
            'berat_badan' => 'nullable|numeric|min:30|max:150',
            'golongan_darah' => 'nullable|string|in:A,B,AB,O',
            'riwayat_penyakit' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'parent_id.required' => 'Data orang tua wajib dipilih.',
            'posyandu_id.required' => 'Posyandu wajib dipilih.',
            'hpht.required_without' => 'Isi HPHT atau perkiraan lahir.',
            'tanggal_perkiraan_lahir.required_without' => 'Isi HPHT atau perkiraan lahir.',
            'tanggal_perkiraan_lahir.after' => 'Perkiraan lahir harus di masa depan.',
            'tinggi_funds.min' => 'Tinggi fundus minimal 10 cm.',
            'tinggi_funds.max' => 'Tinggi fundus maksimal 45 cm.',
            'golongan_darah.in' => 'Golongan darah tidak valid.',
        ];
    }
}