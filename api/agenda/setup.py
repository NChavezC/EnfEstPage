"""Run with python -m api.agenda.setup. Creates schema and seeds only once."""
import hashlib
import secrets
from pathlib import Path
from psycopg.types.json import Jsonb
from api.agenda.db import connection
from api.agenda.config import ROOT, config

def hash_password(password, salt=None):
    salt=salt or secrets.token_hex(16)
    digest=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1).hex()
    return f"{salt}:{digest}"

def initialize():
    with connection() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(824020)")
        conn.execute("CREATE TABLE IF NOT EXISTS agenda_migrations(version text PRIMARY KEY, applied_at timestamptz DEFAULT now())")
        for path in sorted((Path(__file__).parent/"migrations").glob("*.sql")):
            if not conn.execute("SELECT 1 FROM agenda_migrations WHERE version=%s",(path.name,)).fetchone():
                conn.execute(path.read_text(encoding="utf-8"))
                conn.execute("INSERT INTO agenda_migrations(version) VALUES(%s)",(path.name,))
        if not conn.execute("SELECT 1 FROM agenda_services LIMIT 1").fetchone():
            for name,price in [("Limpieza facial profunda",28000),("Limpieza facial Glass Skin (+ dermaplaning)",34000),("Limpieza facial nano-infusión",37000)]:
                conn.execute("INSERT INTO agenda_services(name,price,deposit,duration) VALUES(%s,%s,10000,120)",(name,price))
        if not conn.execute("SELECT 1 FROM agenda_schedule LIMIT 1").fetchone():
            weeks=[
              (["12:00","14:10","16:40"],"12:00","19:00","16:10","16:40"),
              (["09:00","11:10","13:40"],"09:00","17:00","13:10","13:40"),
              (["11:00","13:10","15:40","17:50"],"11:00","19:50","15:10","15:40"),
              (["09:00","11:10","13:40","15:50"],"09:00","19:00","13:10","13:40"),
              (["09:00","11:10","13:40","15:50"],"09:00","17:50","13:10","13:40"),
              (["09:20","11:30"],"09:20","15:00","13:30","14:00"),
            ]
            for day,(starts,begin,end,lunch,lunch_end) in enumerate(weeks):
                plan={"closed":False,"starts":starts,"shift_start":begin,"shift_end":end,"duration":120,"buffer":10,"final_buffer":False,"breaks":[{"start":lunch,"end":lunch_end}]}
                conn.execute("INSERT INTO agenda_schedule(weekday,effective_from,plan) VALUES(%s,'2020-01-01',%s)",(day,Jsonb(plan)))
            conn.execute("INSERT INTO agenda_schedule(weekday,effective_from,plan) VALUES(6,'2020-01-01',%s)",(Jsonb({"closed":True}),))
        if not conn.execute("SELECT 1 FROM agenda_admin").fetchone():
            password=secrets.token_urlsafe(18)
            folder=ROOT/".agenda-local"
            folder.mkdir(exist_ok=True)
            # Create private local credential file before committing the account.
            (folder/("test-admin-access.txt" if config.agenda_env=="test" else "admin-access.txt")).write_text("Administración: http://localhost:5173/admin\nContraseña: "+password+"\n",encoding="utf-8")
            conn.execute("INSERT INTO agenda_admin VALUES(1,%s)",(hash_password(password),))
    print("Migraciones y configuración inicial listas. Acceso en .agenda-local/admin-access.txt")

if __name__=="__main__":
    initialize()
