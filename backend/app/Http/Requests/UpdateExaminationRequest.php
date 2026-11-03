<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExaminationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! $this->user()?->isOrangTua();
    }

    public function rules(): array
    {
        return [
            'examination_date' => 'sometimes|date|before_or_equal:today',
            'notes' => 'nullable|string',
            'weight' => 'nullable|numeric|min:1|max:40',
            'height' => 'nullable|numeric|min:30|max:150',
            'length' => 'nullable|numeric|min:30|max:150',
            'head_circumference' => 'nullable|numeric|min:25|max:65',
            'arm_circumference' => 'sometimes|required|numeric|min:7|max:30',
        ];
    }

    public function messages(): array
    {
        return [
            'examination_date.before_or_equal' => 'Tanggal pemeriksaan tidak boleh di masa depan.',
            'weight.numeric' => 'Berat badan harus berupa angka.',
            'weight.min' => 'Berat badan minimal 1 kg.',
            'weight.max' => 'Berat badan maksimal 40 kg.',
            'height.numeric' => 'Tinggi badan harus berupa angka.',
            'height.min' => 'Tinggi badan minimal 30 cm.',
            'height.max' => 'Tinggi badan maksimal 150 cm.',
            'length.numeric' => 'Panjang badan harus berupa angka.',
            'length.min' => 'Panjang badan minimal 30 cm.',
            'length.max' => 'Panjang badan maksimal 150 cm.',
            'head_circumference.numeric' => 'Lingkar kepala harus berupa angka.',
            'head_circumference.min' => 'Lingkar kepala minimal 25 cm.',
            'head_circumference.max' => 'Lingkar kepala maksimal 65 cm.',
            'arm_circumference.required' => 'Lingkar lengan atas (LiLA) wajib diisi.',
            'arm_circumference.numeric' => 'Lingkar lengan atas (LiLA) harus berupa angka.',
            'arm_circumference.min' => 'Lingkar lengan atas (LiLA) minimal 7 cm.',
            'arm_circumference.max' => 'Lingkar lengan atas (LiLA) maksimal 30 cm.',
        ];
    }
}
