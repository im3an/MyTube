import type { FastifyInstance } from 'fastify'
import { getTrending } from '../controllers/trending.js'

export async function trendingRoutes(app: FastifyInstance) {
  app.get('/trending', getTrending)
}
