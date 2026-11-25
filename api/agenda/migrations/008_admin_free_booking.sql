-- Public schedule rules remain enforced under lock_agenda in application code.
-- Blocks and buffers must not prevent an administrator from using free time.
SELECT pg_advisory_xact_lock(824019);
ALTER TABLE agenda_bookings DROP CONSTRAINT agenda_no_overlap;
ALTER TABLE agenda_bookings ADD CONSTRAINT agenda_no_overlap
  EXCLUDE USING gist (tstzrange(starts_at,ends_at,'[)') WITH &&)
  WHERE (status IN ('held','confirmed'));
