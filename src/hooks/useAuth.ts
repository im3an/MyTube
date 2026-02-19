/**
 * Auth hook and context. Username + WebAuthn passkey (no email, no password).
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { startAuthentication } from '@simplewebauthn/browser'
import * as authApi from '@/api/auth'
import type { PublicUser } from '@/api/auth'

interface AuthContextValue {
  user: PublicUser | null
  isLoading: boolean
  register: (username: string) => Promise<void>
  login: (username: string) => Promise<void>
  logout: () => Promise<void>
  refetch: () => Promise<void>
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const { user: u } = await authApi.getMe()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const register = useCallback(async (username: string) => {
    const optionsJSON = await authApi.registerOptions(username) as any
    const attestation = await startRegistration({ optionsJSON })
    const { user: u } = await authApi.registerVerify(username, attestation)
    setUser(u ?? null)
  }, [])

  const login = useCallback(async (username: string) => {
    const optionsJSON = await authApi.loginOptions(username) as any
    const assertion = await startAuthentication({ optionsJSON })
    const { user: u } = await authApi.loginVerify(username, assertion)
    setUser(u ?? null)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    localStorage.removeItem('mytube-user-data')
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (updates: { displayName?: string; avatarUrl?: string }) => {
    const u = await authApi.updateProfile(updates)
    setUser(u)
  }, [])

  const value: AuthContextValue = {
    user,
    isLoading,
    register,
    login,
    logout,
    refetch,
    updateProfile,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}
