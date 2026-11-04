from __future__ import annotations
from typing import Optional
import secrets
from datetime import date, datetime, timedelta
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from starlette.concurrency import run_in_threadpool
from psycopg.types.json import Jsonb
from api.agenda.worker import dispatch_booking,run_batch
from api.agenda.config import config
from api.agenda.db import connection,lock_agenda,expire,audit
from api.agenda.security import require_admin,same_origin,digest,rate_limit
from api.agenda.setup import hash_password
from api.agenda.schemas import (BookingRequest,ScheduleChange,ServiceChange,MoveRequest,CancelRequest,BlockRequest,LoginRequest,SettingsChange)
from api.agenda.schedule import available, candidates, ZONE
from api.agenda.booking import create_booking,public_booking,service_by_id,checked_start,queue_notifications
from api.agenda.payments import checkout,apply_event

router=APIRouter(prefix="/api/agenda")
admin=APIRouter(prefix="/admin",dependencies=[Depends(require_admin)])

@router.get("/catalog")
def catalog():
    with connection() as conn:
        cfg=conn.execute("SELECT * FROM agenda_settings WHERE id=1").fetchone()
        services=conn.execute("""SELECT id,name,price,deposit,duration,care,version FROM agenda_services
          WHERE active ORDER BY id""").fetchall()
    return {"services":services,"settings":cfg,"payment_mode":config.agenda_payment_mode,"timezone":"America/Santiago"}

@router.get("/availability")
def availability(day:date,service_id:int):
    with connection() as conn:
        return available(conn,day,service_by_id(conn,service_id))

@router.post("/bookings",status_code=201,dependencies=[Depends(same_origin)])
def book(body:BookingRequest,request:Request):
    rate_limit("hold:"+request.client.host,20,3600)
    return create_booking(body)

@router.get("/bookings/{token}")
def get_booking(token:str):
    return public_booking(token)

@router.post("/bookings/{token}/checkout",dependencies=[Depends(same_origin)])
async def pay(token:str):
    return await checkout(token)

@router.post("/bookings/{token}/simulate",dependencies=[Depends(same_origin)])
def simulate(token:str,result:str=Query(pattern="^(completed|failed|pending)$")):
    if config.agenda_env=="production" or config.agenda_payment_mode!="mock":
        raise HTTPException(404)
    with connection() as conn:
        p=conn.execute("""SELECT p.* FROM agenda_payments p JOIN agenda_bookings b ON b.id=p.booking_id
          WHERE b.token_hash=%s""",(digest(token),)).fetchone()
    if not p:
        raise HTTPException(404,"Intento no encontrado")
    apply_event({"x_reference":p["reference"],"x_amount":str(p["amount"]),"x_result":result},simulated=True)
    return {"ok":True}

@router.post("/tuu/callback")
async def callback(request:Request):
    from urllib.parse import parse_qs
    body=await request.body()
    if len(body)>16384:
        raise HTTPException(413)
    try:
        parsed=parse_qs(body.decode("utf-8"),keep_blank_values=True,strict_parsing=True,max_num_fields=50)
        if any(len(v)!=1 for v in parsed.values()):
            raise ValueError()
        payload={k:v[0] for k,v in parsed.items()}
    except (ValueError,UnicodeError):
        raise HTTPException(400,"Callback malformado")
    booking_id=await run_in_threadpool(apply_event,payload)
    await run_in_threadpool(dispatch_booking,booking_id)
    return Response("OK",media_type="text/plain")

@router.post("/login",dependencies=[Depends(same_origin)])
def login(body:LoginRequest,request:Request,response:Response):
    rate_limit("login:"+request.client.host,10,900)
    with connection() as conn:
        account=conn.execute("SELECT password_hash FROM agenda_admin WHERE id=1").fetchone()
        expected=account["password_hash"] if account else "00"*16+":"+ "00"*64
        actual=hash_password(body.password,expected.split(":")[0])
        if not secrets.compare_digest(actual,expected):
            raise HTTPException(401,"Contraseña incorrecta")
        token=secrets.token_urlsafe(32)
        conn.execute("DELETE FROM agenda_sessions WHERE expires_at<now()")
        conn.execute("INSERT INTO agenda_sessions VALUES(%s,now()+interval '8 hours')",(digest(token),))
    response.set_cookie("agenda_session",token,max_age=28800,httponly=True,
      secure=config.agenda_env=="production",samesite="strict",path="/api/agenda")
    return {"ok":True}

@admin.get("/session")
def session():
    return {"ok":True}

@admin.post("/logout")
def logout(request:Request,response:Response):
    with connection() as conn:
        conn.execute("DELETE FROM agenda_sessions WHERE token_hash=%s",(digest(request.cookies.get("agenda_session","")),))
    response.delete_cookie("agenda_session",path="/api/agenda")
    return {"ok":True}

