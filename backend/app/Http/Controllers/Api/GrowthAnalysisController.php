<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\Examination;
use App\Services\GrowthAnalysisService;
use App\Services\NutritionRecommendationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class GrowthAnalysisController extends Controller
{
    public function show(Request $request, Child $child, GrowthAnalysisService $service, NutritionRecommendationService $recService)
    {
        Gate::authorize('view', $child);
        $analysis = $service->analyze($child);
        $ageMonths = $analysis['age_months'] ?? $child->umur_bulan;
        $recommendations = $recService->recommend($analysis, $ageMonths);

        return response()->json(['success' => true, 'data' => ['analysis' => $analysis, 'recommendations' => $recommendations]]);
    }

    public function history(Request $request, Child $child, GrowthAnalysisService $service)
    {
        Gate::authorize('view', $child);
        $history = $service->analyzeHistory($child);

        return response()->json(['success' => true, 'data' => $history]);
    }

    public function forExamination(Request $request, Child $child, $examinationId, GrowthAnalysisService $service, NutritionRecommendationService $recService)
    {
        Gate::authorize('view', $child);
        $examination = Examination::where('id', $examinationId)->where('child_id', $child->id)->with('growthRecord')->firstOrFail();
        $analysis = $service->analyze($child, $examination);
        $ageMonths = $analysis['age_months'] ?? 0;
        $recs = $recService->recommend($analysis, $ageMonths);

        return response()->json(['success' => true, 'data' => ['analysis' => $analysis, 'recommendations' => $recs]]);
    }
}
