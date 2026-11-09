<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EducationController;
use App\Http\Controllers\Api\ExaminationController;
use App\Http\Controllers\Api\FollowUpController;
use App\Http\Controllers\Api\GrowthAnalysisController;
use App\Http\Controllers\Api\IbuHamilController;
use App\Http\Controllers\Api\ImmunizationController;
use App\Http\Controllers\Api\KaderController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PemeriksaanBumilController;
use App\Http\Controllers\Api\PosyanduController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SpecialCareController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// TEMPORARY: Preview inspection route - active in spike environment
// WAJIB DIHAPUS SEBELUM MERGE KE MAIN/PRODUCTION RESMI
if (in_array(config('app.env'), ['preview', 'production', 'local'])) {
    Route::get('/preview/ip-debug', function (\Illuminate\Http\Request $request) {
        return response()->json([
            'environment' => config('app.env'),
            'resolved_client_ip' => $request->ip(),
            'ips' => $request->ips(),
            'x_forwarded_for' => $request->header('x-forwarded-for'),
            'x_real_ip' => $request->header('x-real-ip'),
            'x_vercel_forwarded_for' => $request->header('x-vercel-forwarded-for'),
            'rate_limit_key' => \Illuminate\Support\Str::transliterate(
                \Illuminate\Support\Str::lower('test@example.com').'|'.$request->ip()
            ),
        ]);
    });
}

// Public edukasi
Route::get('/edukasi', [EducationController::class, 'publicIndex']);
Route::get('/edukasi/categories', [EducationController::class, 'categories']);
Route::get('/edukasi/{slug}', [EducationController::class, 'show']);

// Auth (Throttled by email + IP)
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    // also /api/user alias
    Route::get('/me', [AuthController::class, 'user']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Posyandu
    Route::apiResource('posyandu', PosyanduController::class);
    Route::post('/posyandu/{posyandu}/assign-user', [PosyanduController::class, 'assignUser']);

    // Kader / petugas posyandu
    Route::apiResource('kader', KaderController::class);

    // Children
    Route::get('/children/trashed', [ChildController::class, 'trashed']);
    Route::post('/children/{id}/restore', [ChildController::class, 'restore']);
    Route::apiResource('children', ChildController::class);
    Route::post('/children/{child}/parents', [ChildController::class, 'attachParent']);
    Route::delete('/children/{child}/parents/{parentId}', [ChildController::class, 'detachParent']);
    Route::get('/children/{child}/examinations', [ExaminationController::class, 'childHistory']);
    Route::get('/children/{child}/growth-chart', [ExaminationController::class, 'growthChart']);
    Route::get('/children/{child}/analysis', [GrowthAnalysisController::class, 'show']);
    Route::get('/children/{child}/analysis/history', [GrowthAnalysisController::class, 'history']);
    Route::get('/children/{child}/analysis/{examinationId}', [GrowthAnalysisController::class, 'forExamination']);

    // Parents
    Route::apiResource('parents', ParentController::class);

    // Examinations
    Route::apiResource('examinations', ExaminationController::class);
    Route::get('/examinations/child/{child}', [ExaminationController::class, 'childHistory']);

    // Education (authenticated)
    Route::get('/educations', [EducationController::class, 'index']);
    Route::post('/educations', [EducationController::class, 'store']);
    Route::get('/educations/{education}', [EducationController::class, 'show']); // will override? use id
    Route::put('/educations/{education}', [EducationController::class, 'update']);
    Route::delete('/educations/{education}', [EducationController::class, 'destroy']);
    Route::post('/educations/{education}/publish', [EducationController::class, 'publish']);
    Route::post('/educations/{education}/unpublish', [EducationController::class, 'unpublish']);
    Route::get('/education-categories', [EducationController::class, 'categories']);

    // Immunizations
    Route::apiResource('immunizations', ImmunizationController::class);
    Route::get('/children/{child}/immunizations', [ImmunizationController::class, 'childImmunizations']);

    // FollowUps
    Route::apiResource('follow-ups', FollowUpController::class);

    // Kesehatan Ibu dan Anak (KIA)
    Route::get('/ibu-hamil/{ibuHamil}/pemeriksaan', [IbuHamilController::class, 'pemeriksaan']);
    Route::apiResource('ibu-hamil', IbuHamilController::class);
    Route::apiResource('pemeriksaan-bumil', PemeriksaanBumilController::class);

    // Penanganan Khusus (Special Care / PMT Pemulihan)
    Route::get('/special-care/candidates', [SpecialCareController::class, 'candidates']);
    Route::get('/special-care/active', [SpecialCareController::class, 'active']);
    Route::get('/special-care/exit-proposals', [SpecialCareController::class, 'exitProposals']);
    Route::get('/special-care/children/{child}/history', [SpecialCareController::class, 'childHistory']);
    Route::get('/special-care/{enrollment}', [SpecialCareController::class, 'show']);
    Route::get('/special-care/{enrollment}/audit-logs', [SpecialCareController::class, 'auditLogs']);
    Route::post('/special-care/{enrollment}/confirm', [SpecialCareController::class, 'confirm']);
    Route::post('/special-care/{enrollment}/reject', [SpecialCareController::class, 'reject']);
    Route::post('/special-care/{enrollment}/exit', [SpecialCareController::class, 'exit']);

    // Schedules
    Route::apiResource('schedules', ScheduleController::class);

    // Reports (Hanya ADMIN dan KADER)
    Route::middleware('role:ADMIN,KADER')->group(function () {
        Route::get('/reports/anak', [ReportController::class, 'anak']);
        Route::get('/reports/pemeriksaan', [ReportController::class, 'pemeriksaan']);
        Route::get('/reports/pertumbuhan', [ReportController::class, 'pertumbuhan']);
        Route::get('/reports/imunisasi', [ReportController::class, 'imunisasi']);
        Route::get('/reports/follow-up', [ReportController::class, 'followUp']);
        Route::get('/reports/bumil', [ReportController::class, 'bumil']);
        Route::get('/reports/statistik', [ReportController::class, 'statistik']);
    });

    // Users
    Route::apiResource('users', UserController::class);

    // Audit logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
