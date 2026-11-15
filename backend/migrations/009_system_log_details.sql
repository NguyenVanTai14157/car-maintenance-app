ALTER TABLE system_logs ADD COLUMN error_reason TEXT;

CREATE FUNCTION notify_system_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('autocare_changes', '{"users":[],"roles":[],"resources":["system-logs"]}');
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_system_log AFTER INSERT ON system_logs
FOR EACH STATEMENT EXECUTE FUNCTION notify_system_log();
