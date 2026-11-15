-- Remove only the catalog examples originally inserted by 002_admin.sql.
-- Keep any example that has become part of a user's actual vehicle data.

DELETE FROM vehicle_models m
WHERE (m.brand_id, lower(m.name)) IN (
  SELECT b.id, lower(x.model)
  FROM (VALUES
    ('Toyota', 'Vios'),
    ('Honda', 'City'),
    ('Hyundai', 'Accent'),
    ('Ford', 'Ranger')
  ) AS x(brand, model)
  JOIN vehicle_brands b ON lower(b.name) = lower(x.brand)
)
AND NOT EXISTS (
  SELECT 1 FROM vehicles v WHERE v.model_id = m.id
);

DELETE FROM vehicle_brands b
WHERE lower(b.name) IN ('toyota', 'honda', 'hyundai', 'ford', 'mazda', 'kia', 'vinfast')
AND NOT EXISTS (
  SELECT 1 FROM vehicles v
  WHERE v.brand_id = b.id
     OR EXISTS (
       SELECT 1 FROM vehicle_models m
       WHERE m.id = v.model_id AND m.brand_id = b.id
     )
)
AND NOT EXISTS (
  SELECT 1 FROM vehicle_models m WHERE m.brand_id = b.id
);

DELETE FROM vehicle_types t
WHERE lower(t.name) IN ('sedan', 'suv', 'hatchback', 'bán tải', 'mpv')
AND NOT EXISTS (SELECT 1 FROM vehicles v WHERE v.type_id = t.id)
AND NOT EXISTS (SELECT 1 FROM vehicle_models m WHERE m.type_id = t.id);
