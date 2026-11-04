from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from api.agenda.config import config

@contextmanager
def connection():
    with psycopg.connect(config.database_url.get_secret_value(), row_factory=dict_row, connect_timeout=5) as conn:
        yield conn

def lock_agenda(conn):
    # One professional today. All schedule/claim mutations share this lock.
    conn.execute("SELECT pg_advisory_xact_lock(824019)")

def expire(conn):
    conn.execute("""UPDATE agenda_bookings SET status='expired'
        WHERE status='held' AND expires_at <= clock_timestamp()""")

def audit(conn, action, entity, details=""):
    conn.execute("INSERT INTO agenda_audit(action,entity,details) VALUES(%s,%s,%s)", (action,str(entity),details))
