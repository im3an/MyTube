/**
 * User data routes. Requires auth.
 */

import type { FastifyInstance } from 'fastify'
import * as userDataService from '../services/user-data.service.js'

export async function userDataRoutes(app: FastifyInstance) {
  /** Require session */
  async function requireAuth(req: any, reply: any) {
    const userId = req.session?.get?.('userId')
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    return userId
  }

  /** GET /user-data — fetch full user data */
  app.get('/', async (req, reply) => {
    const userId = await requireAuth(req, reply)
    if (typeof userId !== 'string') return
    const data = await userDataService.getUserData(userId)
    return reply.send(data)
  })

  /** PUT /user-data — upsert user data */
  app.put<{ Body: userDataService.UserDataPayload }>('/', async (req, reply) => {
    const userId = await requireAuth(req, reply)
    if (typeof userId !== 'string') return
    const body = req.body ?? {}
    const data = await userDataService.putUserData(userId, body)
    return reply.send(data)
  })
}
