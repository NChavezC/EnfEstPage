import hashlib
import json
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException
from api.agenda.config import config
from api.agenda.db import connection,lock_agenda,expire,audit
from api.agenda.security import digest
from api.agenda.booking import queue_notifications
from api.config import settings
from api.payment import build_payment_payload
from api.schemas import PaymentRequest
from api.tuu import generate_signature,verify_signature

def apply_event(payload,simulated=False):
    if not simulated:
        if not verify_signature(payload) or payload.get("x_account_id")!=settings.tuu_account_id:
            raise HTTPException(400,"Firma o cuenta TUU inválida")
        if payload.get("x_currency")!="CLP":
            raise HTTPException(400,"Moneda inválida")
    reference=payload.get("x_reference","")
    result=payload.get("x_result","unknown")
    event_hash=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        p=conn.execute("SELECT * FROM agenda_payments WHERE reference=%s FOR UPDATE",(reference,)).fetchone()
        if not p:
            raise HTTPException(400,"Referencia desconocida")
        try:
            if Decimal(str(payload.get("x_amount","")))!=p["amount"]:
                raise HTTPException(400,"Importe distinto del intento de pago")
        except InvalidOperation:
            raise HTTPException(400,"Importe inválido")
        b=conn.execute("SELECT * FROM agenda_bookings WHERE id=%s FOR UPDATE",(p["booking_id"],)).fetchone()
        if not conn.execute("""INSERT INTO agenda_payment_events(hash,reference,result) VALUES(%s,%s,%s)
          ON CONFLICT DO NOTHING RETURNING hash""",(event_hash,reference,result)).fetchone():
            return b["id"]
        if p["status"]=="completed":
            return
        if result=="completed":
            conn.execute("UPDATE agenda_payments SET status='completed',provider_transaction=%s WHERE reference=%s",
              (payload.get("x_gateway_reference"),reference))
            if b["status"]=="held":
                b=conn.execute("UPDATE agenda_bookings SET status='confirmed',expires_at=NULL WHERE id=%s RETURNING *",(b["id"],)).fetchone()
                queue_notifications(conn,b)
            elif b["status"]!="confirmed":
                conn.execute("UPDATE agenda_bookings SET status='payment_review' WHERE id=%s",(b["id"],))
                audit(conn,"payment.review",b["id"],"Pago recibido sin cupo vigente")
        elif result in {"failed","cancelled"}:
            conn.execute("UPDATE agenda_payments SET status=%s WHERE reference=%s",(result,reference))
            conn.execute("UPDATE agenda_bookings SET status='cancelled' WHERE id=%s AND status='held'",(b["id"],))
        elif p["status"] not in {"failed","cancelled"}:
            conn.execute("UPDATE agenda_payments SET status='pending' WHERE reference=%s",(reference,))
        audit(conn,"payment.event",reference,result)
    return b["id"]

async def checkout(token):
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        b=conn.execute("SELECT * FROM agenda_bookings WHERE token_hash=%s FOR UPDATE",(digest(token),)).fetchone()
        if not b:
            raise HTTPException(404,"Reserva no encontrada")
        if b["status"]!="held":
            raise HTTPException(409,"Esta reserva no está retenida")
        previous=conn.execute("SELECT * FROM agenda_payments WHERE booking_id=%s",(b["id"],)).fetchone()
        if previous:
            if previous["checkout_url"] and previous["status"] in {"ready","pending"}:
                return {"checkout_url":previous["checkout_url"]}
            raise HTTPException(409,"Ya existe un intento. Consulta su estado antes de volver a pagar.")
        reference="RESERVA-"+b["id"].hex.upper()
        conn.execute("INSERT INTO agenda_payments(reference,booking_id,amount,status) VALUES(%s,%s,%s,'creating')",
          (reference,b["id"],b["snapshot"]["deposit"]))
    if config.agenda_payment_mode=="mock":
        url=f"/reservar/resultado?token={token}&simulacion=1"
    else:
        payload=build_payment_payload(PaymentRequest(**b["customer"]),config.agenda_public_url)
        payload.update(x_reference=reference,x_amount=b["snapshot"]["deposit"],
          x_description="Reserva "+b["snapshot"]["name"],
          x_url_callback=config.agenda_public_url.rstrip("/")+"/api/agenda/tuu/callback",
          x_url_cancel=config.agenda_public_url.rstrip("/")+"/reservar/resultado?token="+token,
          x_url_complete=config.agenda_public_url.rstrip("/")+"/reservar/resultado?token="+token)
        payload["x_signature"]=generate_signature(payload)
        try:
            async with httpx.AsyncClient(timeout=15,follow_redirects=False) as client:
                response=await client.post(settings.tuu_payment_url,json=payload,headers={"X-REDIRECT":"false"})
            response.raise_for_status()
            url=response.text.strip()
            parsed=urlparse(url)
            if parsed.scheme!="https" or not parsed.hostname:
                raise ValueError("URL de pago inválida")
        except (httpx.HTTPError,ValueError):
            with connection() as conn:
                conn.execute("UPDATE agenda_payments SET status='unknown' WHERE reference=%s AND status='creating'",(reference,))
            raise HTTPException(502,"No pudimos determinar si TUU creó el pago. Consulta la reserva; no inicies otro cobro.")
    with connection() as conn:
        conn.execute("""UPDATE agenda_payments SET checkout_url=%s,
          status=CASE WHEN status='creating' THEN 'ready' ELSE status END WHERE reference=%s""",(url,reference))
    return {"checkout_url":url}
