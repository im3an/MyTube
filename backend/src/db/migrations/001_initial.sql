-- Videos: cached metadata from Piped/YouTube
CREATE TABLE IF NOT EXISTS videos (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  thumbnail_url TEXT,
  duration_sec  INT,
  published_at TIMESTAMPTZ,
  raw_json     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Channels: cached channel metadata
CREATE TABLE IF NOT EXISTS channels (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  avatar_url       TEXT,
  banner_url       TEXT,
  subscriber_count BIGINT DEFAULT 0,
  verified         BOOLEAN DEFAULT FALSE,
  raw_json         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Categories: for trending/filtering
CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Analytics: platform-specific (views, likes)
CREATE TABLE IF NOT EXISTS analytics (
  video_id   TEXT NOT NULL,
  views      BIGINT DEFAULT 0,
  likes      INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (video_id)
);

-- Allow analytics.video_id without FK for videos we haven't cached yet
ALTER TABLE analytics DROP CONSTRAINT IF EXISTS analytics_video_id_fkey;
-- Optional: add FK when video exists
-- ALTER TABLE analytics ADD CONSTRAINT analytics_video_id_fkey FOREIGN KEY (video_id) REFERENCES videos(id);

-- Search cache: optional, for hot queries
CREATE TABLE IF NOT EXISTS search_cache (
  query_hash TEXT PRIMARY KEY,
  query      TEXT NOT NULL,
  region     TEXT,
  nextpage   TEXT,
  result_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (read-heavy optimization)
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_channels_updated ON channels(updated_at);
CREATE INDEX IF NOT EXISTS idx_analytics_views ON analytics(views DESC);
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(query, region);
