import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/shared/components/ui/toast'
import Layout from '@/shared/components/layout/Layout'
import Login from '@/features/auth/pages/Login'
import Dashboard from '@/features/dashboard/pages/Dashboard'
import ChildrenList from '@/features/children/pages/List'
import ChildForm from '@/features/children/pages/Form'
import ChildDetail from '@/features/children/pages/Detail'
import Parents from '@/features/parents/pages/Parents'
import PosyanduPage from '@/features/posyandu/pages/Posyandu'
import Examinations from '@/features/examinations/pages/Examinations'
import Pertumbuhan from '@/features/pertumbuhan/pages/Pertumbuhan'
import Analisis from '@/features/analisis/pages/Analisis'
import Edukasi from '@/features/edukasi/pages/Edukasi'
import EdukasiPublic, { EdukasiPublicDetail } from '@/features/edukasi/pages/EdukasiPublic'
import Immunizations from '@/features/immunizations/pages/Immunizations'
import FollowUps from '@/features/follow-ups/pages/FollowUps'
import Schedules from '@/features/schedules/pages/Schedules'
import Reports from '@/features/reports/pages/Reports'
import Users from '@/features/users/pages/Users'
import AuditLogs from '@/features/audit-logs/pages/AuditLogs'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleGuard({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) return <div className="p-10 text-center">Forbidden: Anda tidak memiliki akses.</div>
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/edukasi-public" element={<EdukasiPublic />} />
      <Route path="/edukasi/:slug" element={<EdukasiPublicDetail />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="children" element={<RoleGuard allow={['SUPER_ADMIN','ADMIN_POSYANDU','KADER']}><ChildrenList /></RoleGuard>} />
        <Route path="children/create" element={<RoleGuard allow={['SUPER_ADMIN','ADMIN_POSYANDU','KADER']}><ChildForm mode="create" /></RoleGuard>} />
        <Route path="children/:id" element={<ChildDetail />} />
        <Route path="children/:id/edit" element={<RoleGuard allow={['SUPER_ADMIN','ADMIN_POSYANDU','KADER']}><ChildForm mode="edit" /></RoleGuard>} />
        <Route path="parents" element={<Parents />} />
        <Route path="posyandu" element={<PosyanduPage />} />
        <Route path="examinations" element={<Examinations />} />
        <Route path="pertumbuhan" element={<Pertumbuhan />} />
        <Route path="analisis" element={<Analisis />} />
        <Route path="edukasi" element={<Edukasi />} />
        <Route path="immunizations" element={<Immunizations />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<RoleGuard allow={['SUPER_ADMIN','ADMIN_POSYANDU']}><Users /></RoleGuard>} />
        <Route path="audit-logs" element={<RoleGuard allow={['SUPER_ADMIN','ADMIN_POSYANDU']}><AuditLogs /></RoleGuard>} />
      </Route>
      <Route path="*" element={<div className="p-10 text-center">404 - Halaman tidak ditemukan. <a href="/" className="text-teal-600">Kembali ke Dashboard</a></div>} />
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
