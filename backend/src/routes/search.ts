import type { FastifyInstance } from 'fastify'
import * as searchController from '../controllers/search.js'

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', searchController.search)
}
