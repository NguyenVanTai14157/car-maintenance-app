-- Transactional invalidation: PostgreSQL delivers NOTIFY only after COMMIT.
-- Payload contains routing IDs only, never contact details, prices or photos.
CREATE OR REPLACE FUNCTION autocare_realtime_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
  previous jsonb;
  audience int[] := ARRAY[]::int[];
  roles text[] := ARRAY['admin','receptionist'];
  resources text[];
  visit appointments%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN row_data:=to_jsonb(OLD); ELSE row_data:=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' THEN previous:=to_jsonb(OLD); ELSE previous:='{}'::jsonb; END IF;
  CASE TG_TABLE_NAME
    WHEN 'appointments' THEN
      audience:=ARRAY[(row_data->>'customer_id')::int,(row_data->>'technician_id')::int,(previous->>'technician_id')::int];
      resources:=ARRAY['appointments','reports'];
    WHEN 'vehicles' THEN
      audience:=ARRAY[(row_data->>'owner_id')::int];
      resources:=ARRAY['vehicles','appointments','reports'];
    WHEN 'users' THEN
      audience:=ARRAY[(row_data->>'id')::int];
      resources:=ARRAY['users','staff','profile','vehicles','appointments','reports'];
    WHEN 'sessions' THEN
      IF TG_OP='INSERT' THEN RETURN NEW; END IF;
      audience:=ARRAY[(row_data->>'user_id')::int];roles:=ARRAY[]::text[];
      resources:=ARRAY['session'];
    WHEN 'notifications' THEN
      audience:=ARRAY[(row_data->>'user_id')::int];roles:=ARRAY[]::text[];
      resources:=ARRAY['notifications'];
    WHEN 'garages' THEN
      roles:=ARRAY['admin','receptionist','technician','customer'];
      resources:=ARRAY['garages','appointments'];
    WHEN 'services' THEN
      roles:=ARRAY['admin','receptionist','technician','customer'];
      resources:=ARRAY['services'];
    ELSE
      SELECT * INTO visit FROM appointments WHERE id=(row_data->>'appointment_id')::int;
      audience:=ARRAY[visit.customer_id,visit.technician_id];
      resources:=ARRAY['appointments','reports'];
  END CASE;
  PERFORM pg_notify('autocare_changes',json_build_object('users',audience,'roles',roles,'resources',resources)::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['appointments','vehicles','users','sessions','notifications','garages','services','extras','photos','reviews','events'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS autocare_changes ON %I',t);
    EXECUTE format('CREATE TRIGGER autocare_changes AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION autocare_realtime_change()',t);
  END LOOP;
END $$;
