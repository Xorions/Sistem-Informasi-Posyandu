<?php

namespace App\Http\Controllers\Api;

use App\Exports\GenericExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\IbuHamilResource;
use App\Models\Child;
use App\Models\Examination;
use App\Models\FollowUp;
use App\Models\IbuHamil;
use App\Models\Immunization;
use App\Models\Kader;
use App\Models\Posyandu;
use App\Support\CsvSanitizer;
use App\Support\Mask;
use App\Support\SqlHelper;
use Dompdf\Dompdf;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('role:ADMIN,KADER'),
        ];
    }

    private function getPosyanduIds(Request $request): array
    {
        $user = $request->user();
        $filter = $request->query('posyandu_id');

        if ($filter !== null && $filter !== '') {
            $filterId = (int) $filter;
            if (! $user->canAccessPosyandu($filterId)) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Forbidden: tidak memiliki akses ke posyandu tersebut',
                ], 403));
            }

            return [$filterId];
        }

        if ($user->isAdmin()) {
            return Posyandu::pluck('id')->toArray();
        }

        $ids = $user->posyanduIds();

        return empty($ids) ? [-1] : $ids;
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
            $escaped = SqlHelper::escapeLike($search);
            $q->where('nama_lengkap', 'ilike', "%{$escaped}%");
        }
        // usia filter
        if ($request->query('usia_min') || $request->query('usia_max')) {
            // usia in months; compute tanggal_lahir range
            // simplified: filter by tanggal_lahir
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $isAdmin = (bool) $request->user()?->isAdmin();
        if ($request->query('export') === 'csv') {
            return $this->exportCsv($this->formatChildrenForReport($q->get(), $isAdmin), 'laporan-anak');
        }
        if ($request->query('export') === 'excel') {
            return $this->exportExcel($this->formatChildrenForReport($q->get(), $isAdmin), 'laporan-anak');
        }
        if ($request->query('export') === 'pdf') {
            return $this->exportPdf($this->formatChildrenForReport($q->get(), $isAdmin), 'laporan-anak', 'reports.anak');
        }
        $data = $q->paginate($perPage);

        if (! $isAdmin) {
            $data->getCollection()->transform(function ($child) {
                $child->nik = Mask::nik($child->nik);
                $child->nomor_kk = Mask::kk($child->nomor_kk);

                return $child;
            });
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    private function formatChildrenForReport($collection, bool $isAdmin)
    {
        return $collection->map(fn ($c) => [
            'nama_lengkap' => $c->nama_lengkap,
            'nik' => $isAdmin ? $c->nik : Mask::nik($c->nik),
            'nomor_kk' => $isAdmin ? $c->nomor_kk : Mask::kk($c->nomor_kk),
            'tempat_lahir' => $c->tempat_lahir,
            'tanggal_lahir' => $c->tanggal_lahir?->format('Y-m-d'),
            'jenis_kelamin' => $c->jenis_kelamin,
            'posyandu' => $c->posyandu?->nama_posyandu,
            'alamat' => $c->alamat,
            'status' => $c->status,
        ]);
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
        $export = $request->query('export');
        if ($export) {
            $formatted = $q->get()->map(fn ($e) => [
                'tanggal' => $e->examination_date?->format('Y-m-d'),
                'anak' => $e->child?->nama_lengkap,
                'posyandu' => $e->posyandu?->nama_posyandu,
                'bb' => $e->growthRecord?->weight,
                'tb' => $e->growthRecord?->height,
                'lk' => $e->growthRecord?->head_circumference,
                'lila' => $e->growthRecord?->arm_circumference,
            ]);
            if ($export === 'csv') {
                return $this->exportCsv($formatted, 'laporan-pemeriksaan');
            }
            if ($export === 'excel') {
                return $this->exportExcel($formatted, 'laporan-pemeriksaan');
            }
            if ($export === 'pdf') {
                return $this->exportPdf($formatted, 'laporan-pemeriksaan', 'reports.pemeriksaan');
            }
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
        if ($request->query('jenis')) {
            $q->where('jenis', $request->query('jenis'));
        }
        $export = $request->query('export');
        if ($export) {
            $formatted = $q->get()->map(fn ($i) => [
                'tanggal' => $i->vaccination_date?->format('Y-m-d'),
                'anak' => $i->child?->nama_lengkap,
                'jenis' => $i->jenis,
                'nama_vaksin_vitamin' => $i->vaccine_name,
                'dosis' => $i->dose,
                'status' => $i->status,
                'catatan' => $i->notes,
            ]);
            if ($export === 'csv') {
                return $this->exportCsv($formatted, 'laporan-imunisasi');
            }
            if ($export === 'excel') {
                return $this->exportExcel($formatted, 'laporan-imunisasi');
            }
            if ($export === 'pdf') {
                return $this->exportPdf($formatted, 'laporan-imunisasi', 'reports.imunisasi');
            }
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function followUp(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $q = FollowUp::with(['child', 'posyandu'])->whereIn('posyandu_id', $ids);
        if ($request->query('from')) {
            $q->whereDate('follow_up_date', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $q->whereDate('follow_up_date', '<=', $request->query('to'));
        }
        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }
        $export = $request->query('export');
        if ($export) {
            $formatted = $q->get()->map(fn ($f) => [
                'tanggal' => $f->follow_up_date?->format('Y-m-d'),
                'anak' => $f->child?->nama_lengkap,
                'posyandu' => $f->posyandu?->nama_posyandu,
                'tipe' => $f->type,
                'status' => $f->status,
                'catatan' => $f->notes,
            ]);
            if ($export === 'csv') {
                return $this->exportCsv($formatted, 'laporan-tindak-lanjut');
            }
            if ($export === 'excel') {
                return $this->exportExcel($formatted, 'laporan-tindak-lanjut');
            }
            if ($export === 'pdf') {
                return $this->exportPdf($formatted, 'laporan-tindak-lanjut', 'reports.followup');
            }
        }
        $perPage = min((int) $request->query('per_page', 25), 100);
        $data = $q->paginate($perPage);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /** Laporan Kesehatan Ibu dan Anak: daftar ibu hamil beserta kondisi terakhir. */
    public function bumil(Request $request)
    {
        $ids = $this->getPosyanduIds($request);

        $q = IbuHamil::with(['parent', 'posyandu', 'pemeriksaanBumils'])
            ->whereIn('posyandu_id', $ids);

        if ($request->query('status')) {
            $q->where('status', $request->query('status'));
        }

        if ($search = $request->query('search')) {
            $escaped = SqlHelper::escapeLike($search);
            $q->whereHas('parent', fn ($p) => $p->where('nama_lengkap', 'ilike', "%{$escaped}%"));
        }

        $rows = $q->orderBy('tanggal_perkiraan_lahir')->get();

        if ($request->query('export') === 'csv') {
            return $this->exportCsv($rows->map(fn ($i) => [
                'nama_ibu' => $i->parent?->nama_lengkap,
                'posyandu' => $i->posyandu?->nama_posyandu,
                'usia_kehamilan' => $i->usia_kehamilan,
                'trimester' => $i->trimester,
                'perkiraan_lahir' => $i->tanggal_perkiraan_lahir?->format('Y-m-d'),
                'tekanan_darah' => $i->pemeriksaanTerakhir()?->tekanan_darah,
                'berat_badan' => $i->pemeriksaanTerakhir()?->berat_badan,
                'status' => $i->pemeriksaanTerakhir()?->status,
            ]), 'laporan-ibu-hamil');
        }

        if ($request->query('export') === 'excel') {
            return $this->exportExcel($rows->map(fn ($i) => [
                'nama_ibu' => $i->parent?->nama_lengkap,
                'posyandu' => $i->posyandu?->nama_posyandu,
                'usia_kehamilan' => $i->usia_kehamilan,
                'trimester' => $i->trimester,
                'perkiraan_lahir' => $i->tanggal_perkiraan_lahir?->format('Y-m-d'),
                'tekanan_darah' => $i->pemeriksaanTerakhir()?->tekanan_darah,
                'berat_badan' => $i->pemeriksaanTerakhir()?->berat_badan,
                'status' => $i->pemeriksaanTerakhir()?->status,
            ]), 'laporan-ibu-hamil');
        }

        if ($request->query('export') === 'pdf') {
            return $this->exportPdf($rows->map(fn ($i) => [
                'nama_ibu' => $i->parent?->nama_lengkap,
                'posyandu' => $i->posyandu?->nama_posyandu,
                'usia_kehamilan' => $i->usia_kehamilan,
                'trimester' => $i->trimester,
                'perkiraan_lahir' => $i->tanggal_perkiraan_lahir?->format('Y-m-d'),
                'tekanan_darah' => $i->pemeriksaanTerakhir()?->tekanan_darah,
                'berat_badan' => $i->pemeriksaanTerakhir()?->berat_badan,
                'status' => $i->pemeriksaanTerakhir()?->status,
            ]), 'laporan-ibu-hamil', 'reports.bumil');
        }

        return response()->json([
            'success' => true,
            'data' => IbuHamilResource::collection($rows),
            'meta' => ['total' => $rows->count()],
        ]);
    }

    public function statistik(Request $request)
    {
        $ids = $this->getPosyanduIds($request);
        $stats = [
            'total_anak' => Child::whereIn('posyandu_id', $ids)->count(),
            'total_pemeriksaan' => Examination::whereIn('posyandu_id', $ids)->where('status', 'active')->count(),
            'total_imunisasi' => Immunization::whereHas('child', fn ($q) => $q->whereIn('posyandu_id', $ids))->count(),
            'total_vitamin' => Immunization::where('jenis', 'VITAMIN')
                ->whereHas('child', fn ($q) => $q->whereIn('posyandu_id', $ids))
                ->count(),
            'total_ibu_hamil' => IbuHamil::whereIn('posyandu_id', $ids)->where('status', 'active')->count(),
            'total_kader' => Kader::whereIn('posyandu_id', $ids)->where('status', 'active')->count(),
            'total_followup_pending' => FollowUp::whereIn('posyandu_id', $ids)->where('status', 'pending')->count(),
            'per_posyandu' => Posyandu::whereIn('id', $ids)->withCount(['children', 'examinations', 'kaders', 'ibuHamils'])->get(),
        ];
        if ($request->query('export') === 'csv') {
            return $this->exportCsv(collect([[
                'total_anak' => $stats['total_anak'],
                'total_pemeriksaan' => $stats['total_pemeriksaan'],
                'total_imunisasi' => $stats['total_imunisasi'],
                'total_vitamin' => $stats['total_vitamin'],
                'total_ibu_hamil' => $stats['total_ibu_hamil'],
                'total_kader' => $stats['total_kader'],
                'total_followup_pending' => $stats['total_followup_pending'],
            ]]), 'laporan-statistik');
        }
        if ($request->query('export') === 'excel') {
            return $this->exportExcel(collect([[
                'total_anak' => $stats['total_anak'],
                'total_pemeriksaan' => $stats['total_pemeriksaan'],
                'total_imunisasi' => $stats['total_imunisasi'],
                'total_vitamin' => $stats['total_vitamin'],
                'total_ibu_hamil' => $stats['total_ibu_hamil'],
                'total_kader' => $stats['total_kader'],
                'total_followup_pending' => $stats['total_followup_pending'],
            ]]), 'laporan-statistik');
        }
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
                fputcsv($handle, array_map([CsvSanitizer::class, 'sanitizeValue'], $row));
                foreach ($collection as $item) {
                    $arr = is_array($item) ? $item : $item->toArray();
                    // flatten simple and sanitize formula injection
                    $flat = [];
                    foreach ($arr as $v) {
                        $val = is_array($v) || is_object($v) ? json_encode($v) : $v;
                        $flat[] = CsvSanitizer::sanitizeValue($val);
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

    private function exportPdf($collection, $filename, $view = null)
    {
        $viewName = ($view && view()->exists($view)) ? $view : 'reports.generic';
        $html = view($viewName, ['data' => $collection, 'title' => $filename])->render();
        $dompdf = new Dompdf();
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}.pdf\"",
        ]);
    }
}
