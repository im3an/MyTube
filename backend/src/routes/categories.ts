import type { FastifyInstance, FastifyReply } from 'fastify'

/** List categories. Stub: return empty or static list. */
async function listCategories(_req: unknown, reply: FastifyReply) {
  const data = [
    { id: 1, name: 'All' },
    { id: 2, name: 'Music' },
    { id: 3, name: 'Gaming' },
    { id: 4, name: 'News' },
  ]
  return reply.send({ data })
}

export async function categoriesRoutes(app: FastifyInstance) {
  app.get('/categories', listCategories)
}
