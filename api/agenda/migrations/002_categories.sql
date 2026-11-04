CREATE TABLE agenda_categories (
 id serial PRIMARY KEY,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 100)
);
CREATE UNIQUE INDEX agenda_categories_name_unique ON agenda_categories(lower(btrim(name)));
INSERT INTO agenda_categories(name) VALUES ('Limpieza Facial');
ALTER TABLE agenda_services ADD COLUMN category_id integer NOT NULL DEFAULT 1 REFERENCES agenda_categories(id);
