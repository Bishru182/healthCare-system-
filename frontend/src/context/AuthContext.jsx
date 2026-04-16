import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('medico_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [role, setRole] = useState(() => localStorage.getItem('medico_role') || null)
  const [token, setToken] = useState(() => localStorage.getItem('medico_token') || null)

  const login = useCallback((userData, userRole, userToken) => {
    setUser(userData)
    setRole(userRole)
    setToken(userToken)
    localStorage.setItem('medico_user', JSON.stringify(userData))
    localStorage.setItem('medico_role', userRole)
    localStorage.setItem('medico_token', userToken)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setRole(null)
    setToken(null)
    localStorage.removeItem('medico_user')
    localStorage.removeItem('medico_role')
    localStorage.removeItem('medico_token')
  }, [])

  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ user, role, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
