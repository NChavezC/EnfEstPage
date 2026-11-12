-- Serialize backfill with existing booking mutations.
SELECT pg_advisory_xact_lock(824019);
CREATE TABLE agenda_customers (
 id bigserial PRIMARY KEY,
 first_name text NOT NULL, last_name text NOT NULL,
 email text NOT NULL, phone text NOT NULL,
 birth_date date, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agenda_customer_identity ON agenda_customers
 (lower(trim(first_name)), lower(trim(last_name)), lower(trim(email)), phone);
ALTER TABLE agenda_bookings ADD COLUMN customer_id bigint REFERENCES agenda_customers;
CREATE INDEX agenda_bookings_customer ON agenda_bookings(customer_id);

-- Match all four identity fields. A shared phone/email alone must not merge people.
INSERT INTO agenda_customers(first_name,last_name,email,phone)
 SELECT DISTINCT ON (
   lower(trim(customer->>'first_name')),lower(trim(customer->>'last_name')),
   lower(trim(customer->>'email')),customer->>'phone')
   trim(customer->>'first_name'),trim(customer->>'last_name'),
   lower(trim(customer->>'email')),customer->>'phone'
 FROM agenda_bookings
 WHERE coalesce(trim(customer->>'first_name'),'') <> ''
   AND coalesce(customer->>'last_name','') <> ''
   AND coalesce(customer->>'email','') <> ''
   AND coalesce(customer->>'phone','') <> ''
 ORDER BY lower(trim(customer->>'first_name')),lower(trim(customer->>'last_name')),
   lower(trim(customer->>'email')),customer->>'phone',created_at DESC;
UPDATE agenda_bookings b SET customer_id=c.id
 FROM agenda_customers c
 WHERE lower(trim(b.customer->>'first_name'))=lower(trim(c.first_name))
   AND lower(trim(b.customer->>'last_name'))=lower(trim(c.last_name))
   AND lower(trim(b.customer->>'email'))=lower(trim(c.email))
   AND b.customer->>'phone'=c.phone;
