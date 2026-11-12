import secrets
from datetime import timedelta, timezone
from uuid import uuid4
from fastapi import HTTPException
from psycopg.types.json import Jsonb
from api.agenda.db import connection,lock_agenda,expire,audit
from api.agenda.schedule import available,ZONE
from api.agenda.security import digest
from api.agenda.customers import save_customer

def service_by_id(conn,id,active=True):
    service=conn.execute("SELECT * FROM agenda_services WHERE id=%s",(id,)).fetchone()
    if not service or (active and not service["active"]):
        raise HTTPException(404,"Tratamiento no disponible")
    service.pop("deleted_at",None)
    return service

def checked_start(value):
    if value.tzinfo is None:
        raise HTTPException(422,"La fecha debe incluir zona horaria")
    return value.astimezone(timezone.utc)

def queue_notifications(conn,booking,kind="confirmation"):
    conn.execute("UPDATE agenda_jobs SET status='cancelled' WHERE booking_id=%s AND status='queued'",(booking["id"],))
    conn.execute("""INSERT INTO agenda_jobs(booking_id,revision,kind,due_at) VALUES(%s,%s,%s,now())
      ON CONFLICT DO NOTHING""",(booking["id"],booking["revision"],kind))
    hours=booking["snapshot"].get("reminder_hours")
    if hours and kind!="cancellation":
        conn.execute("""INSERT INTO agenda_jobs(booking_id,revision,kind,due_at)
          SELECT %s,%s,'reminder',%s::timestamptz-%s*interval '1 hour'
          WHERE %s::timestamptz-%s*interval '1 hour'>now() ON CONFLICT DO NOTHING""",
          (booking["id"],booking["revision"],booking["starts_at"],hours,booking["starts_at"],hours))

def create_booking(body,manual=False):
    start=checked_start(body.starts_at)
    token=secrets.token_urlsafe(32)
    id=uuid4()
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        service=service_by_id(conn,body.service_id)
        if service["version"]!=body.service_version:
            raise HTTPException(409,"Cambió el tratamiento. Recarga y revisa los cuidados y precios.")
        if not manual and not body.accepted_care:
            raise HTTPException(422,"Debes aceptar los cuidados previos")
        slots=available(conn,start.astimezone(ZONE).date(),service,public=not manual)
        slot=next((s for s in slots if s["starts_at"]==start),None)
        if not slot:
            raise HTTPException(409,"El horario ya no está disponible")
        cfg=conn.execute("SELECT * FROM agenda_settings WHERE id=1").fetchone()
        snapshot=dict(service,professional=cfg["professional"])
        row=conn.execute("""INSERT INTO agenda_bookings(id,token_hash,service_id,starts_at,ends_at,occupied_until,
          status,expires_at,customer,snapshot,accepted_at,source,notes)
          VALUES(%s,%s,%s,%s,%s,%s,%s,CASE WHEN %s THEN NULL ELSE clock_timestamp()+%s*interval '1 minute' END,
          %s,%s,CASE WHEN %s THEN now() ELSE NULL END,%s,%s) RETURNING *""",
          (id,digest(token),service["id"],slot["starts_at"],slot["ends_at"],slot["occupied_until"],
           "confirmed" if manual else "held",manual,cfg["hold_minutes"],Jsonb(body.customer.model_dump(mode="json")),Jsonb(snapshot),
           body.accepted_care,"admin" if manual else "web",body.notes if manual else "")).fetchone()
        customer_data=body.customer.model_dump()
        profile=save_customer(conn,customer_data,
            getattr(body,"customer_id",None) if manual else None,
            getattr(body,"customer_version",None) if manual else None)
        conn.execute("UPDATE agenda_bookings SET customer_id=%s WHERE id=%s",(profile["id"],id))
        if manual:
            queue_notifications(conn,row)
        audit(conn,"booking.created",id,"manual" if manual else "web")
    return {"id":str(id),"token":token,"status":row["status"],"expires_at":row["expires_at"]}

def public_booking(token):
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        b=conn.execute("SELECT * FROM agenda_bookings WHERE token_hash=%s",(digest(token),)).fetchone()
        if not b:
            raise HTTPException(404,"Reserva no encontrada")
        payment=conn.execute("SELECT status,amount,reference FROM agenda_payments WHERE booking_id=%s",(b["id"],)).fetchone()
        return {"id":b["id"],"status":b["status"],"starts_at":b["starts_at"],"ends_at":b["ends_at"],
          "expires_at":b["expires_at"],"treatment":b["snapshot"]["name"],
          "price":b["snapshot"]["price"],"deposit":b["snapshot"]["deposit"],"care":b["snapshot"]["care"],"payment":payment}
