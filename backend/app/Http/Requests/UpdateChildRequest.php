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

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('nama_lengkap')) {
            $merge['nama_lengkap'] = strip_tags((string) $this->input('nama_lengkap'));
        }
        if ($this->has('nama_panggilan')) {
            $merge['nama_panggilan'] = strip_tags((string) $this->input('nama_panggilan'));
        }
        if ($merge) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $childId = $this->route('child') ? $this->route('child')->id : $this->route('id');

        return [
            'posyandu_id' => 'sometimes|exists:posyandu,id',
            'nik' => ['sometimes', 'nullable', 'digits:16', Rule::unique('children', 'nik')->ignore($childId)->whereNull('deleted_at')],
            'nama_lengkap' => ['sometimes', 'string', 'max:255', "regex:/^[\pL\s\.\'\-]+$/u"],
            'nama_panggilan' => 'nullable|string|max:100',
            'tempat_lahir' => 'sometimes|string|max:100',
            'tanggal_lahir' => 'sometimes|date|before_or_equal:today',
            'jenis_kelamin' => 'sometimes|in:L,P',
            'alamat' => 'sometimes|string',
            'nomor_kk' => 'sometimes|nullable|digits:16',
            'status' => 'nullable|in:active,inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'nama_lengkap.regex' => 'Nama anak hanya boleh berisi huruf dan karakter umum nama.',
            'nik.digits' => 'NIK anak harus berjumlah 16 digit angka.',
            'nik.unique' => 'NIK sudah digunakan.',
            'nomor_kk.digits' => 'Nomor KK harus berjumlah 16 digit angka.',
            'tanggal_lahir.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
        ];
    }
}
