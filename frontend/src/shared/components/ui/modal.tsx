import { ReactNode } from 'react'

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[95%] max-w-lg max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDeleteModal({ open, onClose, onConfirm, loading, title = "Hapus Data Anak?", description = "Apakah Anda yakin ingin menghapus data anak ini?" }: { open: boolean; onClose: () => void; onConfirm: () => void; loading?: boolean; title?: string; description?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600 text-xl">⚠</div>
        <h3 className="text-center font-semibold text-lg text-slate-800">{title}</h3>
        <p className="text-center text-sm text-slate-500 mt-2">{description}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}
