CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN ('activity', 'error')),
  request_id UUID NOT NULL,
  actor_id INTEGER,
  actor_email TEXT,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  resource_id TEXT,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_code TEXT
);
CREATE INDEX system_logs_kind_id_idx ON system_logs (kind, id DESC);
