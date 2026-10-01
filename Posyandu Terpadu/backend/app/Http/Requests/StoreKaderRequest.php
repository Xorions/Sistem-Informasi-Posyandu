<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKaderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'posyandu_id' => 'required|exists:posyandu,id',
            'user_id' => 'nullable|exists:users,id',
            'nama_kader' => 'required|string|max:255',
            'nik_kader' => 'nullable|string|max:20|unique:kader,nik_kader',
            'no_hp' => 'nullable|string|max:20',
            'jabatan' => 'nullable|string|max:100',
            'pendidikan' => 'nullable|string|max:50',
            'alamat' => 'nullable|string',
            'tanggal_mulai_tugas' => 'nullable|date|before_or_equal:today',
            'status' => 'nullable|in:active,inactive',
        ];
    }

    public function messages(): array
    {
        return [
            'posyandu_id.required' => 'Posyandu wajib dipilih.',
            'nama_kader.required' => 'Nama kader wajib diisi.',
            'nik_kader.unique' => 'NIK kader sudah terdaftar.',
            'nik_kader.max' => 'NIK maksimal 20 karakter.',
            'tanggal_mulai_tugas.before_or_equal' => 'Tanggal mulai tugas tidak boleh di masa depan.',
        ];
    }
}