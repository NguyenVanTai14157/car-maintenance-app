ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 10);

-- Keep existing vehicle photos as the first item in the new gallery.
UPDATE vehicles SET images = jsonb_build_array(image)
WHERE image <> '' AND images = '[]'::jsonb;
