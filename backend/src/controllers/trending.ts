/**
 * Trending request/response handling.
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import * as trendingService from '../services/trending.service.js'
import { ApiResponse } from '../utils/dto.js'

interface TrendingQuery {
  region?: string
}

export async function getTrending(
  req: FastifyRequest<{ Querystring: TrendingQuery }>,
  reply: FastifyReply
) {
  const region = req.query.region ?? 'US'
  const data = await trendingService.getTrending(region)
  reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
  return reply.send({ data } satisfies ApiResponse<typeof data>)
}
