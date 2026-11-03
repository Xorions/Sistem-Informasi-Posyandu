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
            'nik' => ['sometimes', 'nullable', 'digits:16', Rule::unique('parents', 'nik')->ignore($id)->whereNull('deleted_at')],
            'nama_lengkap' => 'sometimes|string|max:255',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before_or_equal:today',
            'jenis_kelamin' => 'nullable|in:L,P',
            'alamat' => 'nullable|string',
            'nomor_telepon' => ['sometimes', 'nullable', 'string', 'regex:/^(\+62|62|0)8[1-9][0-9]{6,11}$/'],
            'pekerjaan' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'nik.digits' => 'NIK orang tua harus berjumlah 16 digit angka.',
            'nik.unique' => 'NIK orang tua sudah terdaftar.',
            'nomor_telepon.regex' => 'Format nomor telepon tidak valid (contoh: 081234567890).',
            'tanggal_lahir.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
        ];
    }
}
