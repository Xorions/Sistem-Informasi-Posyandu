<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreImmunizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Orang tua hanya boleh membaca, tidak boleh mencatat pemberian.
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'child_id' => 'required|exists:children,id',
            'jenis' => 'nullable|in:VAKSIN,VITAMIN',
            'vaccine_name' => 'required|string|max:100',
            'batch' => 'nullable|string|max:50',
            'vaccination_date' => 'nullable|date|before_or_equal:today',
            'status' => 'required|in:sudah,belum,terjadwal',
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'child_id.required' => 'Anak wajib dipilih.',
            'jenis.in' => 'Jenis pemberian tidak valid.',
            'vaccine_name.required' => 'Nama vaksin/vitamin wajib diisi.',
            'vaccination_date.before_or_equal' => 'Tanggal pemberian tidak boleh di masa depan.',
            'status.required' => 'Status wajib dipilih.',
            'status.in' => 'Status tidak valid.',
        ];
    }
}