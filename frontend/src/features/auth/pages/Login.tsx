import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/shared/components/ui/toast'
import { Button, Field, Input } from '@/shared/components/ui/field'
import { apiErrorMessage } from '@/shared/lib/api'
import { CONFIG, DEMO_ACCOUNTS, DEMO_PASSWORD, POSYANDU_NAMES } from '@/shared/lib/config'
import { ROUTES } from '@/app/routes'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/shared/types'

export default function Login() {
  const { login, user, loading: authLoading } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Sudah punya sesi valid? Langsung ke dashboard.
  useEffect(() => {
    if (!authLoading && user) nav(ROUTES.dashboard, { replace: true })
  }, [authLoading, user, nav])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      toast.show('Login berhasil')
      nav(ROUTES.dashboard, { replace: true })
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
          <p className="text-sm text-slate-500 mt-2">Pilih salah satu akun demo untuk mencoba sistem.</p>

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

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-800">Akun Demo</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Password seluruh akun demo: <span className="font-mono">{DEMO_PASSWORD}</span>
            </p>

            <div className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email)
                    setPassword(DEMO_PASSWORD)
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-amber-200 bg-white hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-900">{ROLE_LABEL[acc.role]}</span>
                    <span className="text-[10px] font-mono text-slate-500 truncate">{acc.email}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">{ROLE_DESCRIPTION[acc.role]}</p>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-amber-600 mt-3">
              Password development, jangan gunakan di production.
            </p>
          </div>

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
              <p className="text-2xl font-bold">{DEMO_ACCOUNTS.length}</p>
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