/**
 * Search request/response handling.
 */

import type { FastifyRequest, FastifyReply } from 'fastify'
import * as searchService from '../services/search.service.js'
import { ApiResponse } from '../utils/dto.js'

interface SearchQuery {
  q?: string
  region?: string
  nextpage?: string
}

export async function search(
  req: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply
) {
  const q = (req.query.q ?? '').trim()
  const region = req.query.region ?? 'US'
  const nextpage = req.query.nextpage

  const { videos, nextpage: next } = await searchService.searchVideos(q, region, nextpage)
  reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
  return reply.send({
    data: videos,
    meta: { nextPage: next ?? undefined },
  } satisfies ApiResponse<typeof videos>)
}
