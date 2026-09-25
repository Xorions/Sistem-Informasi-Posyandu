import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from "@/features/auth/AuthContext"
import { useToast } from "@/shared/components/ui/toast"

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [email, setEmail] = useState('superadmin@example.test')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.show('Login berhasil')
      nav('/')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa email & password.'
      toast.show(msg, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">P</div>
            <div>
              <p className="font-bold text-slate-900">Posyandu Digital</p>
              <p className="text-xs text-slate-500">Sistem Informasi Posyandu</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Masuk ke akun Anda</h1>
          <p className="text-sm text-slate-500 mt-2">Gunakan akun demo untuk mencoba sistem</p>

          <form onSubmit={handle} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="email@example.test" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative mt-1">
                <input value={password} onChange={e=>setPassword(e.target.value)} type={show?'text':'password'} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10" />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{show?'hide':'show'}</button>
              </div>
            </div>
            <button disabled={loading} className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 flex justify-center items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
              Masuk
            </button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-800">Akun Demo</p>
            <div className="mt-2 space-y-1 text-xs text-amber-700 font-mono">
              <div>superadmin@example.test / password123</div>
              <div>admin@example.test / password123</div>
              <div>kader@example.test / password123</div>
            </div>
            <p className="text-[11px] text-amber-600 mt-2">Password development, jangan gunakan di production.</p>
          </div>

          <p className="text-sm text-center mt-6 text-slate-500"><Link to="/edukasi-public" className="text-teal-600 hover:underline">Lihat Edukasi Publik →</Link></p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-600 to-emerald-600 p-10 text-white flex-col justify-between">
        <div>
          <h2 className="text-3xl font-bold leading-tight">Pemantauan Pertumbuhan<br/>Anak Terintegrasi</h2>
          <p className="mt-4 text-teal-50 max-w-md">DATA → PEMERIKSAAN → ANALISIS → EDUKASI → TINDAK LANJUT. Kelola banyak Posyandu dalam satu sistem yang aman & terisolasi.</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">3</p><p className="text-xs text-teal-100">Posyandu</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">Multi</p><p className="text-xs text-teal-100">Role RBAC</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">LiLA</p><p className="text-xs text-teal-100">Lingkar Lengan</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-teal-100">© 2026 Posyandu Digital • Kementerian Kesehatan RI (sumber edukasi)</p>
      </div>
    </div>
  )
}
