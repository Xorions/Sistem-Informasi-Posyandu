<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

abstract class Controller
{
    // Menyediakan $this->authorize() dan policy discovery yang dipakai
    // seluruh controller modul anak, pemeriksaan, edukasi, KIA, dan kader.
    use AuthorizesRequests, ValidatesRequests;
}