<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'posyandu_id' => 'required|exists:posyandu,id',
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,cancelled',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $posyanduId = $this->input('posyandu_id');
            $date = $this->input('date');
            $startTime = $this->input('start_time');
            $endTime = $this->input('end_time');

            if ($posyanduId && $date) {
                $query = \App\Models\Schedule::where('posyandu_id', $posyanduId)
                    ->whereDate('date', $date)
                    ->where('status', '!=', 'cancelled');

                if ($startTime && $endTime) {
                    $query->where(function ($q) use ($startTime, $endTime) {
                        $q->whereBetween('start_time', [$startTime, $endTime])
                            ->orWhereBetween('end_time', [$startTime, $endTime])
                            ->orWhere(function ($sub) use ($startTime, $endTime) {
                                $sub->where('start_time', '<=', $startTime)
                                    ->where('end_time', '>=', $endTime);
                            });
                    });
                }

                if ($query->exists()) {
                    $validator->errors()->add('date', 'Jadwal bentrok dengan jadwal posyandu lain pada waktu yang sama.');
                }
            }
        });
    }
}
