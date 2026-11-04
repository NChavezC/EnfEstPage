"""Local account recovery: python -m api.agenda.reset_admin."""
import getpass
from api.agenda.db import connection
from api.agenda.setup import hash_password

if __name__=="__main__":
    password=getpass.getpass("Nueva contraseña (mínimo 12 caracteres): ")
    if len(password)<12 or password!=getpass.getpass("Repite la contraseña: "):
        raise SystemExit("Contraseña demasiado corta o no coincide")
    with connection() as conn:
        conn.execute("UPDATE agenda_admin SET password_hash=%s WHERE id=1",(hash_password(password),))
        conn.execute("DELETE FROM agenda_sessions")
    print("Contraseña actualizada. Las sesiones anteriores fueron cerradas.")
