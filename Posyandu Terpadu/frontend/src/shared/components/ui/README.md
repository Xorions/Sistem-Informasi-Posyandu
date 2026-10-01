# UI Components

- `card.tsx` - `Card`, `CardHeader`, `CardContent`
- `badge.tsx` - `Badge` (berwarna dari `statusColor`) dan `StatusBadge` (peta warna status)
- `modal.tsx` - `Modal` dan `ConfirmDeleteModal` (title/description/onConfirm/onClose/loading)
- `toast.tsx` - `ToastProvider` dan `useToast` (success/error/info, dismiss otomatis 3 detik)
- `field.tsx` - `Field`, `Input`, `Select`, `Textarea`, `Button`, `Spinner`, `EmptyState`, `ErrorState`

## Catatan

- `StatusBadge` memakai kunci yang sama dengan nilai enum kolom `status` di backend
  (`active`, `pending`, `scheduled`, `sudah`, `published`, `perlu_perhatian`, dan sebagainya),
  bukan label UI. Halaman cukup mengirim nilai mentah dari API.
- `Button` memakai `type="button"` sebagai default supaya tidaksubmit tak sengaja
  ketika berada di dalam form.
- Halaman baru sebaiknya memakai komponen dari sini, bukan menulis ulang
  `className` input secara manual, agar fokus ring dan state disabled konsisten.