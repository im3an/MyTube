import type { FastifyInstance } from 'fastify'
import * as videosController from '../controllers/videos.js'

export async function videosRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/videos/:id', videosController.getVideo)
  app.post<{ Params: { id: string } }>('/videos/:id/view', videosController.recordView)
}
