ALTER TABLE home_banners ADD COLUMN image_paths TEXT[];
UPDATE home_banners SET image_paths = ARRAY[image_path];
ALTER TABLE home_banners ALTER COLUMN image_paths SET NOT NULL;
ALTER TABLE home_banners ADD CHECK (cardinality(image_paths) BETWEEN 1 AND 8);
