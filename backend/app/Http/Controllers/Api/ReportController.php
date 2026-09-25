<?php

namespace App\Http\Controllers\Api;

use App\Exports\GenericExport;
use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Examination;
use App\Models\FollowUp;
use App\Models\Immunization;
use App\Models\Posyandu;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    private function getPosyanduIds(Request $request): array
    {
        $user = $request->user();
        $filter = $request->query('posyandu_id');
        if ($filter && ! $user->canAccessPosyandu((int) $filter)) {
            abort(403, 'Forbidden');
        }
        if ($user->role === 'SUPER_ADMIN') {
            return $filter ? [(int) $filter] : Posyandu::pluck('id')->toArray();
        }
        $ids = $user->posyanduIds();

        return $filter ? [(int) $filter] : (empty($ids) ? [-1] : $ids);
    }

    public function anak(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $q = Child::with('posyandu')->whereIn('posyandu_id', $ids);
        if ($request->query('from')) {
            $q->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $q->whereDate('created_at', '<=', $request->query('to'));
        }
        if ($request->query('jenis_kelamin')) {
            $q->where('jenis_kelamin', $request->query('jenis_kelamin'));
        }
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }
        if ($search = $request->query('search')) {
            $q->where('nama_lengkap', 'ilike', "%$search%");
        }
        // usia filter
        if ($request->query('usia_min') || $request->query('usia_max')) {
            // usia in months; compute tanggal_lahir range
            // simplified: filter by tanggal_lahir
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        if ($request->query('export') === 'csv') {
            return $this->exportCsv($q->get(), 'laporan-anak');
        }
        if ($request->query('export') === 'excel') {
            return $this->exportExcel($q->get(), 'laporan-anak');
        }
        if ($request->query('export') === 'pdf') {
            return $this->exportPdf($q->get(), 'laporan-anak', 'reports.anak');
        }
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function pemeriksaan(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $q = Examination::with(['child', 'posyandu', 'growthRecord'])->whereIn('posyandu_id', $ids)->where('status', 'active');
        if ($request->query('from')) {
            $q->whereDate('examination_date', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $q->whereDate('examination_date', '<=', $request->query('to'));
        }
        if ($request->query('posyandu_id')) {
            $q->where('posyandu_id', $request->query('posyandu_id'));
        }
        if ($request->query('export') === 'csv') {
            return $this->exportCsv($q->get()->map(fn ($e) => [
                'tanggal' => $e->examination_date->format('Y-m-d'), 'anak' => $e->child->nama_lengkap, 'posyandu' => $e->posyandu->nama_posyandu, 'bb' => $e->growthRecord?->weight, 'tb' => $e->growthRecord?->height, 'lk' => $e->growthRecord?->head_circumference, 'lila' => $e->growthRecord?->arm_circumference,
            ]), 'laporan-pemeriksaan');
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $data = $q->orderBy('examination_date', 'desc')->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function pertumbuhan(Request $request)
    {
        // similar to pemeriksaan but focus on growth
        return $this->pemeriksaan($request);
    }

    public function imunisasi(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $q = Immunization::with('child')->whereHas('child', fn ($qq) => $qq->whereIn('posyandu_id', $ids));
        if ($request->query('from')) {
            $q->whereDate('vaccination_date', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $q->whereDate('vaccination_date', '<=', $request->query('to'));
        }
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function followUp(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $q = FollowUp::with(['child', 'posyandu'])->whereIn('posyandu_id', $ids);
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function statistik(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $stats = [
            'total_anak' => Child::whereIn('posyandu_id', $ids)->count(),
            'total_pemeriksaan' => Examination::whereIn('posyandu_id', $ids)->where('status', 'active')->count(),
            'total_imunisasi' => Immunization::whereHas('child', fn ($q) => $q->whereIn('posyandu_id', $ids))->count(),
            'total_followup_pending' => FollowUp::whereIn('posyandu_id', $ids)->where('status', 'pending')->count(),
            'per_posyandu' => Posyandu::whereIn('id', $ids)->withCount(['children', 'examinations'])->get(),
        ];
        if ($request->query('export') === 'pdf') {
            return $this->exportPdf(collect([$stats]), 'statistik-posyandu', 'reports.statistik');
        }

        return response()->json(['success' => true, 'data' => $stats]);
    }

    private function exportCsv($collection, $filename)
    {
        $headers = ['Content-Type' => 'text/csv', 'Content-Disposition' => "attachment; filename=\"$filename.csv\""];
        $callback = function () use ($collection) {
            $handle = fopen('php://output', 'w');
            if ($collection->isEmpty()) {
                fputcsv($handle, ['No data']);
            } else {
                $first = $collection->first();
                $row = is_array($first) ? array_keys($first) : array_keys($first->toArray());
                fputcsv($handle, $row);
                foreach ($collection as $item) {
                    $arr = is_array($item) ? $item : $item->toArray();
                    // flatten simple
                    $flat = [];
                    foreach ($arr as $v) {
                        $flat[] = is_array($v) || is_object($v) ? json_encode($v) : $v;
                    }
                    fputcsv($handle, $flat);
                }
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportExcel($collection, $filename)
    {
        return Excel::download(new GenericExport($collection), $filename.'.xlsx');
    }

    private function exportPdf($collection, $filename, $view)
    {
        // simple PDF without view file, fallback to generic
        $pdf = Pdf::loadView('reports.generic', ['data' => $collection, 'title' => $filename]);

        return $pdf->download($filename.'.pdf');
    }
}
