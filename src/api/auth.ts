/**
 * Auth API client. Uses /api/auth/* — proxied to backend in dev when VITE_USE_BACKEND=1.
 */

const API_BASE = '/api/auth'

export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

export async function registerOptions(username: string): Promise<unknown> {
  const res = await authFetch('/register/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Failed to get registration options')
  }
  return res.json()
}

export async function registerVerify(username: string, response: unknown): Promise<{ verified: boolean; user: PublicUser | null }> {
  const res = await authFetch('/register/verify', {
    method: 'POST',
    body: JSON.stringify({ username, response }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Registration failed')
  }
  return res.json()
}

export async function loginOptions(username: string): Promise<unknown> {
  const res = await authFetch('/login/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Failed to get login options')
  }
  return res.json()
}

export async function loginVerify(username: string, response: unknown): Promise<{ verified: boolean; user: PublicUser | null }> {
  const res = await authFetch('/login/verify', {
    method: 'POST',
    body: JSON.stringify({ username, response }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Login failed')
  }
  return res.json()
}

export async function logout(): Promise<void> {
  await authFetch('/logout', { method: 'POST' })
}

export async function getMe(): Promise<{ user: PublicUser | null }> {
  const res = await fetch(`${API_BASE}/me`, { credentials: 'include' })
  if (!res.ok) return { user: null }
  return res.json()
}

export async function updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  const data = await res.json()
  return data.user
}
