ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_token_hash_idx
  ON sessions(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
