<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIbuHamilRequest;
use App\Http\Requests\UpdateIbuHamilRequest;
use App\Http\Resources\IbuHamilResource;
use App\Http\Resources\PemeriksaanBumilResource;
use App\Models\IbuHamil;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class IbuHamilController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', IbuHamil::class);

        $q = IbuHamil::with(['parent', 'posyandu', 'pemeriksaanBumils'])
            ->forUser($request->user());

        if ($posyanduId = $request->query('posyandu_id')) {
            $q->where('posyandu_id', $posyanduId);
        }

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        // Trimester dihitung dari usia kehamilan, jadi harus difilter di
        // lapisan PHP, bukan di SQL.
        if ($trimester = $request->query('trimester')) {
            $ids = IbuHamil::with('parent')
                ->forUser($request->user())
                ->get()
                ->filter(fn ($i) => $i->trimester === (int) $trimester)
                ->pluck('id')
                ->all();

            $q->whereIn('id', $ids ?: [0]);
        }

        if ($search = $request->query('search')) {
            $q->whereHas('parent', fn ($p) => $p->where('nama_lengkap', 'ilike', "%$search%"));
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $data = $q->orderBy('tanggal_perkiraan_lahir')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => IbuHamilResource::collection($data),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'total' => $data->total(),
                'per_page' => $data->perPage(),
            ],
        ]);
    }

    public function store(StoreIbuHamilRequest $request)
    {
        if (! $request->user()->canAccessPosyandu((int) $request->validated('posyandu_id'))) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki akses ke posyandu tersebut',
            ], 403);
        }

        $ibuHamil = IbuHamil::create($request->validated());

        AuditLogService::log('CREATE', 'ibu_hamil', $ibuHamil->id, null, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Data ibu hamil berhasil ditambahkan',
            'data' => new IbuHamilResource($ibuHamil->load(['parent', 'posyandu'])),
        ], 201);
    }

    public function show(Request $request, IbuHamil $ibuHamil)
    {
        $this->authorize('view', $ibuHamil);

        return response()->json([
            'success' => true,
            'data' => new IbuHamilResource(
                $ibuHamil->load(['parent', 'posyandu', 'pemeriksaanBumils.examiner'])
            ),
        ]);
    }

    public function update(UpdateIbuHamilRequest $request, IbuHamil $ibuHamil)
    {
        $this->authorize('update', $ibuHamil);

        $old = $ibuHamil->only(['posyandu_id', 'hpht', 'tanggal_perkiraan_lahir', 'status']);

        $data = $request->validated();

        // Bila HPHT diubah, HPL ikut dihitung ulang agar tidak saling bertentangan.
        if (! empty($data['hpht'])) {
            $data['tanggal_perkiraan_lahir'] = Carbon::parse($data['hpht'])->addDays(280)->toDateString();
        }

        $ibuHamil->update($data);

        AuditLogService::log('UPDATE', 'ibu_hamil', $ibuHamil->id, $old, $data);

        return response()->json([
            'success' => true,
            'message' => 'Data ibu hamil berhasil diperbarui',
            'data' => new IbuHamilResource($ibuHamil->load(['parent', 'posyandu'])),
        ]);
    }

    public function destroy(IbuHamil $ibuHamil)
    {
        $this->authorize('delete', $ibuHamil);

        $old = $ibuHamil->only(['posyandu_id', 'tanggal_perkiraan_lahir']);
        $ibuHamil->delete();

        AuditLogService::log('DELETE', 'ibu_hamil', $ibuHamil->id, $old, null);

        return response()->json(['success' => true, 'message' => 'Data ibu hamil dihapus']);
    }

    /** Riwayat pemeriksaan kehamilan untuk satu ibu hamil. */
    public function pemeriksaan(Request $request, IbuHamil $ibuHamil)
    {
        $this->authorize('view', $ibuHamil);

        $q = $ibuHamil->pemeriksaanBumils()->with('examiner');

        if ($from = $request->query('from')) {
            $q->whereDate('tanggal_periksa', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $q->whereDate('tanggal_periksa', '<=', $to);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        $data = $q->paginate($perPage);

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
}