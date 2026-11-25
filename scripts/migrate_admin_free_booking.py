"""Apply only migration 008 before deploying the corresponding application code.

Run from the repository root using python -m scripts.migrate_admin_free_booking.
Add --production to use the existing private Vercel environment file.
"""
import os
import sys
from pathlib import Path

if "--production" in sys.argv:
    from dotenv import dotenv_values
    for key, value in dotenv_values(".agenda-local/vercel-production.env").items():
        if value is not None:
            os.environ[key] = value

from psycopg.conninfo import conninfo_to_dict
from api.agenda.config import config
from api.agenda.db import connection, lock_agenda

target = conninfo_to_dict(config.database_url.get_secret_value())
production = "--production" in sys.argv
if production:
    assert config.agenda_env == "production" and target["host"].endswith(".neon.tech")
else:
    assert target["host"] in {"localhost", "127.0.0.1"} and target["dbname"] == "enfest"

version = "008_admin_free_booking.sql"
with connection() as conn:
    conn.execute("SET LOCAL lock_timeout = '10s'")
    conn.execute("SELECT pg_advisory_xact_lock(824020)")
    lock_agenda(conn)
    before = conn.execute("SELECT * FROM agenda_bookings ORDER BY id").fetchall()
    if not conn.execute("SELECT 1 FROM agenda_migrations WHERE version=%s", (version,)).fetchone():
        conn.execute((Path(__file__).resolve().parents[1] / "api/agenda/migrations" / version).read_text(encoding="utf-8"))
        conn.execute("INSERT INTO agenda_migrations(version) VALUES(%s)", (version,))
    assert before == conn.execute("SELECT * FROM agenda_bookings ORDER BY id").fetchall()
print("Migration 008 ready:", "Neon production" if production else "local enfest",
      "; historical bookings preserved:", len(before))
