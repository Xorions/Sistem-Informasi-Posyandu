<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectSpecialCareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'alasan_keluar' => 'required|string|min:3|max:1000',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'alasan_keluar.required' => 'Alasan penolakan kandidat wajib diisi.',
            'alasan_keluar.min' => 'Alasan penolakan minimal 3 karakter.',
            'alasan_keluar.max' => 'Alasan penolakan maksimal 1000 karakter.',
            'notes.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}
