/**
 * User data routes. Requires auth.
 */

import type { FastifyInstance } from 'fastify'
import * as userDataService from '../services/user-data.service.js'
import { z, parseBody } from '../lib/validate.js'

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/)
const historyItemSchema = z.object({ videoId: videoIdSchema, watchedAt: z.string() })
const creatorSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(100),
  avatar: z.string().max(500).optional(),
})
const playlistSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  videoIds: z.array(videoIdSchema).max(500),
})
const searchHistoryItemSchema = z.object({ query: z.string().max(200), searchedAt: z.string() })

const userDataBodySchema = z.object({
  history: z.array(historyItemSchema).max(100).optional(),
  favorites: z.array(videoIdSchema).max(500).optional(),
  dislikes: z.array(videoIdSchema).max(500).optional(),
  favoriteCreators: z.array(creatorSchema).max(200).optional(),
  watchLater: z.array(videoIdSchema).max(500).optional(),
  playlists: z.array(playlistSchema).max(100).optional(),
  searchHistory: z.array(searchHistoryItemSchema).max(50).optional(),
  playbackPositions: z.record(z.string(), z.number().int().min(0).max(86400)).optional(),
}).strict()

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

  /** PUT /user-data — upsert user data (64 KB body limit) */
  app.put<{ Body: userDataService.UserDataPayload }>('/', { bodyLimit: 65_536 }, async (req, reply) => {
    const userId = await requireAuth(req, reply)
    if (typeof userId !== 'string') return
    const body = parseBody(userDataBodySchema, req.body ?? {})
    const data = await userDataService.putUserData(userId, body)
    return reply.send(data)
  })
}
