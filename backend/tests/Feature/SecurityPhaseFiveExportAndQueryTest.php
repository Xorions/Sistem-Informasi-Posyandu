<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Exports\GenericExport;
use App\Models\Child;
use App\Models\ParentModel;
use App\Models\Posyandu;
use App\Models\User;
use App\Support\CsvSanitizer;
use App\Support\SqlHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityPhaseFiveExportAndQueryTest extends TestCase
{
    use RefreshDatabase;

    private Posyandu $posyandu;

    private User $admin;

    private User $kader;

    protected function setUp(): void
    {
        parent::setUp();

        $this->posyandu = Posyandu::create([
            'kode_posyandu' => 'PSY005',
            'nama_posyandu' => 'Posyandu Flamboyan',
            'alamat' => 'Jl. Kenanga No. 5',
            'rt' => '01',
            'rw' => '02',
            'kelurahan' => 'Sukamaju',
            'kecamatan' => 'Sukajadi',
            'kota' => 'Bandung',
            'status' => 'active',
        ]);

        $this->admin = User::factory()->create([
            'role' => Role::ADMIN->value,
            'is_active' => true,
        ]);

        $this->kader = User::factory()->create([
            'role' => Role::KADER->value,
            'is_active' => true,
        ]);
        $this->kader->posyandus()->attach($this->posyandu->id);
    }

    public function test_csv_sanitizer_prefixes_dangerous_formula_characters(): void
    {
        $this->assertSame("'=1+1", CsvSanitizer::sanitizeValue('=1+1'));
        $this->assertSame("'+123", CsvSanitizer::sanitizeValue('+123'));
        $this->assertSame("'-2+3", CsvSanitizer::sanitizeValue('-2+3'));
        $this->assertSame("'-cmd|' /C calc'!A0", CsvSanitizer::sanitizeValue("-cmd|' /C calc'!A0"));
        $this->assertSame("'@SUM(A1:A10)", CsvSanitizer::sanitizeValue('@SUM(A1:A10)'));
        $this->assertSame("'\ttab_val", CsvSanitizer::sanitizeValue("\ttab_val"));
        $this->assertSame("'\rcr_val", CsvSanitizer::sanitizeValue("\rcr_val"));
        $this->assertSame("'   =SUM(A1)", CsvSanitizer::sanitizeValue('   =SUM(A1)'));
    }

    public function test_csv_sanitizer_preserves_pure_numeric_types(): void
    {
        $this->assertSame(-5, CsvSanitizer::sanitizeValue(-5));
        $this->assertSame(-12.5, CsvSanitizer::sanitizeValue(-12.5));
        $this->assertSame(0, CsvSanitizer::sanitizeValue(0));
        $this->assertSame(42, CsvSanitizer::sanitizeValue(42));
        $this->assertSame(3.14, CsvSanitizer::sanitizeValue(3.14));
    }

    public function test_csv_sanitizer_leaves_safe_strings_and_structures_intact(): void
    {
        $this->assertSame('Normal String', CsvSanitizer::sanitizeValue('Normal String'));
        $this->assertSame('Jl. Sudirman No. 45', CsvSanitizer::sanitizeValue('Jl. Sudirman No. 45'));
        $this->assertNull(CsvSanitizer::sanitizeValue(null));

        $row = [
            'name' => '=DANGEROUS()',
            'score' => -10,
            'city' => 'Bandung',
        ];
        $sanitizedRow = CsvSanitizer::sanitizeRow($row);

        $this->assertSame("'=DANGEROUS()", $sanitizedRow['name']);
        $this->assertSame(-10, $sanitizedRow['score']);
        $this->assertSame('Bandung', $sanitizedRow['city']);
    }

    public function test_generic_export_sanitizes_collection_and_headings(): void
    {
        $data = collect([
            [
                'col1' => '=1+2',
                'col2' => -99,
                'col3' => 'safe text',
            ],
        ]);

        $export = new GenericExport($data);
        $collection = $export->collection();

        $firstRow = $collection->first();
        $this->assertSame("'=1+2", $firstRow['col1']);
        $this->assertSame(-99, $firstRow['col2']);
        $this->assertSame('safe text', $firstRow['col3']);
    }

    public function test_report_export_csv_escapes_formula_injection_in_data(): void
    {
        $parent = ParentModel::create([
            'nik' => '3201234567890001',
            'nama_lengkap' => 'Budi Santoso',
            'jenis_kelamin' => 'L',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Mawar No. 1',
        ]);

        Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201234567890002',
            'nama_lengkap' => '=cmd|calc',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar No. 1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin)->get('/api/reports/anak?export=csv');
        $response->assertStatus(200);

        $streamedContent = $response->streamedContent();
        $this->assertStringContainsString("'=cmd|calc", $streamedContent);
    }

    public function test_sql_helper_escapes_like_wildcards_and_backslashes(): void
    {
        $this->assertSame('100\\%', SqlHelper::escapeLike('100%'));
        $this->assertSame('test\\_name', SqlHelper::escapeLike('test_name'));
        $this->assertSame('path\\\\dir', SqlHelper::escapeLike('path\\dir'));
        $this->assertSame('a\\\\b\\%c\\_d', SqlHelper::escapeLike('a\\b%c_d'));
    }

    public function test_search_with_percent_wildcard_does_not_match_all_records(): void
    {
        Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201234567890003',
            'nama_lengkap' => 'Anak Biasa',
            'tempat_lahir' => 'Bandung',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Mawar No. 1',
            'status' => 'active',
        ]);

        Child::create([
            'posyandu_id' => $this->posyandu->id,
            'nik' => '3201234567890004',
            'nama_lengkap' => 'Diskon 50% Promo',
            'tempat_lahir' => 'Jakarta',
            'tanggal_lahir' => '2023-01-01',
            'jenis_kelamin' => 'P',
            'alamat' => 'Jl. Mawar No. 2',
            'status' => 'active',
        ]);

        // Search with '%' should only match 'Diskon 50% Promo', not 'Anak Biasa'
        $response = $this->actingAs($this->admin)->getJson('/api/children?search=50%');
        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('Diskon 50% Promo', $data[0]['nama_lengkap']);
    }

    public function test_report_export_filenames_do_not_contain_child_pii(): void
    {
        $responseCsv = $this->actingAs($this->admin)->get('/api/reports/anak?export=csv');
        $responseCsv->assertStatus(200);
        $dispositionCsv = $responseCsv->headers->get('Content-Disposition');
        $this->assertStringContainsString('filename="laporan-anak.csv"', $dispositionCsv);
        $this->assertStringNotContainsString('3201', $dispositionCsv);

        $responseExcel = $this->actingAs($this->admin)->get('/api/reports/pemeriksaan?export=excel');
        $responseExcel->assertStatus(200);
        $dispositionExcel = $responseExcel->headers->get('Content-Disposition');
        $this->assertStringContainsString('laporan-pemeriksaan.xlsx', $dispositionExcel);

        $responsePdf = $this->actingAs($this->admin)->get('/api/reports/statistik?export=pdf');
        $responsePdf->assertStatus(200);
        $dispositionPdf = $responsePdf->headers->get('Content-Disposition');
        $this->assertStringContainsString('statistik-posyandu.pdf', $dispositionPdf);
    }

    public function test_kader_export_unauthorized_posyandu_returns_403_json(): void
    {
        $otherPosyandu = Posyandu::create([
            'nama_posyandu' => 'Posyandu Lain',
            'kode_posyandu' => 'PSY999',
            'alamat' => 'Jl. Lain',
        ]);

        $response = $this->actingAs($this->kader)->get("/api/reports/anak?posyandu_id={$otherPosyandu->id}&export=csv");
        $response->assertStatus(403);
        $this->assertFalse($response->json('success'));
        $this->assertStringContainsString('tidak memiliki akses', $response->json('message'));
    }
}
