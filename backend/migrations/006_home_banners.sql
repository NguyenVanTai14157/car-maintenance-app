CREATE TABLE IF NOT EXISTS home_banners (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 100),
  action_text TEXT NOT NULL CHECK(length(trim(action_text)) BETWEEN 1 AND 60),
  target_path TEXT NOT NULL CHECK(target_path IN ('/plans','/record-edit','/vehicles')),
  image_path TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 1000),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS home_banners_active_position
  ON home_banners(active,position,id);

CREATE OR REPLACE FUNCTION home_banners_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'autocare_changes',
    json_build_object(
      'users',ARRAY[]::int[],
      'roles',ARRAY['user'],
      'resources',ARRAY['banners']
    )::text
  );
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS home_banners_change ON home_banners;
CREATE TRIGGER home_banners_change
AFTER INSERT OR UPDATE OR DELETE ON home_banners
FOR EACH ROW EXECUTE FUNCTION home_banners_change();
