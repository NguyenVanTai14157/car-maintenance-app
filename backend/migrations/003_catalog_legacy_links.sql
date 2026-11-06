-- Link only exact case-insensitive matches. Keep all original brand/model text.
UPDATE vehicles v SET brand_id=b.id FROM vehicle_brands b
WHERE v.brand_id IS NULL AND lower(trim(v.brand))=lower(trim(b.name));
UPDATE vehicles v SET model_id=m.id FROM vehicle_models m
WHERE v.model_id IS NULL AND v.brand_id=m.brand_id AND lower(trim(v.model))=lower(trim(m.name));
UPDATE vehicles v SET type_id=m.type_id FROM vehicle_models m
WHERE v.type_id IS NULL AND v.model_id=m.id AND m.type_id IS NOT NULL;
