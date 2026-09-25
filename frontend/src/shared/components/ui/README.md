# UI Components

- `card.tsx` – Card, CardHeader, CardContent (rounded-2xl, border, shadow)
- `badge.tsx` – Badge (statusColor), StatusBadge
- `modal.tsx` – Modal + ConfirmDeleteModal (title/description/onConfirm/onCancel/loading)
- `toast.tsx` – ToastProvider + useToast (success/error/info, auto-dismiss 3s)

Semua pakai Tailwind, accessible, tanpa dependency heavy. Re-export legacy ada di `src/components/ui/*`.
