ALTER TABLE agenda_services ADD COLUMN deleted_at timestamptz;
ALTER TABLE agenda_services ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE agenda_services ADD CONSTRAINT agenda_live_service_category CHECK (deleted_at IS NOT NULL OR category_id IS NOT NULL);
