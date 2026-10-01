<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Examination;
use App\Models\FollowUp;
use App\Models\IbuHamil;
use App\Models\Immunization;
use App\Models\Kader;
use App\Models\ParentModel;
use App\Models\Posyandu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $posyanduFilter = $request->query('posyandu_id');

        if ($posyanduFilter && ! $user->canAccessPosyandu((int) $posyanduFilter)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $posyanduIds = $posyanduFilter
            ? [(int) $posyanduFilter]
            : $user->posyanduIds();

        // Nilai -1 memastikan query tetap valid untuk pengguna tanpa posyandu.
        if (empty($posyanduIds)) {
            $posyanduIds = [-1];
        }

        $data = $this->baseMetrics($user, $posyanduIds);

        $data['jumlah_posyandu'] = $user->isAdmin()
            ? Posyandu::count()
            : count(array_filter($posyanduIds, fn ($id) => $id > 0));

        $this->roleExtras($user, $posyanduIds, $data);
        $this->charts($posyanduIds, $data);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Metrik utama. Untuk ORANG_TUA dihitung dari anaknya sendiri, bukan
     * dari seluruh anak di posyandu tempat anak tersebut terdaftar.
     *
     * @param  array<int, int>  $posyanduIds
     * @return array<string, mixed>
     */
    private function baseMetrics($user, array $posyanduIds): array
    {
        if ($user->isOrangTua()) {
            $followUpPending = FollowUp::forUser($user)->where('status', 'pending')->count();

            return [
                'anak_terdaftar' => Child::forUser($user)->count(),
                'pemeriksaan_bulan_ini' => Examination::forUser($user)
                    ->whereMonth('examination_date', now()->month)
                    ->whereYear('examination_date', now()->year)
                    ->count(),
                'follow_up_pending' => $followUpPending,
                // Proxy untuk kartu "Perlu Pemantauan", sama seperti logika lama.
                'perlu_pemantauan' => $followUpPending,
                'total_imunisasi' => Immunization::forUser($user)->count(),
            ];
        }

        $followUpPending = FollowUp::whereIn('posyandu_id', $posyanduIds)
            ->where('status', 'pending')
            ->count();

        return [
            'anak_terdaftar' => Child::whereIn('posyandu_id', $posyanduIds)->count(),
            'pemeriksaan_bulan_ini' => Examination::whereIn('posyandu_id', $posyanduIds)
                ->where('status', 'active')
                ->whereMonth('examination_date', now()->month)
                ->whereYear('examination_date', now()->year)
                ->count(),
            'follow_up_pending' => $followUpPending,
            'perlu_pemantauan' => $followUpPending,
        ];
    }

    /**
     * Metrik tambahan sesuai role. Kader melihat data posyandu ditugaskan,
     * ADMIN melihat agregat seluruh Posyandu Terpadu.
     *
     * @param  array<int, int>  $posyanduIds
     * @param  array<string, mixed>  $data
     */
    private function roleExtras($user, array $posyanduIds, array &$data): void
    {
        if ($user->isOrangTua()) {
            return;
        }

        $data['total_pemeriksaan'] = Examination::whereIn('posyandu_id', $posyanduIds)
            ->where('status', 'active')
            ->count();
        $data['total_imunisasi'] = Immunization::whereHas(
            'child',
            fn ($q) => $q->whereIn('posyandu_id', $posyanduIds)
        )->count();
        $data['total_vitamin'] = Immunization::where('jenis', 'VITAMIN')
            ->whereHas('child', fn ($q) => $q->whereIn('posyandu_id', $posyanduIds))
            ->count();
        $data['total_kader'] = Kader::whereIn('posyandu_id', $posyanduIds)
            ->where('status', 'active')
            ->count();
        $data['total_ibu_hamil'] = IbuHamil::whereIn('posyandu_id', $posyanduIds)
            ->where('status', 'active')
            ->count();

        if ($user->isAdmin()) {
            $data['total_orang_tua'] = ParentModel::count();
            $data['total_anak_global'] = Child::count();
            $data['total_posyandu_global'] = Posyandu::count();
        }
    }

    /**
     * @param  array<int, int>  $posyanduIds
     * @param  array<string, mixed>  $data
     */
    private function charts(array $posyanduIds, array &$data): void
    {
        // to_char() khusus PostgreSQL, sesuai driver default project ini.
        $data['chart_monthly'] = Examination::whereIn('posyandu_id', $posyanduIds)
            ->where('status', 'active')
            ->select(DB::raw("to_char(examination_date, 'YYYY-MM') as month"), DB::raw('count(*) as total'))
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->limit(6)
            ->get()
            ->reverse()
            ->values();

        $data['growth_trend'] = DB::table('examinations')
            ->join('growth_records', 'growth_records.examination_id', '=', 'examinations.id')
            ->whereIn('examinations.posyandu_id', $posyanduIds)
            ->where('examinations.status', 'active')
            ->select(
                DB::raw("to_char(examinations.examination_date, 'YYYY-MM') as month"),
                DB::raw('avg(growth_records.weight) as avg_weight'),
                DB::raw('avg(growth_records.height) as avg_height')
            )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->limit(6)
            ->get()
            ->reverse()
            ->values();
    }
}