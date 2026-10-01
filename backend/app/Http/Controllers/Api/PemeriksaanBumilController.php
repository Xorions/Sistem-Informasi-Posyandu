<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePemeriksaanBumilRequest;
use App\Http\Requests\UpdatePemeriksaanBumilRequest;
use App\Http\Resources\PemeriksaanBumilResource;
use App\Models\IbuHamil;
use App\Models\PemeriksaanBumil;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class PemeriksaanBumilController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', PemeriksaanBumil::class);

        $q = PemeriksaanBumil::with(['ibuHamil.parent', 'examiner'])
            ->forUser($request->user());

        if ($ibuHamilId = $request->query('ibu_hamil_id')) {
            $q->where('ibu_hamil_id', $ibuHamilId);
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        if ($from = $request->query('from')) {
            $q->whereDate('tanggal_periksa', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $q->whereDate('tanggal_periksa', '<=', $to);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        $data = $q->orderByDesc('tanggal_periksa')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => PemeriksaanBumilResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StorePemeriksaanBumilRequest $request)
    {
        $ibuHamil = IbuHamil::findOrFail($request->validated('ibu_hamil_id'));

        if (! $request->user()->canAccessPosyandu($ibuHamil->posyandu_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki akses ke posyandu tersebut',
            ], 403);
        }

        $data = $request->validated();
        $data['examiner_id'] = $request->user()->id;

        $pemeriksaan = PemeriksaanBumil::create($data);

        AuditLogService::log('CREATE', 'pemeriksaan_bumil', $pemeriksaan->id, null, $data);

        return response()->json([
            'success' => true,
            'message' => 'Hasil pemeriksaan berhasil disimpan',
            'data' => new PemeriksaanBumilResource($pemeriksaan->load(['examiner', 'ibuHamil.parent'])),
        ], 201);
    }

    public function show(Request $request, PemeriksaanBumil $pemeriksaan)
    {
        $this->authorize('view', $pemeriksaan);

        return response()->json([
            'success' => true,
            'data' => new PemeriksaanBumilResource(
                $pemeriksaan->load(['examiner', 'ibuHamil.parent', 'ibuHamil.posyandu'])
            ),
        ]);
    }

    public function update(UpdatePemeriksaanBumilRequest $request, PemeriksaanBumil $pemeriksaan)
    {
        $this->authorize('update', $pemeriksaan);

        $old = $pemeriksaan->only(['tanggal_periksa', 'usia_kehamilan', 'status']);
        $data = $request->validated();

        $pemeriksaan->update($data);

        AuditLogService::log('UPDATE', 'pemeriksaan_bumil', $pemeriksaan->id, $old, $data);

        return response()->json([
            'success' => true,
            'message' => 'Hasil pemeriksaan berhasil diperbarui',
            'data' => new PemeriksaanBumilResource($pemeriksaan->load(['examiner', 'ibuHamil.parent'])),
        ]);
    }

    public function destroy(PemeriksaanBumil $pemeriksaan)
    {
        $this->authorize('delete', $pemeriksaan);

        $old = $pemeriksaan->only(['tanggal_periksa', 'usia_kehamilan', 'status']);
        $pemeriksaan->delete();

        AuditLogService::log('DELETE', 'pemeriksaan_bumil', $pemeriksaan->id, $old, null);

        return response()->json([
            'success' => true,
            'message' => 'Hasil pemeriksaan dihapus',
        ]);
    }
}