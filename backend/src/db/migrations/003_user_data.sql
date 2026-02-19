-- User data: history, favorites, dislikes, subscriptions, watch later, playlists, search history, playback positions

CREATE TABLE IF NOT EXISTS user_history (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   TEXT NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_dislikes (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_favorite_creators (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  avatar     TEXT,
  PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS user_watch_later (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_playlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_playlist_videos (
  playlist_id UUID NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
  video_id    TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_search_history (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_search_history_user ON user_search_history(user_id);

CREATE TABLE IF NOT EXISTS user_playback_positions (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id    TEXT NOT NULL,
  position_sec INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);
