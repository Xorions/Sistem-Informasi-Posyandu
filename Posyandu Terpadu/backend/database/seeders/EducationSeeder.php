<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Education;
use App\Models\EducationCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class EducationSeeder extends Seeder
{
    public function run(): void
    {
        $cats = ['Gizi Anak', 'ASI', 'MPASI', 'Imunisasi', 'Pertumbuhan Anak', 'Kebersihan', 'Pola Hidup Sehat', 'Kesehatan Ibu', 'Kesehatan Balita'];
        foreach ($cats as $c) {
            EducationCategory::firstOrCreate(['slug' => Str::slug($c)], ['name' => $c, 'description' => 'Kategori '.$c]);
        }
        $admin = User::where('role', Role::ADMIN->value)->first();
        $gizi = EducationCategory::where('slug', 'gizi-anak')->first();
        $asi = EducationCategory::where('slug', 'asi')->first();
        $mpasi = EducationCategory::where('slug', 'mpasi')->first();
        $imun = EducationCategory::where('slug', 'imunisasi')->first();
        $examples = [
            ['category_id' => $gizi->id, 'title' => 'Pentingnya Gizi Seimbang untuk Anak', 'content' => '<h2>Gizi Seimbang</h2><p>Gizi seimbang sangat penting untuk mendukung pertumbuhan anak. Pastikan variasi makanan sesuai usia, meliputi karbohidrat, protein, sayur, buah, dan lemak sehat.</p><ul><li>Karbohidrat sebagai sumber energi</li><li>Protein hewani dan nabati</li><li>Sayur dan buah untuk vitamin</li></ul><p><em>Sumber: Kementerian Kesehatan Republik Indonesia</em></p>', 'source' => 'Kementerian Kesehatan Republik Indonesia', 'status' => 'published'],
            ['category_id' => $asi->id, 'title' => 'Manfaat ASI Eksklusif 6 Bulan', 'content' => '<h2>ASI Eksklusif</h2><p>ASI eksklusif hingga 6 bulan memberikan nutrisi optimal, mendukung daya tahan tubuh, dan mempererat ikatan ibu-anak.</p><p>Konsultasikan dengan tenaga kesehatan jika mengalami kendala menyusui.</p>', 'source' => 'Kementerian Kesehatan Republik Indonesia', 'status' => 'published'],
            ['category_id' => $mpasi->id, 'title' => 'Pengenalan MPASI yang Tepat', 'content' => '<h2>MPASI</h2><p>Mulai usia 6 bulan, kenalkan MPASI bertahap dengan tekstur lembut hingga padat, perhatikan kebersihan dan variasi bahan.</p>', 'source' => 'Kementerian Kesehatan Republik Indonesia', 'status' => 'published'],
            ['category_id' => $imun->id, 'title' => 'Jadwal Imunisasi Dasar Lengkap', 'content' => '<h2>Imunisasi</h2><p>Imunisasi dasar lengkap melindungi anak dari penyakit berbahaya. Pastikan jadwal imunisasi diikuti sesuai anjuran petugas kesehatan.</p>', 'source' => 'Kementerian Kesehatan Republik Indonesia', 'status' => 'published'],
            ['category_id' => $gizi->id, 'title' => 'Cara Memantau Pertumbuhan di Rumah', 'content' => '<h2>Pemantauan Pertumbuhan</h2><p>Lakukan penimbangan rutin setiap bulan, catat di buku KIA, dan diskusikan hasil dengan kader Posyandu.</p>', 'source' => 'Kementerian Kesehatan Republik Indonesia', 'status' => 'draft'],
        ];
        foreach ($examples as $e) {
            $e['slug'] = Str::slug($e['title']).'-'.uniqid();
            $e['author_id'] = $admin->id;
            $e['published_at'] = $e['status'] === 'published' ? now() : null;
            Education::firstOrCreate(['slug' => $e['slug']], $e);
        }
    }
}
