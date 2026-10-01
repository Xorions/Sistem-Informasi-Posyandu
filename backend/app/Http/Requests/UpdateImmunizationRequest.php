<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateImmunizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'jenis' => 'sometimes|in:VAKSIN,VITAMIN',
            'vaccine_name' => 'sometimes|string|max:100',
            'batch' => 'nullable|string|max:50',
            'vaccination_date' => 'nullable|date|before_or_equal:today',
            'status' => 'sometimes|in:sudah,belum,terjadwal',
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'jenis.in' => 'Jenis pemberian tidak valid.',
            'vaccination_date.before_or_equal' => 'Tanggal pemberian tidak boleh di masa depan.',
            'status.in' => 'Status tidak valid.',
        ];
    }
}