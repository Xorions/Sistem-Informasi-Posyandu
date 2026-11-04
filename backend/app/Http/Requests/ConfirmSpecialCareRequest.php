<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmSpecialCareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'entry_date' => 'nullable|date|before_or_equal:today',
            'alasan' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'entry_date.date' => 'Format tanggal masuk tidak valid.',
            'entry_date.before_or_equal' => 'Tanggal masuk tidak boleh di masa depan.',
            'alasan.max' => 'Alasan maksimal 1000 karakter.',
            'notes.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}