@admin.get("/services")
def services():
    with connection() as conn:
        return conn.execute("SELECT * FROM agenda_services ORDER BY id").fetchall()

@admin.put("/services/{id}")
def edit_service(id:int,body:ServiceChange):
    with connection() as conn:
        service_by_id(conn,id,active=False)
        data=body.model_dump()
        conn.execute("""UPDATE agenda_services SET name=%(name)s,price=%(price)s,deposit=%(deposit)s,
          duration=%(duration)s,care=%(care)s,confirmation=%(confirmation)s,reminder=%(reminder)s,
          reminder_hours=%(reminder_hours)s,active=%(active)s,version=version+1 WHERE id=%(id)s""",dict(data,id=id))
        audit(conn,"service.updated",id)
    return {"ok":True}

@admin.post("/services",status_code=201)
def add_service(body:ServiceChange):
    with connection() as conn:
        row=conn.execute("""INSERT INTO agenda_services(name,price,deposit,duration,care,confirmation,reminder,reminder_hours,active)
          VALUES(%(name)s,%(price)s,%(deposit)s,%(duration)s,%(care)s,%(confirmation)s,%(reminder)s,%(reminder_hours)s,%(active)s)
          RETURNING id""",body.model_dump()).fetchone()
        audit(conn,"service.created",row["id"])
    return row

@admin.get("/settings")
def get_settings():
    with connection() as conn:
        return conn.execute("SELECT * FROM agenda_settings WHERE id=1").fetchone()

@admin.put("/settings")
def settings(body:SettingsChange):
    with connection() as conn:
        lock_agenda(conn)
        conn.execute("""UPDATE agenda_settings SET professional=%(professional)s,notice_hours=%(notice_hours)s,
          horizon_days=%(horizon_days)s,hold_minutes=%(hold_minutes)s WHERE id=1""",body.model_dump())
        audit(conn,"settings.updated",1)
    return {"ok":True}

@admin.get("/schedule")
def schedule():
    with connection() as conn:
        return conn.execute("SELECT * FROM agenda_schedule ORDER BY specific_date NULLS LAST,weekday,effective_from DESC").fetchall()

@admin.post("/schedule")
def save_schedule(body:ScheduleChange,preview:bool=True):
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        plan=Jsonb(body.plan.model_dump())
        if body.specific_date:
            conn.execute("""INSERT INTO agenda_schedule(specific_date,effective_from,plan) VALUES(%s,%s,%s)
              ON CONFLICT(specific_date) WHERE specific_date IS NOT NULL DO UPDATE SET plan=excluded.plan""",
              (body.specific_date,body.specific_date,plan))
        else:
            for day in set(body.weekdays):
                conn.execute("""INSERT INTO agenda_schedule(weekday,effective_from,plan) VALUES(%s,%s,%s)
                  ON CONFLICT(weekday,effective_from) WHERE weekday IS NOT NULL DO UPDATE SET plan=excluded.plan""",
                  (day,body.effective_from,plan))
        conflicts=[]
        bookings=conn.execute("""SELECT * FROM agenda_bookings WHERE status IN ('held','confirmed')
          AND starts_at>now() ORDER BY starts_at""").fetchall()
        for b in bookings:
            day=b["starts_at"].astimezone(ZONE).date()
            target=day==body.specific_date if body.specific_date else day>=body.effective_from and day.weekday() in body.weekdays
            if not target:
                continue
            fits=any(s["starts_at"]==b["starts_at"] and s["ends_at"]==b["ends_at"] and s["occupied_until"]==b["occupied_until"]
              for s in candidates(conn,day,b["snapshot"]))
            if not fits:
                conflicts.append({"id":b["id"],"starts_at":b["starts_at"],"name":b["customer"].get("first_name","")})
        if conflicts or preview:
            conn.rollback()
            return {"saved":False,"conflicts":conflicts,"preview":True}
        audit(conn,"schedule.updated",body.specific_date or str(body.weekdays),body.effective_from.isoformat())
    return {"saved":True,"conflicts":[]}

@admin.get("/availability")
def admin_availability(day:date,service_id:int,exclude:Optional[UUID]=None):
    with connection() as conn:
        service=service_by_id(conn,service_id,active=False)
        if exclude:
            booking=conn.execute("SELECT snapshot FROM agenda_bookings WHERE id=%s AND service_id=%s AND status='confirmed'",(exclude,service_id)).fetchone()
            if not booking:
                raise HTTPException(404,"Reserva no encontrada")
            service=booking["snapshot"]
        return available(conn,day,service,public=False,exclude=exclude)

