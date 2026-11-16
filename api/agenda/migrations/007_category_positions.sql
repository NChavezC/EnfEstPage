SELECT pg_advisory_xact_lock(824019);
ALTER TABLE agenda_categories ADD COLUMN position integer;
WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY lower(name),id) AS position FROM agenda_categories
)
UPDATE agenda_categories c SET position=r.position FROM ranked r WHERE c.id=r.id;
ALTER TABLE agenda_categories ALTER COLUMN position SET NOT NULL;
ALTER TABLE agenda_categories ADD CONSTRAINT agenda_category_position_positive CHECK (position > 0);
ALTER TABLE agenda_categories ADD CONSTRAINT agenda_category_position_unique UNIQUE(position) DEFERRABLE INITIALLY DEFERRED;

-- Keep seed setup and older clients that omit position compatible.
CREATE OR REPLACE FUNCTION agenda_category_append_position() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(824019);
    IF NEW.position IS NULL THEN
        SELECT COALESCE(MAX(position),0)+1 INTO NEW.position FROM agenda_categories;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER agenda_category_append_position BEFORE INSERT ON agenda_categories
FOR EACH ROW EXECUTE FUNCTION agenda_category_append_position();
