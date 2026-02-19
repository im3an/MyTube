/**
 * Auth routes: WebAuthn registration and login.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as authService from '../services/auth.service.js'
import * as authQueries from '../db/queries/auth.js'

export async function authRoutes(app: FastifyInstance) {
  /** POST /auth/register/options — get registration options */
  app.post<{ Body: { username: string } }>('/register/options', async (req, reply) => {
    const { username } = req.body ?? {}
    try {
    const { options, userId } = await authService.getRegistrationOptions(username)
    ;(req as any).session?.set('pendingUserId', userId)
    return reply.send(options)
    } catch (err: any) {
      const msg = err?.message ?? ''
      const code = err?.code ?? err?.cause?.code
      if (
        code === '42P01' ||
        code === 'ECONNREFUSED' ||
        msg.includes('relation') ||
        msg.includes('does not exist')
      ) {
        return reply.status(503).send({
          error: 'Database not ready. Ensure PostgreSQL is running and run: cd backend && npm run db:migrate',
        })
      }
      throw err
    }
  })

  /** POST /auth/register/verify — verify registration, create session */
  app.post<{ Body: { username: string; response: unknown } }>('/register/verify', async (req, reply) => {
    const { username, response } = req.body ?? {}
    const { userId } = await authService.verifyRegistration(username, response as any)
    ;(req as any).session?.set('userId', userId)
    ;(req as any).session?.set('pendingUserId', undefined)
    const user = await authQueries.getUserById(userId)
    return reply.send({ verified: true, user: user ? toPublicUser(user) : null })
  })

  /** POST /auth/login/options — get authentication options */
  app.post<{ Body: { username: string } }>('/login/options', async (req, reply) => {
    const { username } = req.body ?? {}
    const options = await authService.getAuthenticationOptions(username)
    return reply.send(options)
  })

  /** POST /auth/login/verify — verify authentication, create session */
  app.post<{ Body: { username: string; response: unknown } }>('/login/verify', async (req, reply) => {
    const { username, response } = req.body ?? {}
    const { userId } = await authService.verifyAuthentication(username, response as any)
    ;(req as any).session?.set('userId', userId)
    const user = await authQueries.getUserById(userId)
    return reply.send({ verified: true, user: user ? toPublicUser(user) : null })
  })

  /** POST /auth/logout */
  app.post('/logout', async (req, reply) => {
    ;(req as any).session?.delete()
    return reply.send({ ok: true })
  })

  /** PATCH /auth/me — update profile */
  app.patch<{ Body: { displayName?: string; avatarUrl?: string } }>('/me', async (req, reply) => {
    const userId = (req as any).session?.get('userId') as string | undefined
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' })
    const { displayName, avatarUrl } = req.body ?? {}
    await authQueries.updateUser(userId, {
      ...(displayName !== undefined && { display_name: displayName }),
      ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
    })
    const user = await authQueries.getUserById(userId)
    return reply.send({ user: user ? toPublicUser(user) : null })
  })

  /** GET /auth/me — current user */
  app.get('/me', async (req, reply) => {
    const userId = (req as any).session?.get('userId') as string | undefined
    if (!userId) {
      return reply.send({ user: null })
    }
    const user = await authQueries.getUserById(userId)
    return reply.send({ user: user ? toPublicUser(user) : null })
  })
}

function toPublicUser(u: authQueries.User) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name ?? u.username,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
  }
}
