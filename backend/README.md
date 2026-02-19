# MyTube Backend

Node.js + Fastify API with cache (in-memory) and optional PostgreSQL.

## Setup

```bash
npm install
```

## Database (optional)

Set `DATABASE_URL` for caching. Without it, all data comes from Piped.

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/mytube
```

Run migrations:

```bash
npm run build
node dist/db/migrate.js
```

## Run

```bash
npm run dev   # tsx watch
# or
npm run build && npm start
```

Server listens on port 4000 (or `PORT`).

## API

- `GET /api/videos/:id` - Video detail
- `POST /api/videos/:id/view` - Increment view count
- `GET /api/search?q=&region=&nextpage=`
- `GET /api/trending?region=`
- `GET /api/channels/:id`
- `GET /api/categories`

## Frontend integration

Set `VITE_USE_BACKEND=1` and run both:

```bash
VITE_USE_BACKEND=1 npm run dev:all:backend
```
