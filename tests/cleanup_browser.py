"""Remove only the synthetic booking identified by the browser test artifact."""
import json
from api.agenda.config import ROOT
from api.agenda.db import connection,lock_agenda
path=ROOT/".agenda-local"/"browser-booking.json"
if path.exists():
    id=json.loads(path.read_text())["id"]
    with connection() as c:
        lock_agenda(c)
        b=c.execute("SELECT * FROM agenda_bookings WHERE id=%s",(id,)).fetchone()
        if b:
            if b["customer"].get("email")!="navegador@example.invalid" or b["customer"].get("last_name")!="Navegador":
                raise SystemExit("No coincide la identidad de la reserva de prueba")
            p=c.execute("SELECT reference FROM agenda_payments WHERE booking_id=%s",(id,)).fetchone()
            if p:
                c.execute("DELETE FROM agenda_payment_events WHERE reference=%s",(p["reference"],))
                c.execute("DELETE FROM agenda_audit WHERE entity=%s",(p["reference"],))
            c.execute("DELETE FROM agenda_jobs WHERE booking_id=%s",(id,))
            c.execute("DELETE FROM agenda_payments WHERE booking_id=%s",(id,))
            c.execute("DELETE FROM agenda_audit WHERE entity=%s",(id,))
            c.execute("DELETE FROM agenda_bookings WHERE id=%s",(id,))
    path.unlink()
    print("Reserva ficticia de navegador retirada")
