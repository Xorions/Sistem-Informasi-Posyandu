import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

const menu = [
  { label: 'Dashboard', to: '/', icon: '◧', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER','ORANG_TUA'] },
]

const dataMenu = [
  { label: 'Anak', to: '/children', icon: '👶', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Orang Tua/Wali', to: '/parents', icon: '👨‍👩‍👧', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Posyandu', to: '/posyandu', icon: '🏥', roles: ['SUPER_ADMIN','ADMIN_POSYANDU'] },
]

const pemeriksaanMenu = [
  { label: 'Pemeriksaan', to: '/examinations', icon: '📋', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Pertumbuhan', to: '/pertumbuhan', icon: '📈', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER','ORANG_TUA'] },
  { label: 'Analisis', to: '/analisis', icon: '🔬', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Imunisasi', to: '/immunizations', icon: '💉', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Tindak Lanjut', to: '/follow-ups', icon: '🔔', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
]

const edukasiMenu = [
  { label: 'Konten Edukasi', to: '/edukasi', icon: '📚', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER','ORANG_TUA'] },
]

const laporanMenu = [
  { label: 'Laporan', to: '/reports', icon: '📊', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
]

const sistemMenu = [
  { label: 'Jadwal', to: '/schedules', icon: '📅', roles: ['SUPER_ADMIN','ADMIN_POSYANDU','KADER'] },
  { label: 'Pengguna', to: '/users', icon: '👥', roles: ['SUPER_ADMIN','ADMIN_POSYANDU'] },
  { label: 'Audit Log', to: '/audit-logs', icon: '📝', roles: ['SUPER_ADMIN','ADMIN_POSYANDU'] },
]

function Section({ title, items, role }: { title: string; items: typeof menu; role: string }) {
  const filtered = items.filter(i => i.roles.includes(role))
  if (filtered.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">{title}</p>
      {filtered.map(it => (
        <NavLink key={it.to} to={it.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
          <span className="w-6 text-center">{it.icon}</span>
          {it.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = user?.role || 'KADER'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-slate-200 flex flex-col transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm">P</div>
            <div>
              <p className="font-bold text-slate-800 leading-none">Posyandu</p>
              <p className="font-bold text-teal-600 leading-none -mt-0.5">Digital</p>
              <p className="text-[11px] text-slate-500 mt-1 tracking-wide">Sistem Informasi Posyandu</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-500">{user?.role}</p>
            {user?.posyandus && user.posyandus.length > 0 && (
              <p className="text-[11px] text-teal-600 mt-1 truncate">{user.posyandus.map((p:any)=>p.nama_posyandu).join(', ')}</p>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <Section title="Umum" items={menu} role={role} />
          <Section title="Data" items={dataMenu} role={role} />
          <Section title="Pemeriksaan" items={pemeriksaanMenu} role={role} />
          <Section title="Edukasi" items={edukasiMenu} role={role} />
          <Section title="Laporan" items={laporanMenu} role={role} />
          <Section title="Sistem" items={sistemMenu} role={role} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-black">
            ⎋ Logout
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-3">© 2026 Posyandu Digital</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center">☰</button>
          <span className="font-bold text-slate-800">Posyandu Digital</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
