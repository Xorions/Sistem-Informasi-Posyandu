<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExitSpecialCareRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:graduated,cancelled',
            'exit_date' => 'required|date|before_or_equal:today',
            'alasan_keluar' => 'required|string|min:3|max:1000',
            'exit_examination_id' => 'nullable|exists:examinations,id',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Status keluar wajib dipilih (graduated atau cancelled).',
            'status.in' => 'Status keluar harus graduated atau cancelled.',
            'exit_date.required' => 'Tanggal keluar wajib diisi.',
            'exit_date.date' => 'Format tanggal keluar tidak valid.',
            'exit_date.before_or_equal' => 'Tanggal keluar tidak boleh di masa depan.',
            'alasan_keluar.required' => 'Alasan keluar / pembatalan wajib diisi.',
            'alasan_keluar.min' => 'Alasan keluar minimal 3 karakter.',
            'alasan_keluar.max' => 'Alasan keluar maksimal 1000 karakter.',
            'exit_examination_id.exists' => 'Data pemeriksaan keluar tidak ditemukan.',
            'notes.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}
