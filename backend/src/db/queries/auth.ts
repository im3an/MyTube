/**
 * Auth-related DB queries: users, webauthn credentials.
 */

import { query } from '../client.js'

export interface User {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: Date
  updated_at: Date
}

export interface WebAuthnCredential {
  id: string
  user_id: string
  credential_id: string
  public_key: Buffer
  counter: number
  device_type: string | null
  backed_up: boolean
  transports: string | null
}

export async function createUser(username: string): Promise<User | null> {
  const res = await query<User>(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username, display_name, avatar_url, created_at, updated_at`,
    [username.trim().toLowerCase()]
  )
  return res.rows[0] ?? null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const res = await query<User>(
    'SELECT id, username, display_name, avatar_url, created_at, updated_at FROM users WHERE username = $1',
    [username.trim().toLowerCase()]
  )
  return res.rows[0] ?? null
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await query<User>(
    'SELECT id, username, display_name, avatar_url, created_at, updated_at FROM users WHERE id = $1',
    [id]
  )
  return res.rows[0] ?? null
}

export async function getCredentialsByUserId(userId: string): Promise<WebAuthnCredential[]> {
  const res = await query<WebAuthnCredential>(
    'SELECT id, user_id, credential_id, public_key, counter, device_type, backed_up, transports FROM webauthn_credentials WHERE user_id = $1',
    [userId]
  )
  return res.rows
}

export async function getCredentialById(credentialId: string): Promise<(WebAuthnCredential & { user_id: string }) | null> {
  const res = await query<WebAuthnCredential & { user_id: string }>(
    'SELECT id, user_id, credential_id, public_key, counter, device_type, backed_up, transports FROM webauthn_credentials WHERE credential_id = $1',
    [credentialId]
  )
  return res.rows[0] ?? null
}

export async function saveCredential(
  userId: string,
  credentialId: string,
  publicKey: Buffer,
  counter: number,
  deviceType?: string,
  backedUp?: boolean,
  transports?: string[]
): Promise<void> {
  await query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, credentialId, publicKey, counter, deviceType ?? null, backedUp ?? false, transports ? transports.join(',') : null]
  )
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  await query(
    'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
    [counter, credentialId]
  )
}

export async function updateUser(userId: string, updates: { display_name?: string; avatar_url?: string }): Promise<void> {
  const parts: string[] = []
  const values: unknown[] = []
  let i = 1
  if (updates.display_name !== undefined) {
    parts.push(`display_name = $${i++}`)
    values.push(updates.display_name)
  }
  if (updates.avatar_url !== undefined) {
    parts.push(`avatar_url = $${i++}`)
    values.push(updates.avatar_url)
  }
  if (parts.length === 0) return
  parts.push(`updated_at = NOW()`)
  values.push(userId)
  await query(
    `UPDATE users SET ${parts.join(', ')} WHERE id = $${i}`,
    values
  )
}
