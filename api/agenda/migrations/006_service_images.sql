ALTER TABLE agenda_services ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array');
