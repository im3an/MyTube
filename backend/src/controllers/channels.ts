/**
 * Channel request/response handling.
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import * as channelService from '../services/channel.service.js'
import { isAppError } from '../utils/errors.js'
import { ApiResponse } from '../utils/dto.js'

export async function getChannel(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const { id } = req.params
    const data = await channelService.getChannelById(id)
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
    return reply.send({ data } satisfies ApiResponse<typeof data>)
  } catch (e) {
    if (isAppError(e)) {
      return reply.status(e.statusCode).send({ error: e.message })
    }
    return reply.status(500).send({ error: 'Internal server error' })
  }
}
