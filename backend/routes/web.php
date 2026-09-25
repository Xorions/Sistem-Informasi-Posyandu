<?php

use Illuminate\Support\Facades\Route;

// SPA fallback – serve React build (resources/views/app.blade.php) untuk semua route non-API
// Laravel welcome diganti agar 1 ngrok cukup (frontend + backend di :8000)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
