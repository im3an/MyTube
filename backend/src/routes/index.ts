import type { FastifyInstance } from 'fastify'
import { videosRoutes } from './videos.js'
import { searchRoutes } from './search.js'
import { trendingRoutes } from './trending.js'
import { channelsRoutes } from './channels.js'
import { categoriesRoutes } from './categories.js'
import { authRoutes } from './auth.js'
import { userDataRoutes } from './user-data.js'
import { proxyRoutes } from './proxy.js'

export async function registerRoutes(app: FastifyInstance) {
  const apiPrefix = '/api'
  await app.register(async (scope) => {
    await videosRoutes(scope)
    await searchRoutes(scope)
    await trendingRoutes(scope)
    await channelsRoutes(scope)
    await categoriesRoutes(scope)
    await scope.register(authRoutes, { prefix: '/auth' })
    await scope.register(userDataRoutes, { prefix: '/user-data' })
    await proxyRoutes(scope)
  }, { prefix: apiPrefix })
}
