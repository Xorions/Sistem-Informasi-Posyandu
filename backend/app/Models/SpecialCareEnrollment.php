<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpecialCareEnrollment extends Model
{
    use HasFactory;

    protected $table = 'special_care_enrollment';

    protected $fillable = [
        'child_id',
        'posyandu_id',
        'track',
        'trigger_indicators',
        'status',
        'perlu_rujukan',
        'alasan_masuk',
        'entry_examination_id',
        'entry_date',
        'exit_date',
        'alasan_keluar',
        'exit_examination_id',
        'confirmed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'trigger_indicators' => 'array',
            'perlu_rujukan' => 'boolean',
            'entry_date' => 'date',
            'exit_date' => 'date',
        ];
    }

    public function child()
    {
        return $this->belongsTo(Child::class)->withTrashed();
    }

    public function posyandu()
    {
        return $this->belongsTo(Posyandu::class);
    }

    public function entryExamination()
    {
        return $this->belongsTo(Examination::class, 'entry_examination_id');
    }

    public function exitExamination()
    {
        return $this->belongsTo(Examination::class, 'exit_examination_id');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'record_id')
            ->where('module', 'special_care_enrollment')
            ->orderBy('created_at', 'asc');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isCandidate(): bool
    {
        return $this->status === 'candidate';
    }

    public function evaluateExit(): array
    {
        return app(\App\Services\SpecialCareExitEvaluationService::class)->evaluate($this);
    }

    public function getDaysInProgramAttribute(): ?int
    {
        if (! $this->entry_date) {
            return null;
        }

        $end = $this->exit_date ? Carbon::parse($this->exit_date) : Carbon::now();

        return (int) Carbon::parse($this->entry_date)->diffInDays($end);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeCandidate(Builder $query): Builder
    {
        return $query->where('status', 'candidate');
    }

    public function scopePerluRujukan(Builder $query): Builder
    {
        return $query->where('perlu_rujukan', true);
    }

    /**
     * Batasi enrollment sesuai cakupan pengguna (RBAC 3 layer).
     *
     * ADMIN melihat seluruh posyandu.
     * KADER hanya posyandu binaannya.
     * ORANG_TUA hanya anak miliknya.
     */
    public function scopeForUser(Builder $query, User $user, ?int $posyanduId = null): Builder
    {
        if ($user->isOrangTua()) {
            $query->whereHas(
                'child',
                fn ($q) => $q->whereHas('parents', fn ($p) => $p->where('parents.id', $user->parent_id))
            );
        } elseif (! $user->isAdmin()) {
            $query->whereIn('posyandu_id', $user->posyanduIds());
        }

        if ($posyanduId) {
            $query->where('posyandu_id', $posyanduId);
        }

        return $query;
    }
}
