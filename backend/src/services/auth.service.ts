/**
 * Auth service: WebAuthn registration and login.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server'
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types'
import { config } from '../config.js'
import * as authQueries from '../db/queries/auth.js'
import { BadRequestError } from '../utils/errors.js'

const rpID = config.auth.rpID
const rpName = config.auth.rpName
const origin = config.auth.origin

/** Temporary store for challenges (username -> { challenge, userId?, options }) */
const challengeStore = new Map<string, { challenge: string; userId?: string; expires: number }>()
const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 min

function pruneChallenges() {
  const now = Date.now()
  for (const [k, v] of challengeStore.entries()) {
    if (v.expires < now) challengeStore.delete(k)
  }
}

/** Generate registration options. Creates user if new. */
export async function getRegistrationOptions(username: string): Promise<{
  options: ReturnType<typeof generateRegistrationOptions> extends Promise<infer T> ? T : never
  userId: string
}> {
  const u = username.trim().toLowerCase()
  if (!u || u.length < 2) throw new BadRequestError('Username must be at least 2 characters')

  let user = await authQueries.getUserByUsername(u)
  if (!user) {
    user = await authQueries.createUser(u)
    if (!user) throw new BadRequestError('Username already taken')
  }

  const credentials = await authQueries.getCredentialsByUserId(user.id)
  const excludeCredentials = credentials.map((c) => ({
    id: c.credential_id,
    transports: c.transports ? (c.transports.split(',') as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[]) : undefined,
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpID === 'localhost' ? 'localhost' : rpID,
    userName: user.username,
    userDisplayName: user.display_name ?? user.username,
    attestationType: 'none',
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
  })

  challengeStore.set(u, { challenge: options.challenge, userId: user.id, expires: Date.now() + CHALLENGE_TTL_MS })
  pruneChallenges()

  return { options, userId: user.id }
}

/** Verify registration response and save credential. */
export async function verifyRegistration(
  username: string,
  response: RegistrationResponseJSON
): Promise<{ userId: string }> {
  const u = username.trim().toLowerCase()
  const stored = challengeStore.get(u)
  if (!stored?.challenge) throw new BadRequestError('Registration expired or invalid. Please try again.')
  challengeStore.delete(u)

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  }) as VerifiedRegistrationResponse

  if (!verification.verified || !verification.registrationInfo) {
    throw new BadRequestError('Verification failed')
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
  const userId = stored.userId!
  const publicKeyBuf = Buffer.from(credential.publicKey)
  await authQueries.saveCredential(
    userId,
    credential.id,
    publicKeyBuf,
    credential.counter,
    credentialDeviceType,
    credentialBackedUp,
    credential.transports
  )

  return { userId }
}

/** Generate authentication options. */
export async function getAuthenticationOptions(username: string): Promise<ReturnType<typeof generateAuthenticationOptions> extends Promise<infer T> ? T : never> {
  const u = username.trim().toLowerCase()
  if (!u) throw new BadRequestError('Username required')

  const user = await authQueries.getUserByUsername(u)
  if (!user) throw new BadRequestError('User not found')

  const credentials = await authQueries.getCredentialsByUserId(user.id)
  if (credentials.length === 0) throw new BadRequestError('No passkey registered for this account')

  const allowCredentials = credentials.map((c) => ({
    id: c.credential_id,
    transports: c.transports ? (c.transports.split(',') as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[]) : undefined,
  }))

  const options = await generateAuthenticationOptions({
    rpID: rpID === 'localhost' ? 'localhost' : rpID,
    allowCredentials,
  })

  challengeStore.set(u, { challenge: options.challenge, userId: user.id, expires: Date.now() + CHALLENGE_TTL_MS })
  pruneChallenges()

  return options
}

/** Verify authentication response. Returns userId. */
export async function verifyAuthentication(
  username: string,
  response: AuthenticationResponseJSON
): Promise<{ userId: string }> {
  const u = username.trim().toLowerCase()
  const stored = challengeStore.get(u)
  if (!stored?.challenge) throw new BadRequestError('Login expired. Please try again.')
  challengeStore.delete(u)

  const credentialId = response.id
  const cred = await authQueries.getCredentialById(credentialId)
  if (!cred) throw new BadRequestError('Unknown credential')

  const publicKey = cred.public_key instanceof Buffer ? new Uint8Array(cred.public_key) : new Uint8Array(cred.public_key)

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: cred.credential_id,
      publicKey,
      counter: cred.counter,
      transports: cred.transports ? (cred.transports.split(',') as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[]) : undefined,
    },
  }) as VerifiedAuthenticationResponse

  if (!verification.verified || !verification.authenticationInfo) {
    throw new BadRequestError('Verification failed')
  }

  await authQueries.updateCredentialCounter(cred.credential_id, verification.authenticationInfo.newCounter)

  return { userId: cred.user_id }
}
