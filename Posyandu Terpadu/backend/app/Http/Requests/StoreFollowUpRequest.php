<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFollowUpRequest extends FormRequest
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
            'examination_id' => 'nullable|exists:examinations,id',
            'type' => 'required|string|max:100',
            'status' => 'nullable|in:pending,in_progress,completed,cancelled',
            'follow_up_date' => 'nullable|date|after_or_equal:today',
            'notes' => 'nullable|string',
            'handled_by' => 'nullable|exists:users,id',
        ];
    }
}
