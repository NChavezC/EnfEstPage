"""Durable email outbox. python -m api.agenda.worker [--once].
SMTP ambiguous outcomes become 'unknown', never blindly retried.
"""
import logging
import httpx
import argparse
import smtplib
import ssl
import certifi
import time
from email.message import EmailMessage
from html import escape
from api.agenda.config import config,ROOT
from api.agenda.db import connection,lock_agenda,expire
from api.agenda.schedule import ZONE

def deliver(job,b):
    snap=b["snapshot"]
    values={"nombre":b["customer"]["first_name"],"tratamiento":snap["name"],
      "fecha":b["starts_at"].astimezone(ZONE).strftime("%d/%m/%Y a las %H:%M"),
      "cuidados":snap["care"],"saldo":str(snap["price"]-b.get("paid_amount",0))}
    kind=job["kind"]
    template=snap["reminder"] if kind=="reminder" else snap["confirmation"]
    subject={"confirmation":"Reserva confirmada","update":"Reserva reprogramada","reminder":"Recordatorio de tu cita","cancellation":"Reserva cancelada"}[kind]
    if kind=="cancellation":
        template="Hola {nombre}, se canceló tu reserva de {tratamiento} para {fecha}. Contacta al centro para revisar cualquier saldo o devolución."
    elif kind=="update":
        template="Tu cita fue reprogramada. "+template
    message=EmailMessage()
    message["Subject"]=subject+" · Enfermera Estética"
    message["From"]=config.smtp_sender or "desarrollo@enfermeraestetica.local"
    message["To"]=b["customer"]["email"]
    message["Message-ID"]=f"<agenda-{job['id']}@enfermeraestetica.cl>"
    text = template.format(**values)
    lines = "<br>".join(escape(text).splitlines())
    html = (
        '<html><body style="font-family:Arial,sans-serif;color:#33282d">'
        '<img src="https://enfermeraestetica.cl/logo-new-largo-rosa.jpeg" '
        'width="220" alt="Enfermera Estética" style="max-width:100%;height:auto">'
        f'<p style="line-height:1.6">{lines}</p></body></html>'
    )
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    if config.agenda_mail_mode=="file":
        folder=ROOT/".agenda-local"/("test-emails" if config.agenda_env=="test" else "emails")
        folder.mkdir(exist_ok=True,parents=True)
        target=folder/f"{job['id']}.eml"
        # Atomic replacement; repeat is safe with one file per job.
        tmp=target.with_suffix(".tmp")
        tmp.write_bytes(bytes(message))
        tmp.replace(target)
        return "saved_local"
    if config.agenda_mail_mode=="resend":
        if not config.resend_api_key.get_secret_value() or not config.smtp_sender:
            raise ValueError("Configura RESEND_API_KEY y SMTP_SENDER")
        # Stable per reservation/revision/event; distinct from local numeric IDs.
        key=f"agenda/{b['id']}/{job['revision']}/{kind}"
        with httpx.Client(timeout=10,follow_redirects=False) as client:
            response=client.post("https://api.resend.com/emails",headers={
                "Authorization":"Bearer "+config.resend_api_key.get_secret_value(),
                "Idempotency-Key":key},json={
                "from":config.smtp_sender,"to":[b["customer"]["email"]],
                "subject":str(message["Subject"]),"text":text,"html":html})
        if 400<=response.status_code<500:
            raise ValueError(f"Resend rechazó el envío (HTTP {response.status_code}); revisar proveedor")
        response.raise_for_status()
        if not response.json().get("id"):
            raise RuntimeError("Resend sin identificador de envío")
        return "accepted"
    if not config.smtp_host or not config.smtp_sender:
        raise ValueError("Configura SMTP_HOST y SMTP_SENDER")
    with smtplib.SMTP(config.smtp_host,config.smtp_port,timeout=20) as smtp:
        smtp.starttls(context=ssl.create_default_context(cafile=certifi.where()))
        if config.smtp_username:
            smtp.login(config.smtp_username,config.smtp_password.get_secret_value())
        smtp.send_message(message)
    return "accepted"

def run_once(booking_id=None):
    with connection() as conn:
        # Multiple workers are safe. If a worker died while sending, human review.
        conn.execute("""UPDATE agenda_jobs SET status='unknown',last_error='Envío interrumpido; revisar antes de reenviar'
          WHERE status='processing' AND due_at<now()-interval '10 minutes'""")
        job=conn.execute("""SELECT * FROM agenda_jobs WHERE status='queued' AND due_at<=now()
          AND (%s::uuid IS NULL OR booking_id=%s::uuid)
          ORDER BY due_at,id FOR UPDATE SKIP LOCKED LIMIT 1""",(booking_id,booking_id)).fetchone()
        if not job:
            return False
        conn.execute("UPDATE agenda_jobs SET status='processing',attempts=attempts+1,due_at=now() WHERE id=%s",(job["id"],))
    # Hold the same agenda lock while checking and sending so a reschedule cannot
    # race between the final revision check and SMTP acceptance.
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        b=conn.execute("SELECT b.*, CASE WHEN p.status='completed' THEN p.amount ELSE 0 END AS paid_amount FROM agenda_bookings b LEFT JOIN agenda_payments p ON p.booking_id=b.id WHERE b.id=%s",(job["booking_id"],)).fetchone()
        valid_status="cancelled" if job["kind"]=="cancellation" else "confirmed"
        if b["revision"]!=job["revision"] or b["status"]!=valid_status or (job["kind"]=="reminder" and b["starts_at"]<=conn.execute("SELECT now() AS n").fetchone()["n"]):
            conn.execute("UPDATE agenda_jobs SET status='skipped' WHERE id=%s",(job["id"],))
            return True
        try:
            status=deliver(job,b)
            conn.execute("UPDATE agenda_jobs SET status=%s,sent_at=now() WHERE id=%s",(status,job["id"]))
        except ValueError as e:
            conn.execute("UPDATE agenda_jobs SET status='failed',last_error=%s WHERE id=%s",(str(e),job["id"]))
        except Exception:
            conn.execute("UPDATE agenda_jobs SET status='unknown',last_error='Resultado de envío incierto; requiere revisión' WHERE id=%s",(job["id"],))
    return True

def dispatch_booking(booking_id):
    """One immediate job, after the reservation transaction has committed.

    Awaited by the request: no detached thread or perpetual server is needed.
    Failure must never undo a paid/changed reservation.
    """
    if config.agenda_mail_dispatch!="request" or not booking_id:
        return
    try:
        run_once(booking_id=booking_id)
    except Exception as error:
        logging.getLogger(__name__).error("Mail dispatch interrupted: %s",type(error).__name__)


def run_batch(max_jobs=3,seconds=35):
    deadline=time.monotonic()+seconds
    processed=0
    while processed<max_jobs and time.monotonic()<deadline and run_once():
        processed+=1
    return processed


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--once",action="store_true")
    args=parser.parse_args()
    while True:
        worked=run_once()
        if args.once:
            break
        if not worked:
            time.sleep(5)
