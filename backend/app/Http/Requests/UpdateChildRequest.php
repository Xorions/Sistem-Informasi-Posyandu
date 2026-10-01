<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateChildRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Orang tua bersifat read-only pada modul anak.
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        $childId = $this->route('child') ? $this->route('child')->id : $this->route('id');

        return [
            'posyandu_id' => 'sometimes|exists:posyandu,id',
            'nik' => ['nullable', 'string', 'max:20', Rule::unique('children', 'nik')->ignore($childId)->whereNull('deleted_at')],
            'nama_lengkap' => 'sometimes|string|max:255',
            'nama_panggilan' => 'nullable|string|max:100',
            'tempat_lahir' => 'sometimes|string|max:100',
            'tanggal_lahir' => 'sometimes|date|before_or_equal:today',
            'jenis_kelamin' => 'sometimes|in:L,P',
            'alamat' => 'sometimes|string',
            'nomor_kk' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
        ];
    }
}
