<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateParentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Orang tua bersifat read-only pada modul anak.
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        $id = $this->route('parent') ? $this->route('parent')->id : $this->route('id');

        return [
            'nik' => ['nullable', 'string', 'max:20', Rule::unique('parents', 'nik')->ignore($id)->whereNull('deleted_at')],
            'nama_lengkap' => 'sometimes|string|max:255',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before_or_equal:today',
            'jenis_kelamin' => 'nullable|in:L,P',
            'alamat' => 'nullable|string',
            'nomor_telepon' => 'nullable|string|max:20',
            'pekerjaan' => 'nullable|string|max:100',
        ];
    }
}
