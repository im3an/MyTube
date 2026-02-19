import type { FastifyInstance } from 'fastify'
import * as channelsController from '../controllers/channels.js'

export async function channelsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/channels/:id', channelsController.getChannel)
}
