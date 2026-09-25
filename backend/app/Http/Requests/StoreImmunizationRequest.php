<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreImmunizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'child_id' => 'required|exists:children,id',
            'vaccine_name' => 'required|string|max:100',
            'vaccination_date' => 'nullable|date|before_or_equal:today',
            'status' => 'required|in:sudah,belum,terjadwal',
            'notes' => 'nullable|string',
        ];
    }
}
