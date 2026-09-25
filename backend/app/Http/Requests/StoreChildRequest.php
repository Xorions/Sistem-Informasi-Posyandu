<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreChildRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'posyandu_id' => 'required|exists:posyandu,id',
            'nik' => 'nullable|string|max:20|unique:children,nik',
            'nama_lengkap' => 'required|string|max:255',
            'nama_panggilan' => 'nullable|string|max:100',
            'tempat_lahir' => 'required|string|max:100',
            'tanggal_lahir' => 'required|date|before_or_equal:today',
            'jenis_kelamin' => 'required|in:L,P',
            'alamat' => 'required|string',
            'nomor_kk' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
            'parents' => 'nullable|array',
            'parents.*.parent_id' => 'nullable|exists:parents,id',
            'parents.*.nama_lengkap' => 'required_without:parents.*.parent_id|string|max:255',
            'parents.*.nik' => 'nullable|string|max:20',
            'parents.*.relationship' => 'required|in:Ayah,Ibu,Wali',
            'parents.*.is_primary_contact' => 'nullable|boolean',
            'parents.*.nomor_telepon' => 'nullable|string|max:20',
            'parents.*.alamat' => 'nullable|string',
            'parents.*.tempat_lahir' => 'nullable|string|max:100',
            'parents.*.tanggal_lahir' => 'nullable|date',
            'parents.*.jenis_kelamin' => 'nullable|in:L,P',
            'parents.*.pekerjaan' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'posyandu_id.required' => 'Posyandu wajib dipilih',
            'nama_lengkap.required' => 'Nama lengkap wajib diisi',
            'tanggal_lahir.required' => 'Tanggal lahir wajib diisi',
            'tanggal_lahir.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan',
        ];
    }
}
