import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { apiAuth } from '@/shared/lib/api'
import { CONFIG } from '@/shared/lib/config'
import { apiErrorMessage } from '@/shared/lib/api'
import type { Role, User } from '@/shared/types'

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  /** Panel Shortcut role; dipakai Layout, App, dan halaman. */
  role: Role | null
  isAdmin: boolean
  isKader: boolean
  isOrangTua: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function readCachedUser(): User | null {
  const raw = localStorage.getItem(CONFIG.USER_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readCachedUser)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem(CONFIG.TOKEN_KEY)
    localStorage.removeItem(CONFIG.USER_KEY)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(CONFIG.TOKEN_KEY)) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const u = (await apiAuth.me()) as User

      setUser(u)
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(u))
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = async (email: string, password: string) => {
    const res = await apiAuth.login(email, password)

    localStorage.setItem(CONFIG.TOKEN_KEY, res.token)
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(res.user))

    setUser(res.user as User)

    // Muat ulang agar posyandus, parent, dan kader ikut terisi.
    await refresh()
  }

  const logout = async () => {
    try {
      await apiAuth.logout()
    } catch {
      // Token sudah tidak berlaku di server juga tidak masalah.
    }

    clearSession()
  }

  const role = user?.role ?? null

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refresh,
        role,
        isAdmin: role === 'ADMIN',
        isKader: role === 'KADER',
        isOrangTua: role === 'ORANG_TUA',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')

  return ctx
}

export { apiErrorMessage }
export type { User }