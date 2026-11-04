CREATE TABLE agenda_services (
 id serial PRIMARY KEY, name text NOT NULL, price integer NOT NULL CHECK(price>=0),
 deposit integer NOT NULL CHECK(deposit>0 AND deposit<=price),
 duration integer NOT NULL CHECK(duration BETWEEN 10 AND 480),
 care text NOT NULL DEFAULT 'CUIDADOS PREVIOS', version integer NOT NULL DEFAULT 1,
 confirmation text NOT NULL DEFAULT 'Hola {nombre}, tu reserva de {tratamiento} para {fecha} está confirmada. Cuidados: {cuidados}',
 reminder text NOT NULL DEFAULT 'Hola {nombre}, recuerda tu cita de {tratamiento} el {fecha}. {cuidados}',
 reminder_hours integer CHECK(reminder_hours BETWEEN 1 AND 720),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE agenda_settings (
 id integer PRIMARY KEY CHECK(id=1), professional text NOT NULL,
 notice_hours integer NOT NULL DEFAULT 13 CHECK(notice_hours>=0),
 horizon_days integer NOT NULL DEFAULT 120 CHECK(horizon_days BETWEEN 1 AND 365),
 hold_minutes integer NOT NULL DEFAULT 15 CHECK(hold_minutes BETWEEN 5 AND 30)
);
INSERT INTO agenda_settings(id,professional) VALUES(1,'Camila Vela-Ruiz');
CREATE TABLE agenda_schedule (
 id serial PRIMARY KEY, weekday integer CHECK(weekday BETWEEN 0 AND 6),
 specific_date date, effective_from date NOT NULL, plan jsonb NOT NULL,
 CHECK ((weekday IS NULL) <> (specific_date IS NULL))
);
CREATE UNIQUE INDEX agenda_weekly_version ON agenda_schedule(weekday,effective_from) WHERE weekday IS NOT NULL;
CREATE UNIQUE INDEX agenda_date_exception ON agenda_schedule(specific_date) WHERE specific_date IS NOT NULL;
CREATE TABLE agenda_bookings (
 id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, service_id integer REFERENCES agenda_services,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, occupied_until timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('held','confirmed','expired','cancelled','blocked','payment_review')),
 expires_at timestamptz, customer jsonb NOT NULL, snapshot jsonb NOT NULL,
 accepted_at timestamptz, source text NOT NULL, revision integer NOT NULL DEFAULT 1,
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(starts_at < ends_at AND ends_at <= occupied_until),
 CONSTRAINT agenda_no_overlap EXCLUDE USING gist
 (tstzrange(starts_at,occupied_until,'[)') WITH &&) WHERE(status IN ('held','confirmed','blocked'))
);
CREATE TABLE agenda_payments (
 reference text PRIMARY KEY, booking_id uuid NOT NULL UNIQUE REFERENCES agenda_bookings,
 amount integer NOT NULL CHECK(amount>0), status text NOT NULL,
 checkout_url text, provider_transaction text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE agenda_payment_events (
 hash text PRIMARY KEY, reference text REFERENCES agenda_payments,
 result text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE agenda_jobs (
 id bigserial PRIMARY KEY, booking_id uuid NOT NULL REFERENCES agenda_bookings,
 revision integer NOT NULL, kind text NOT NULL, due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0,
 last_error text, sent_at timestamptz,
 UNIQUE(booking_id,revision,kind)
);
CREATE TABLE agenda_admin (
 id integer PRIMARY KEY CHECK(id=1), password_hash text NOT NULL
);
CREATE TABLE agenda_sessions (
 token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL
);
CREATE TABLE agenda_limits (
 key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE agenda_audit (
 id bigserial PRIMARY KEY, action text NOT NULL, entity text NOT NULL,
 details text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
