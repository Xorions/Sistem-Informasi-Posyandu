<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExaminationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'child_id' => 'required|exists:children,id',
            'posyandu_id' => 'required|exists:posyandu,id',
            'examination_date' => 'required|date|before_or_equal:today',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:0|max:100',
            'height' => 'nullable|numeric|min:0|max:250',
            'length' => 'nullable|numeric|min:0|max:250',
            'head_circumference' => 'nullable|numeric|min:0|max:100',
            'arm_circumference' => 'nullable|numeric|min:0|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'child_id.required' => 'Anak wajib dipilih',
            'examination_date.required' => 'Tanggal pemeriksaan wajib diisi',
            'examination_date.before_or_equal' => 'Tanggal pemeriksaan tidak boleh di masa depan',
            'weight.numeric' => 'Berat badan harus numeric',
            'height.numeric' => 'Tinggi badan harus numeric',
            'head_circumference.numeric' => 'Lingkar kepala harus numeric',
            'arm_circumference.numeric' => 'Lingkar lengan harus numeric',
        ];
    }
}
