/**
 * Video request/response handling. Validates input, calls services, formats response.
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import * as videoService from '../services/video.service.js'
import * as analyticsService from '../services/analytics.service.js'
import { isAppError, toHttpStatus } from '../utils/errors.js'
import { ApiResponse } from '../utils/dto.js'

export async function getVideo(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params
    const data = await videoService.getVideoById(id)
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
    return reply.send({ data } satisfies ApiResponse<typeof data>)
  } catch (e) {
    if (isAppError(e)) {
      return reply.status(e.statusCode).send({ error: e.message })
    }
    return reply.status(500).send({ error: 'Internal server error' })
  }
}

export async function recordView(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params
    await analyticsService.incrementViewCount(id)
    return reply.status(204).send()
  } catch (e) {
    return reply.status(toHttpStatus(e)).send({ error: (e as Error).message })
  }
}
