import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from "@/shared/lib/api"

export type User = {
  id: number
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN_POSYANDU' | 'KADER' | 'ORANG_TUA'
  phone?: string
  posyandus?: { id: number; nama_posyandu: string; kode_posyandu: string }[]
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('posyandu_user')
    try { return raw ? JSON.parse(raw) : null } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const token = localStorage.getItem('posyandu_token')
    if (!token) { setLoading(false); return }
    try {
      const res = await api.get('/user')
      const u = res.data.data as User
      setUser(u)
      localStorage.setItem('posyandu_user', JSON.stringify(u))
    } catch {
      localStorage.removeItem('posyandu_token')
      localStorage.removeItem('posyandu_user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/login', { email, password })
    const token = res.data.data.token as string
    const u = res.data.data.user as User
    localStorage.setItem('posyandu_token', token)
    localStorage.setItem('posyandu_user', JSON.stringify(u))
    setUser(u)
    // fetch full user to get posyandus
    await refresh()
  }

  const logout = async () => {
    try { await api.post('/logout') } catch {}
    localStorage.removeItem('posyandu_token')
    localStorage.removeItem('posyandu_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
