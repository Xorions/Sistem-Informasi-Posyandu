import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/shared/components/ui/toast'
import { AccessDeniedState } from '@/shared/components/ui/field'
import Layout from '@/shared/components/layout/Layout'
import Login from '@/features/auth/pages/Login'
import Dashboard from '@/features/dashboard/pages/Dashboard'
import ChildrenList from '@/features/children/pages/List'
import ChildForm from '@/features/children/pages/Form'
import ChildDetail from '@/features/children/pages/Detail'
import Parents from '@/features/parents/pages/Parents'
import PosyanduPage from '@/features/posyandu/pages/Posyandu'
import KaderPage from '@/features/kader/pages/Kader'
import Examinations from '@/features/examinations/pages/Examinations'
import Pertumbuhan from '@/features/pertumbuhan/pages/Pertumbuhan'
import Analisis from '@/features/analisis/pages/Analisis'
import Edukasi from '@/features/edukasi/pages/Edukasi'
import EdukasiPublic, { EdukasiPublicDetail } from '@/features/edukasi/pages/EdukasiPublic'
import Immunizations from '@/features/immunizations/pages/Immunizations'
import FollowUps from '@/features/follow-ups/pages/FollowUps'
import Schedules from '@/features/schedules/pages/Schedules'
import IbuHamilPage from '@/features/bumil/pages/IbuHamil'
import BumilDetailPage from '@/features/bumil/pages/BumilDetail'
import PemeriksaanBumilPage from '@/features/bumil/pages/PemeriksaanBumil'
import Reports from '@/features/reports/pages/Reports'
import Users from '@/features/users/pages/Users'
import AuditLogs from '@/features/audit-logs/pages/AuditLogs'
import { ROUTES } from './routes'
import { can, type Permission } from '@/shared/lib/rbac'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>
    )

  if (!user) return <Navigate to={ROUTES.login} replace />

  return <>{children}</>
}

/**
 * Penjaga halaman berbasis izin.
 *
 * Menggantikan daftar role yang ditulis manual per rute, sehingga
 * penambahan role cukup dilakukan di shared/lib/rbac.ts.
 */
function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: React.ReactNode
}) {
  const { role } = useAuth()

  if (!can(role, permission)) {
    return (
      <AccessDeniedState
        title="Akses ditolak"
        message="Role Anda tidak memiliki izin untuk membuka halaman ini."
        action={
          <Link
            to={ROUTES.dashboard}
            className="inline-block px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Kembali ke Dashboard
          </Link>
        }
      />
    )
  }

  return <>{children}</>
}

function NotFound() {
  return (
    <div className="p-10 text-center">
      <p className="font-medium text-slate-800">404 - Halaman tidak ditemukan</p>
      <Link
        to={ROUTES.dashboard}
        className="inline-block mt-4 text-teal-600 hover:text-teal-800 text-sm font-medium"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  )
}

function AppRoutes() {
  const guard = (permission: Permission, element: React.ReactNode) => (
    <RequirePermission permission={permission}>{element}</RequirePermission>
  )

  return (
    <Routes>
      {/* Publik */}
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.edukasiPublic} element={<EdukasiPublic />} />
      <Route path="/edukasi/:slug" element={<EdukasiPublicDetail />} />

      {/* Terlindungi */}
      <Route
        path={ROUTES.dashboard}
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="children" element={guard('view-anak', <ChildrenList />)} />
        <Route
          path="children/create"
          element={guard('manage-anak', <ChildForm mode="create" />)}
        />
        <Route path="children/:id" element={guard('view-anak', <ChildDetail />)} />
        <Route path="children/:id/edit" element={guard('manage-anak', <ChildForm mode="edit" />)} />

        <Route path="parents" element={guard('view-orang-tua', <Parents />)} />
        <Route path="posyandu" element={guard('view-posyandu', <PosyanduPage />)} />
        <Route path="kader" element={guard('view-kader', <KaderPage />)} />

        <Route path="examinations" element={guard('view-pemeriksaan', <Examinations />)} />
        <Route path="pertumbuhan" element={guard('view-pemeriksaan', <Pertumbuhan />)} />
        <Route path="analisis" element={guard('view-pemeriksaan', <Analisis />)} />
        <Route path="immunizations" element={guard('view-imunisasi', <Immunizations />)} />
        <Route path="follow-ups" element={guard('view-followup', <FollowUps />)} />
        <Route path="schedules" element={guard('view-jadwal', <Schedules />)} />

        <Route path="ibu-hamil" element={guard('view-ibu-hamil', <IbuHamilPage />)} />
        <Route path="ibu-hamil/:id" element={guard('view-ibu-hamil', <BumilDetailPage />)} />
        <Route path="pemeriksaan-bumil" element={guard('view-ibu-hamil', <PemeriksaanBumilPage />)} />

        <Route path="edukasi" element={guard('view-edukasi', <Edukasi />)} />
        <Route path="reports" element={guard('view-laporan', <Reports />)} />
        <Route path="users" element={guard('manage-pengguna', <Users />)} />
        <Route path="audit-logs" element={guard('view-audit-log', <AuditLogs />)} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}