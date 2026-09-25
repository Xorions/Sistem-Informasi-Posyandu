<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EducationController;
use App\Http\Controllers\Api\ExaminationController;
use App\Http\Controllers\Api\FollowUpController;
use App\Http\Controllers\Api\GrowthAnalysisController;
use App\Http\Controllers\Api\ImmunizationController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PosyanduController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public edukasi
Route::get('/edukasi', [EducationController::class, 'publicIndex']);
Route::get('/edukasi/categories', [EducationController::class, 'categories']);
Route::get('/edukasi/{slug}', [EducationController::class, 'show']);

// Auth
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

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

    // Schedules
    Route::apiResource('schedules', ScheduleController::class);

    // Reports
    Route::get('/reports/anak', [ReportController::class, 'anak']);
    Route::get('/reports/pemeriksaan', [ReportController::class, 'pemeriksaan']);
    Route::get('/reports/pertumbuhan', [ReportController::class, 'pertumbuhan']);
    Route::get('/reports/imunisasi', [ReportController::class, 'imunisasi']);
    Route::get('/reports/follow-up', [ReportController::class, 'followUp']);
    Route::get('/reports/statistik', [ReportController::class, 'statistik']);

    // Users
    Route::apiResource('users', UserController::class);

    // Audit logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
