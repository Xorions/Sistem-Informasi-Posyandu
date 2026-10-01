<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEducationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => 'required|exists:education_categories,id',
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:educations,slug',
            'thumbnail' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'content' => 'required|string',
            'source' => 'nullable|string|max:255',
            'source_url' => 'nullable|url|max:500',
            'status' => 'required|in:draft,published,archived',
        ];
    }
}
