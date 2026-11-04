<?php

namespace App\Providers;

use App\Models\ParentModel;
use App\Policies\ParentPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(ParentModel::class, ParentPolicy::class);
        Gate::policy(\App\Models\SpecialCareEnrollment::class, \App\Policies\SpecialCareEnrollmentPolicy::class);

        // Rate limiter kombinasi email + IP untuk proteksi brute force
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinute(5)->by(strtolower($email).'|'.$request->ip());
        });
    }
}
