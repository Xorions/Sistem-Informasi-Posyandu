<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Examination;
use App\Models\FollowUp;
use App\Models\Immunization;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $posyanduFilter = $request->query('posyandu_id');
        // validate access
        if ($posyanduFilter && ! $user->canAccessPosyandu((int) $posyanduFilter)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }
        $posyanduIds = null;
        if ($user->role === 'SUPER_ADMIN') {
            $posyanduIds = $posyanduFilter ? [(int) $posyanduFilter] : Posyandu::pluck('id')->toArray();
        } else {
            $ids = $user->posyanduIds();
            $posyanduIds = $posyanduFilter ? [(int) $posyanduFilter] : $ids;
            // if user has no posyandu, empty
            if (empty($posyanduIds)) {
                $posyanduIds = [-1];
            }
        }

        $totalAnak = Child::whereIn('posyandu_id', $posyanduIds)->count();
        $pemeriksaanBulanIni = Examination::whereIn('posyandu_id', $posyanduIds)->where('status', 'active')->whereMonth('examination_date', date('m'))->whereYear('examination_date', date('Y'))->count();
        $followUpPending = FollowUp::whereIn('posyandu_id', $posyanduIds)->where('status', 'pending')->count();
        $jumlahPosyandu = $user->role === 'SUPER_ADMIN' ? Posyandu::count() : count($posyanduIds);

        // per role additions
        $data = [
            'anak_terdaftar' => $totalAnak,
            'pemeriksaan_bulan_ini' => $pemeriksaanBulanIni,
            'follow_up_pending' => $followUpPending,
            'jumlah_posyandu' => $jumlahPosyandu,
        ];
        if (in_array($user->role, ['ADMIN_POSYANDU', 'SUPER_ADMIN'])) {
            $data['total_orang_tua'] = ParentModel::count();
            $data['total_pemeriksaan'] = Examination::whereIn('posyandu_id', $posyanduIds)->where('status', 'active')->count();
            $data['total_imunisasi'] = Immunization::whereHas('child', fn ($q) => $q->whereIn('posyandu_id', $posyanduIds))->count();
        }
        if ($user->role === 'SUPER_ADMIN') {
            $data['total_anak'] = Child::count();
            $data['total_pemeriksaan_global'] = Examination::where('status', 'active')->count();
            $data['total_kader'] = User::where('role', 'KADER')->count();
            $data['total_posyandu_global'] = Posyandu::count();
        }
        // perlu pemantauan = count from growth analysis? approximate: follow-ups pending + examinations with perlu perhatian? For MVP use follow_up pending as proxy plus imunisasi belum?
        $data['perlu_pemantauan'] = $followUpPending; // simplistic
        // chart data monthly examinations last 6 months
        $monthly = Examination::whereIn('posyandu_id', $posyanduIds)->where('status', 'active')
            ->select(DB::raw("to_char(examination_date, 'YYYY-MM') as month"), DB::raw('count(*) as total'))
            ->groupBy('month')->orderBy('month', 'desc')->limit(6)->get()->reverse()->values();
        $data['chart_monthly'] = $monthly;

        // growth trends: avg weight per month
        $growthTrend = DB::table('examinations')
            ->join('growth_records', 'growth_records.examination_id', '=', 'examinations.id')
            ->whereIn('examinations.posyandu_id', $posyanduIds)
            ->where('examinations.status', 'active')
            ->select(DB::raw("to_char(examinations.examination_date, 'YYYY-MM') as month"), DB::raw('avg(growth_records.weight) as avg_weight'), DB::raw('avg(growth_records.height) as avg_height'))
            ->groupBy('month')->orderBy('month', 'desc')->limit(6)->get()->reverse()->values();
        $data['growth_trend'] = $growthTrend;

        return response()->json(['success' => true, 'data' => $data]);
    }
}
