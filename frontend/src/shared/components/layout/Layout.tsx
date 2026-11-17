import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { ROUTES } from '@/app/routes'
import { can, type Permission } from '@/shared/lib/rbac'
import { CONFIG } from '@/shared/lib/config'
import { ROLE_LABEL, type Role } from '@/shared/types'

type NavItem = { label: string; to: string; icon: string; permission: Permission }

type NavSection = { title: string; items: NavItem[] }

/**
 * Struktur menu sidebar.
 *
 * Setiap item membawa satu izin, bukan daftar role, sehingga penambahan
 * role cukup dilakukan di shared/lib/rbac.ts.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Umum',
    items: [{ label: 'Dashboard', to: ROUTES.dashboard, icon: '◧', permission: 'view-dashboard' }],
  },
  {
    title: 'Data',
    items: [
      { label: 'Anak', to: ROUTES.children, icon: '👶', permission: 'view-anak' },
      { label: 'Orang Tua/Wali', to: ROUTES.parents, icon: '👨‍👩‍👧', permission: 'view-orang-tua' },
      { label: 'Ibu Hamil', to: ROUTES.ibuHamil, icon: '🤰', permission: 'view-ibu-hamil' },
      { label: 'Posyandu', to: ROUTES.posyandu, icon: '🏥', permission: 'view-posyandu' },
      { label: 'Kader', to: ROUTES.kader, icon: '🧑‍⚕️', permission: 'view-kader' },
    ],
  },
  {
    title: 'Pemeriksaan',
    items: [
      { label: 'Pemeriksaan', to: ROUTES.examinations, icon: '📋', permission: 'view-pemeriksaan' },
      { label: 'Pertumbuhan', to: ROUTES.pertumbuhan, icon: '📈', permission: 'view-pemeriksaan' },
      { label: 'Analisis', to: ROUTES.analisis, icon: '🔬', permission: 'view-pemeriksaan' },
      { label: 'Pendampingan Gizi', to: ROUTES.specialCare, icon: '🥣', permission: 'manage-penanganan-khusus' },
      { label: 'Imunisasi & Vitamin', to: ROUTES.immunizations, icon: '💉', permission: 'view-imunisasi' },
      { label: 'Pemeriksaan Bumil', to: ROUTES.pemeriksaanBumil, icon: '🩺', permission: 'view-ibu-hamil' },
      { label: 'Tindak Lanjut', to: ROUTES.followUps, icon: '🔔', permission: 'view-followup' },
    ],
  },
  {
    title: 'Edukasi',
    items: [{ label: 'Konten Edukasi', to: ROUTES.edukasi, icon: '📚', permission: 'view-edukasi' }],
  },
  {
    title: 'Laporan',
    items: [{ label: 'Laporan', to: ROUTES.reports, icon: '📊', permission: 'view-laporan' }],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Jadwal', to: ROUTES.schedules, icon: '📅', permission: 'view-jadwal' },
      { label: 'Pengguna', to: ROUTES.users, icon: '👥', permission: 'manage-pengguna' },
      { label: 'Audit Log', to: ROUTES.auditLogs, icon: '📝', permission: 'view-audit-log' },
    ],
  },
]

function Section({ title, items, role }: { title: string; items: NavItem[]; role: Role | null }) {
  const visible = items.filter((i) => can(role, i.permission))

  if (visible.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">{title}</p>
      {visible.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === ROUTES.dashboard}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive
                ? 'bg-teal-50 text-teal-700 border border-teal-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <span className="w-6 text-center">{it.icon}</span>
          {it.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout() {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.login)
  }

  const posyanduNames = user?.posyandus?.map((p) => p.nama_posyandu).join(', ')

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 overscroll-none">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* 1. NAVBAR KIRI (Sidebar) */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 w-64 h-full shrink-0 flex flex-col border-r border-slate-200 bg-white z-50 lg:z-20 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/LogoLampungSelatan.png"
              alt="Logo Lampung Selatan"
              className="w-10 h-10 object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 leading-none">Posyandu</p>
              <p className="font-bold text-teal-600 leading-none -mt-0.5">Terpadu</p>
              <p className="text-[11px] text-slate-500 mt-1 tracking-wide truncate">{CONFIG.APP_TAGLINE}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500">{role ? ROLE_LABEL[role] : '-'}</p>
            {user?.kader?.jabatan && (
              <p className="text-[11px] text-slate-500 truncate">{user.kader.jabatan}</p>
            )}
            {posyanduNames && <p className="text-[11px] text-teal-600 mt-1 truncate">{posyanduNames}</p>}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((s) => (
            <Section key={s.title} title={s.title} items={s.items} role={role} />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-black transition"
          >
            ⎋ Logout
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2">© 2026 {CONFIG.APP_NAME}</p>
        </div>
      </aside>

      {/* 2. AREA KONTEN KANAN */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden shrink-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <img src="/LogoLampungSelatan.png" alt="Logo Lampung Selatan" className="w-7 h-7 object-contain shrink-0" />
            <span className="font-bold text-slate-800">{CONFIG.APP_NAME}</span>
          </div>
          <div className="w-9" />
        </header>

        {/* MAIN CONTENT (Hanya area ini yang dapat digulir secara vertikal) */}
        <main className="flex-1 h-full overflow-y-auto overscroll-y-none relative p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}