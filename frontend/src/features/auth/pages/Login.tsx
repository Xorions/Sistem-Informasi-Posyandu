import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/shared/components/ui/toast'
import { Button, Field, Input } from '@/shared/components/ui/field'
import { apiErrorMessage } from '@/shared/lib/api'
import { CONFIG, POSYANDU_NAMES } from '@/shared/lib/config'
import { ROUTES } from '@/app/routes'

export default function Login() {
  const { login, user, loading: authLoading } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Periksa pesan sesi kedaluwarsa dari redirect 401
  useEffect(() => {
    const expiredMsg = sessionStorage.getItem('session_expired_message')
    if (expiredMsg) {
      sessionStorage.removeItem('session_expired_message')
      toast.show(expiredMsg, 'error')
    }
  }, [toast])

  // Sudah punya sesi valid? Langsung ke rute tujuan semula atau dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      const redirect = sessionStorage.getItem('redirect_after_login') || ROUTES.dashboard
      sessionStorage.removeItem('redirect_after_login')
      nav(redirect, { replace: true })
    }
  }, [authLoading, user, nav])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      toast.show('Login berhasil')
      const redirect = sessionStorage.getItem('redirect_after_login') || ROUTES.dashboard
      sessionStorage.removeItem('redirect_after_login')
      nav(redirect, { replace: true })
    } catch (err) {
      toast.show(apiErrorMessage(err, 'Login gagal. Periksa email dan password.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">
              P
            </div>
            <div>
              <p className="font-bold text-slate-900">{CONFIG.APP_NAME}</p>
              <p className="text-xs text-slate-500">{CONFIG.APP_TAGLINE}</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Masuk ke akun Anda</h1>
          <p className="text-sm text-slate-500 mt-2">Silakan masuk menggunakan kredensial akun Anda.</p>

          <form onSubmit={handle} className="mt-8 space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.test"
                autoComplete="username"
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </Field>

            <Button type="submit" loading={loading} className="w-full py-3">
              Masuk
            </Button>
          </form>

          <p className="text-sm text-center mt-6 text-slate-500">
            <Link to={ROUTES.edukasiPublic} className="text-teal-600 hover:underline">
              Lihat Edukasi Publik →
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-600 to-emerald-600 p-10 text-white flex-col justify-between">
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Pemantauan Pertumbuhan
            <br />
            Anak Terintegrasi
          </h2>
          <p className="mt-4 text-teal-50 max-w-md">
            DATA → PEMERIKSAAN → ANALISIS → EDUKASI → TINDAK LANJUT. Kelola empat posyandu dalam
            satu sistem yang aman dan terisolasi per posyandu.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">{POSYANDU_NAMES.length}</p>
              <p className="text-xs text-teal-100">Posyandu</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-teal-100">Role RBAC</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
              <p className="text-2xl font-bold">LiLA</p>
              <p className="text-xs text-teal-100">Lingkar Lengan</p>
            </div>
          </div>

          <ul className="mt-8 space-y-1.5 text-sm text-teal-50">
            {POSYANDU_NAMES.map((name) => (
              <li key={name}>• {name}</li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-teal-100">
          © 2026 {CONFIG.APP_NAME} • Kementerian Kesehatan RI (sumber edukasi)
        </p>
      </div>
    </div>
  )
}