@admin.get("/bookings")
def list_bookings(start:date,end:date):
    if end<start or (end-start).days>62:
        raise HTTPException(422,"Consulta un máximo de 62 días")
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        rows=conn.execute("""SELECT b.*,p.status AS payment_status,p.amount AS payment_amount,p.reference
          FROM agenda_bookings b LEFT JOIN agenda_payments p ON p.booking_id=b.id
          WHERE (b.starts_at AT TIME ZONE 'America/Santiago')::date<=%s
          AND (b.occupied_until AT TIME ZONE 'America/Santiago')::date>=%s ORDER BY b.starts_at""",(end,start)).fetchall()
        for row in rows:
            row.pop("token_hash",None)
            row.pop("unused",None)
        return rows

@admin.post("/bookings",status_code=201)
def manual(body:BookingRequest):
    booking=create_booking(body,manual=True)
    dispatch_booking(booking["id"])
    return booking

@admin.post("/blocks",status_code=201)
def block(body:BlockRequest):
    start,end=checked_start(body.starts_at),checked_start(body.ends_at)
    if start>=end or end-start>timedelta(days=31):
        raise HTTPException(422,"Intervalo inválido (máximo 31 días)")
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        if conn.execute("""SELECT 1 FROM agenda_bookings WHERE status IN ('held','confirmed','blocked')
          AND starts_at<%s AND occupied_until>%s""",(end,start)).fetchone():
            raise HTTPException(409,"El bloqueo se superpone con una cita o retención")
        id=uuid4()
        conn.execute("""INSERT INTO agenda_bookings(id,token_hash,starts_at,ends_at,occupied_until,status,customer,snapshot,source,notes)
          VALUES(%s,%s,%s,%s,%s,'blocked','{}','{}','admin',%s)""",
          (id,digest(secrets.token_urlsafe(32)),start,end,end,body.reason))
        audit(conn,"block.created",id)
    return {"id":id}

@admin.post("/bookings/{id}/cancel")
def cancel(id:UUID,body:CancelRequest):
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        b=conn.execute("SELECT * FROM agenda_bookings WHERE id=%s FOR UPDATE",(id,)).fetchone()
        if not b or b["revision"]!=body.revision:
            raise HTTPException(409,"La reserva cambió; actualiza la agenda")
        if b["status"] not in {"held","confirmed","blocked"}:
            raise HTTPException(409,"La reserva ya no está activa")
        previous=b["status"]
        b=conn.execute("UPDATE agenda_bookings SET status='cancelled',revision=revision+1 WHERE id=%s RETURNING *",(id,)).fetchone()
        if previous=="confirmed":
            queue_notifications(conn,b,"cancellation")
        audit(conn,"booking.cancelled",id,body.reason)
    dispatch_booking(id)
    return {"ok":True,"message":"Reserva cancelada. No se realizó devolución automática de dinero."}

@admin.post("/bookings/{id}/move")
def move(id:UUID,body:MoveRequest):
    start=checked_start(body.starts_at)
    with connection() as conn:
        lock_agenda(conn)
        expire(conn)
        b=conn.execute("SELECT * FROM agenda_bookings WHERE id=%s FOR UPDATE",(id,)).fetchone()
        if not b or b["status"]!="confirmed" or b["revision"]!=body.revision:
            raise HTTPException(409,"La reserva cambió o no está confirmada")
        slots=available(conn,start.astimezone(ZONE).date(),b["snapshot"],public=False,exclude=id)
        slot=next((s for s in slots if s["starts_at"]==start),None)
        if not slot:
            raise HTTPException(409,"Horario no disponible")
        b=conn.execute("""UPDATE agenda_bookings SET starts_at=%s,ends_at=%s,occupied_until=%s,
          revision=revision+1 WHERE id=%s RETURNING *""",
          (slot["starts_at"],slot["ends_at"],slot["occupied_until"],id)).fetchone()
        queue_notifications(conn,b,"update")
        audit(conn,"booking.moved",id,start.isoformat())
    dispatch_booking(id)
    return {"ok":True}

@admin.get("/operations")
def operations():
    with connection() as conn:
        return {"jobs":conn.execute("""SELECT j.*,b.customer->>'email' AS email FROM agenda_jobs j
          JOIN agenda_bookings b ON b.id=j.booking_id ORDER BY j.id DESC LIMIT 100""").fetchall(),
          "incidents":conn.execute("""SELECT p.reference,p.status AS payment_status,b.id,b.status,b.starts_at
          FROM agenda_payments p JOIN agenda_bookings b ON b.id=p.booking_id
          WHERE p.status IN ('unknown','creating') OR b.status='payment_review' ORDER BY p.created_at DESC LIMIT 100""").fetchall(),
          "audit":conn.execute("SELECT * FROM agenda_audit ORDER BY id DESC LIMIT 100").fetchall(),
          "mail_mode":config.agenda_mail_mode}

@router.get("/jobs/run")
def process_mail_jobs(request:Request):
    secret=config.cron_secret.get_secret_value()
    expected="Bearer "+secret
    if not secret or not secrets.compare_digest(request.headers.get("authorization",""),expected):
        raise HTTPException(401,"No autorizado")
    return {"processed":run_batch()}


router.include_router(admin)
