CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,phone TEXT UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user' CHECK(role='user'),avatar TEXT NOT NULL DEFAULT '',active BOOLEAN NOT NULL DEFAULT true,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS password_resets(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),used_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS vehicles(id SERIAL PRIMARY KEY,owner_id INT NOT NULL REFERENCES users(id),brand TEXT NOT NULL,model TEXT NOT NULL,plate TEXT,year INT,odometer INT NOT NULL CHECK(odometer>=0),image TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',archived BOOLEAN NOT NULL DEFAULT false);
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_owner_plate ON vehicles(owner_id,upper(plate)) WHERE plate IS NOT NULL;
CREATE TABLE IF NOT EXISTS categories(id SERIAL PRIMARY KEY,owner_id INT NOT NULL REFERENCES users(id),name TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT true);
CREATE UNIQUE INDEX IF NOT EXISTS categories_owner_name ON categories(owner_id,lower(name));
CREATE TABLE IF NOT EXISTS plans(id SERIAL PRIMARY KEY,owner_id INT NOT NULL REFERENCES users(id),vehicle_id INT NOT NULL REFERENCES vehicles(id),category_id INT NOT NULL REFERENCES categories(id),due_date DATE,due_km INT CHECK(due_km>=0),remind_days INT NOT NULL DEFAULT 7 CHECK(remind_days>=0),remind_km INT NOT NULL DEFAULT 500 CHECK(remind_km>=0),interval_months INT CHECK(interval_months>0),interval_km INT CHECK(interval_km>0),notes TEXT NOT NULL DEFAULT '',cancelled BOOLEAN NOT NULL DEFAULT false,source_record_id INT UNIQUE,CHECK(due_date IS NOT NULL OR due_km IS NOT NULL));
CREATE TABLE IF NOT EXISTS records(id SERIAL PRIMARY KEY,owner_id INT NOT NULL REFERENCES users(id),vehicle_id INT NOT NULL REFERENCES vehicles(id),category_id INT NOT NULL REFERENCES categories(id),plan_id INT UNIQUE REFERENCES plans(id) ON DELETE SET NULL,performed_date DATE NOT NULL,odometer INT NOT NULL CHECK(odometer>=0),cost INT NOT NULL CHECK(cost>=0),content TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',images JSONB NOT NULL DEFAULT '[]',interval_months INT,interval_km INT);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='plans_source_record_fk') THEN ALTER TABLE plans ADD CONSTRAINT plans_source_record_fk FOREIGN KEY(source_record_id) REFERENCES records(id) ON DELETE SET NULL;END IF;END $$;
CREATE TABLE IF NOT EXISTS settings(owner_id INT PRIMARY KEY REFERENCES users(id),notifications BOOLEAN NOT NULL DEFAULT true,remind_days INT NOT NULL DEFAULT 7,remind_km INT NOT NULL DEFAULT 500,remind_hour INT NOT NULL DEFAULT 9,unit TEXT NOT NULL DEFAULT 'km' CHECK(unit='km'));
CREATE TABLE IF NOT EXISTS notifications(id SERIAL PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id),plan_id INT REFERENCES plans(id) ON DELETE CASCADE,event_key TEXT NOT NULL,message TEXT NOT NULL,read BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(user_id,event_key));
CREATE INDEX IF NOT EXISTS plans_owner ON plans(owner_id);
CREATE INDEX IF NOT EXISTS records_owner_date ON records(owner_id,performed_date);
CREATE OR REPLACE FUNCTION personal_defaults() RETURNS trigger AS $$ BEGIN INSERT INTO categories(owner_id,name) VALUES(NEW.id,'Thay dầu động cơ'),(NEW.id,'Thay lọc gió'),(NEW.id,'Kiểm tra phanh'),(NEW.id,'Kiểm tra lốp');INSERT INTO settings(owner_id) VALUES(NEW.id);RETURN NEW;END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS personal_defaults ON users;
CREATE TRIGGER personal_defaults AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION personal_defaults();
CREATE OR REPLACE FUNCTION personal_change() RETURNS trigger AS $$
DECLARE d jsonb;uid int;resources text[];
BEGIN
 IF TG_OP='DELETE' THEN d=to_jsonb(OLD);ELSE d=to_jsonb(NEW);END IF;
 IF TG_TABLE_NAME='sessions' AND TG_OP='INSERT' THEN RETURN NULL;END IF;
 uid=COALESCE((d->>'owner_id')::int,(d->>'user_id')::int,(d->>'id')::int);
 resources=CASE TG_TABLE_NAME WHEN 'users' THEN ARRAY['profile'] WHEN 'sessions' THEN ARRAY['session'] WHEN 'notifications' THEN ARRAY['notifications'] ELSE ARRAY['vehicles','categories','plans','records','dashboard','costs','settings'] END;
 PERFORM pg_notify('autocare_changes',json_build_object('users',ARRAY[uid],'roles',ARRAY[]::text[],'resources',resources)::text);RETURN NULL;
END $$ LANGUAGE plpgsql;
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['users','sessions','vehicles','categories','plans','records','settings','notifications'] LOOP EXECUTE format('DROP TRIGGER IF EXISTS personal_change ON %I',t);EXECUTE format('CREATE TRIGGER personal_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION personal_change()',t);END LOOP;END $$;
