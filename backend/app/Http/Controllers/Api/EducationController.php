<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEducationRequest;
use App\Http\Resources\EducationResource;
use App\Models\Education;
use App\Models\EducationCategory;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EducationController extends Controller
{
    public function index(Request $request)
    {
        $q = Education::with(['category', 'author']);
        // public sees only published, authenticated with role may see all? per spec: only published for umum, but authenticated also can access. For API we filter by status query.
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        } else {
            // if not admin, default published
            $user = $request->user();
            if (! $user || ! in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER'])) {
                $q->where('status', 'published');
            }
        }
        if ($cat = $request->query('category_id')) {
            $q->where('category_id', $cat);
        }
        if ($search = $request->query('search')) {
            $q->where('title', 'ilike', "%$search%");
        }
        $q->latest('published_at')->latest();
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => EducationResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function publicIndex(Request $request)
    {
        $q = Education::published()->with(['category', 'author']);
        if ($cat = $request->query('category_id')) {
            $q->where('category_id', $cat);
        }
        if ($search = $request->query('search')) {
            $q->where('title', 'ilike', "%$search%");
        }
        $q->latest('published_at');
        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => EducationResource::collection($data), 'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total(), 'per_page' => $data->perPage()]]);
    }

    public function show(Request $request, $slug)
    {
        $edu = Education::where('slug', $slug)->with(['category', 'author'])->firstOrFail();
        $user = $request->user();
        // if not published, need auth
        if ($edu->status !== 'published') {
            if (! $user || ! in_array($user->role, ['SUPER_ADMIN', 'ADMIN_POSYANDU'])) {
                return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
            }
        }

        return response()->json(['success' => true, 'data' => new EducationResource($edu)]);
    }

    public function store(StoreEducationRequest $request)
    {
        $this->authorize('create', Education::class);
        $data = $request->validated();
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']).'-'.uniqid();
        $data['author_id'] = $request->user()->id;
        // sanitize HTML: allow basic tags, strip script
        $data['content'] = $this->sanitize($data['content']);
        if ($request->hasFile('thumbnail')) {
            $data['thumbnail'] = $request->file('thumbnail')->store('educations', 'public');
        }
        if ($data['status'] === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }
        $edu = Education::create($data);
        AuditLogService::log('CREATE', 'educations', $edu->id, null, $edu->toArray());

        return response()->json(['success' => true, 'message' => 'Konten edukasi berhasil dibuat', 'data' => new EducationResource($edu->load(['category', 'author']))], 201);
    }

    public function update(Request $request, Education $education)
    {
        $this->authorize('update', $education);
        $data = $request->validate([
            'category_id' => 'sometimes|exists:education_categories,id',
            'title' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255|unique:educations,slug,'.$education->id,
            'thumbnail' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'content' => 'sometimes|string',
            'source' => 'nullable|string|max:255',
            'source_url' => 'nullable|url|max:500',
            'status' => 'sometimes|in:draft,published,archived',
        ]);
        $old = $education->toArray();
        if (isset($data['content'])) {
            $data['content'] = $this->sanitize($data['content']);
        }
        if (isset($data['title']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['title']).'-'.uniqid();
        }
        if ($request->hasFile('thumbnail')) {
            if ($education->thumbnail) {
                Storage::disk('public')->delete($education->thumbnail);
            }
            $data['thumbnail'] = $request->file('thumbnail')->store('educations', 'public');
        }
        if (($data['status'] ?? $education->status) === 'published' && ! $education->published_at) {
            $data['published_at'] = now();
        }
        $education->update($data);
        AuditLogService::log('UPDATE', 'educations', $education->id, $old, $education->toArray());

        return response()->json(['success' => true, 'message' => 'Konten edukasi berhasil diperbarui', 'data' => new EducationResource($education->load(['category', 'author']))]);
    }

    public function destroy(Education $education)
    {
        $this->authorize('delete', $education);
        $old = $education->toArray();
        $education->delete();
        AuditLogService::log('DELETE', 'educations', $education->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Konten edukasi berhasil dihapus']);
    }

    public function categories(Request $request)
    {
        $cats = EducationCategory::withCount('educations')->get();

        return response()->json(['success' => true, 'data' => $cats]);
    }

    public function publish(Education $education)
    {
        $this->authorize('update', $education);
        $education->update(['status' => 'published', 'published_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Konten dipublish', 'data' => new EducationResource($education)]);
    }

    public function unpublish(Education $education)
    {
        $this->authorize('update', $education);
        $education->update(['status' => 'draft']);

        return response()->json(['success' => true, 'message' => 'Konten di-unpublish', 'data' => new EducationResource($education)]);
    }

    private function sanitize(string $html): string
    {
        // Remove script tags and event handlers
        $html = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $html);
        $html = preg_replace('/\son\w+="[^"]*"/i', '', $html);
        $html = preg_replace("/\son\w+='[^']*'/i", '', $html);

        // Allowlist basic: you could use HTMLPurifier but for MVP strip malicious
        return $html;
    }
}
