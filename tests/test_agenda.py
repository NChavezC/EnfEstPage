"""Integration tests use a dedicated PostgreSQL database, never development data."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,date,timedelta,timezone
from urllib.parse import urlencode
import pytest
import psycopg
from fastapi.testclient import TestClient

os.environ["AGENDA_ENV"]="test"
os.environ["AGENDA_MAIL_MODE"]="file"
os.environ["AGENDA_MAIL_DISPATCH"]="worker"
os.environ["AGENDA_PAYMENT_MODE"]="mock"
from api.agenda.config import config
TEST_DATABASE="enfest_agenda_test"
original=config.database_url.get_secret_value()
from psycopg.conninfo import conninfo_to_dict,make_conninfo
test_url=make_conninfo(original,dbname=TEST_DATABASE)
with psycopg.connect(original,dbname="postgres",autocommit=True) as root:
    if not root.execute("SELECT 1 FROM pg_database WHERE datname=%s",(TEST_DATABASE,)).fetchone():
        root.execute('CREATE DATABASE enfest_agenda_test')
from pydantic import SecretStr
config.database_url=SecretStr(test_url)
from api.agenda.db import connection
from api.agenda.setup import initialize,hash_password
from api.agenda.schedule import candidates,available,local_instant,ZONE
from api.agenda.schemas import Plan,BookingRequest
from api.agenda.booking import create_booking
from api.agenda.payments import apply_event
from api.agenda.worker import run_once
from api.index import app
from api.tuu import generate_signature
from api.config import settings

ORIGIN={"Origin":"http://localhost:5173"}
client=TestClient(app,headers=ORIGIN)

@pytest.fixture(autouse=True)
def clean():
    with connection() as c:
        tables=c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'agenda_%'").fetchall()
        for table in tables:
            # Names only from own catalog, quoted using psycopg's SQL API.
            from psycopg import sql
            c.execute(sql.SQL("DROP TABLE {} CASCADE").format(sql.Identifier(table["tablename"])))
    initialize()
    with connection() as c:
        c.execute("UPDATE agenda_admin SET password_hash=%s",(hash_password("test-password"),))
    client.cookies.clear()
    yield

def future_monday():
    d=datetime.now(ZONE).date()+timedelta(days=14)
    return d+timedelta(days=(-d.weekday())%7)

def slot(day=None,index=0,public=True):
    with connection() as c:
        s=c.execute("SELECT * FROM agenda_services ORDER BY id LIMIT 1").fetchone()
        slots=available(c,day or future_monday(),s,public=public)
        return s,slots[index]

def request_body(day=None,index=0):
    s,t=slot(day,index)
    return {"service_id":s["id"],"service_version":s["version"],"starts_at":t["starts_at"].isoformat(),
      "customer":{"first_name":"Prueba","last_name":"Agenda","email":"prueba@example.invalid","phone":"+56912345678"},
      "accepted_care":True}

def reserve():
    r=client.post("/api/agenda/bookings",json=request_body())
    assert r.status_code==201,r.text
    return r.json()

def login():
    r=client.post("/api/agenda/login",json={"password":"test-password"})
    assert r.status_code==200,r.text

def payment(token):
    r=client.post(f"/api/agenda/bookings/{token}/checkout")
    assert r.status_code==200,r.text
    with connection() as c:
        return c.execute("SELECT * FROM agenda_payments ORDER BY created_at DESC LIMIT 1").fetchone()

def event(p,result="completed"):
    return {"x_reference":p["reference"],"x_amount":str(p["amount"]),"x_result":result}

def test_week_is_exact_and_saturday_preserved():
    with connection() as c:
        s=c.execute("SELECT * FROM agenda_services LIMIT 1").fetchone()
        week=[candidates(c,future_monday()+timedelta(days=i),s) for i in range(7)]
    assert [len(d) for d in week]==[3,3,4,4,4,2,0]
    assert sum(len(d) for d in week)==20
    assert week[5][0]["starts_at"].strftime("%H:%M")=="09:20"
    assert week[2][-1]["ends_at"]==week[2][-1]["occupied_until"]
    assert week[0][1]["occupied_until"].strftime("%H:%M")=="16:20"
    assert week[0][2]["starts_at"].strftime("%H:%M")=="16:40"

def test_concurrent_twenty_requests_one_wins():
    body=BookingRequest(**request_body())
    def attempt(_):
        from fastapi import HTTPException
        try:
            return create_booking(body)["status"]
        except HTTPException as e:
            return e.status_code
    with ThreadPoolExecutor(max_workers=20) as pool:
        results=list(pool.map(attempt,range(20)))
    assert results.count("held")==1
    assert results.count(409)==19

def test_database_rejects_partial_overlap():
    b=reserve()
    with pytest.raises(psycopg.errors.ExclusionViolation):
        with connection() as c:
            c.execute("""INSERT INTO agenda_bookings(id,token_hash,starts_at,ends_at,occupied_until,status,customer,snapshot,source)
              SELECT gen_random_uuid(),'different-token',starts_at+interval '30 minutes',ends_at,occupied_until,'blocked','{}','{}','test'
              FROM agenda_bookings WHERE id=%s""",(b["id"],))

def test_callbacks_idempotent_and_monotonic():
    b=reserve();p=payment(b["token"])
    for _ in range(10):
        apply_event(event(p),simulated=True)
    apply_event(event(p,"pending"),simulated=True)
    result=client.get("/api/agenda/bookings/"+b["token"]).json()
    assert result["status"]=="confirmed"
    assert result["payment"]["status"]=="completed"
    with connection() as c:
        assert c.execute("SELECT count(*) AS n FROM agenda_jobs").fetchone()["n"]==1

def test_expiration_releases_and_late_payment_never_takes_new_claim():
    first=reserve();p=payment(first["token"])
    with connection() as c:
        c.execute("UPDATE agenda_bookings SET expires_at=now()-interval '1 second' WHERE id=%s",(first["id"],))
    second=reserve()
    apply_event(event(p),simulated=True)
    assert client.get("/api/agenda/bookings/"+first["token"]).json()["status"]=="payment_review"
    assert client.get("/api/agenda/bookings/"+second["token"]).json()["status"]=="held"

def test_wrong_signature_or_amount_no_confirmation():
    b=reserve();p=payment(b["token"])
    payload=dict(event(p),x_account_id=settings.tuu_account_id,x_currency="CLP",x_signature="invalid")
    r=client.post("/api/agenda/tuu/callback",content=urlencode(payload))
    assert r.status_code==400
    payload["x_amount"]="1";payload["x_signature"]=generate_signature(payload)
    assert client.post("/api/agenda/tuu/callback",content=urlencode(payload)).status_code==400
    payload["x_amount"]=str(p["amount"]);payload["x_signature"]=generate_signature(payload)
    assert client.post("/api/agenda/tuu/callback",content=urlencode(payload)).status_code==200
    assert client.get("/api/agenda/bookings/"+b["token"]).json()["status"]=="confirmed"

def test_duplicate_callback_parameters_rejected():
    assert client.post("/api/agenda/tuu/callback",content="x_result=completed&x_result=failed").status_code==400

def test_admin_requires_cookie_and_origin():
    assert client.get("/api/agenda/admin/bookings",params={"start":future_monday(),"end":future_monday()}).status_code==401
    assert client.post("/api/agenda/login",json={"password":"bad"}).status_code==401
    login()
    assert client.post("/api/agenda/admin/logout",headers={"Origin":"https://evil.invalid"}).status_code==403
    assert client.get("/api/agenda/admin/session").status_code==200
    client.post("/api/agenda/admin/logout")
    assert client.get("/api/agenda/admin/session").status_code==401

def test_changed_care_requires_fresh_acceptance_snapshot_preserved():
    b=reserve();login()
    services=client.get("/api/agenda/admin/services").json()
    s=services[0];s.pop("version");id=s.pop("id");s["care"]="NUEVOS CUIDADOS";s["price"]=30000
    assert client.put("/api/agenda/admin/services/"+str(id),json=s).status_code==200
    assert client.get("/api/agenda/bookings/"+b["token"]).json()["care"]=="CUIDADOS PREVIOS"
    body=request_body(index=0);body["service_version"]=1
    assert client.post("/api/agenda/bookings",json=body).status_code==409

def test_schedule_preview_conflicts_and_group_edit():
    reserve();login()
    body={"weekdays":[0,1],"effective_from":future_monday().isoformat(),"plan":{"closed":True}}
    result=client.post("/api/agenda/admin/schedule?preview=false",json=body).json()
    assert result["conflicts"] and not result["saved"]
    with connection() as c:
        assert len(candidates(c,future_monday(),c.execute("SELECT * FROM agenda_services LIMIT 1").fetchone()))==3
    body["effective_from"]=(future_monday()+timedelta(days=7)).isoformat()
    assert client.post("/api/agenda/admin/schedule",json=body).json()["preview"]
    assert client.post("/api/agenda/admin/schedule?preview=false",json=body).json()["saved"]

def test_date_exception_supersedes_week():
    login()
    day=future_monday()
    r=client.post("/api/agenda/admin/schedule?preview=false",json={"specific_date":str(day),"effective_from":str(day),"plan":{"closed":True}})
    assert r.json()["saved"]
    s,_=slot(day+timedelta(days=1))
    assert client.get("/api/agenda/availability",params={"day":str(day),"service_id":s["id"]}).json()==[]

def test_invalid_plan_rejects_overlap_and_closing():
    with pytest.raises(ValueError):
        Plan(starts=["09:00","10:00"])
    with pytest.raises(ValueError):
        Plan(starts=["19:00"],shift_end="20:00")
    assert Plan(starts=["09:20","11:30"],shift_end="13:30").starts[0]=="09:20"

def test_manual_reserve_move_cancel_and_jobs():
    login();body=request_body();body["accepted_care"]=False
    b=client.post("/api/agenda/admin/bookings",json=body).json()
    assert b["status"]=="confirmed"
    target=request_body(index=0)["starts_at"]
    assert client.post("/api/agenda/admin/bookings/"+b["id"]+"/move",json={"starts_at":target,"revision":1}).status_code==200
    with connection() as c:
        assert c.execute("SELECT count(*) AS n FROM agenda_jobs WHERE status='queued'").fetchone()["n"]==1
    assert client.post("/api/agenda/admin/bookings/"+b["id"]+"/cancel",json={"revision":1,"reason":"Prueba"}).status_code==409
    assert client.post("/api/agenda/admin/bookings/"+b["id"]+"/cancel",json={"revision":2,"reason":"Prueba"}).status_code==200
    assert client.get("/api/agenda/bookings/"+b["token"]).json()["status"]=="cancelled"

def test_outbox_survives_new_connection_and_skips_old_revision():
    b=reserve();p=payment(b["token"]);apply_event(event(p),simulated=True)
    assert run_once()
    assert not run_once()
    with connection() as c:
        assert c.execute("SELECT status FROM agenda_jobs").fetchone()["status"]=="saved_local"

def test_reminder_disabled_and_due_rule():
    b=reserve();p=payment(b["token"]);apply_event(event(p),simulated=True)
    with connection() as c:
        assert c.execute("SELECT count(*) AS n FROM agenda_jobs WHERE kind='reminder'").fetchone()["n"]==0

def test_dst_and_thirteen_real_hours():
    # Chile's UTC offset changes between seasons; nonexistent midnight is rejected.
    assert local_instant(date(2026,7,1),"09:00").utcoffset()!=local_instant(date(2026,12,1),"09:00").utcoffset()
    with pytest.raises(ValueError):
        local_instant(date(2026,9,6),"00:30")
    with connection() as c:
        s=c.execute("SELECT * FROM agenda_services LIMIT 1").fetchone()
        c.execute("UPDATE agenda_settings SET notice_hours=720")
        assert available(c,future_monday(),s)==[]
        assert available(c,future_monday(),s,public=False)

def test_multiday_block_hides_next_day():
    login();day=future_monday()
    r=client.post("/api/agenda/admin/blocks",json={"starts_at":local_instant(day,"08:00").isoformat(),"ends_at":local_instant(day+timedelta(days=1),"12:00").isoformat(),"reason":"Ausencia"})
    assert r.status_code==201,r.text
    s,_=slot(day+timedelta(days=1))
    slots=client.get("/api/agenda/availability",params={"day":str(day+timedelta(days=1)),"service_id":s["id"]}).json()
    assert len(slots)==1
    assert datetime.fromisoformat(slots[0]["starts_at"]).strftime("%H:%M")=="13:40"

def test_no_acceptance_no_hold_and_unknown_token_private():
    body=request_body();body["accepted_care"]=False
    assert client.post("/api/agenda/bookings",json=body).status_code==422
    assert client.get("/api/agenda/bookings/guess").status_code==404

def test_uncertain_checkout_is_not_retried(monkeypatch):
    import httpx
    b=reserve()
    calls=[]
    class Uncertain:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,*args,**kwargs):
            calls.append(kwargs["json"]["x_reference"])
            raise httpx.ReadTimeout("test")
    monkeypatch.setattr(config,"agenda_payment_mode","tuu")
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kwargs:Uncertain())
    r=client.post("/api/agenda/bookings/"+b["token"]+"/checkout")
    assert r.status_code==502
    assert client.get("/api/agenda/bookings/"+b["token"]).json()["payment"]["status"]=="unknown"
    assert client.post("/api/agenda/bookings/"+b["token"]+"/checkout").status_code==409
    assert len(calls)==1

def test_callback_before_checkout_response_stays_completed(monkeypatch):
    import httpx
    b=reserve()
    class FastCallback:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,*args,**kwargs):
            payload=kwargs["json"]
            apply_event({"x_reference":payload["x_reference"],"x_amount":str(payload["x_amount"]),"x_result":"completed"},simulated=True)
            return httpx.Response(200,text="https://checkout.example.invalid/test",request=httpx.Request("POST","https://example.invalid"))
    monkeypatch.setattr(config,"agenda_payment_mode","tuu")
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kwargs:FastCallback())
    assert client.post("/api/agenda/bookings/"+b["token"]+"/checkout").status_code==200
    data=client.get("/api/agenda/bookings/"+b["token"]).json()
    assert data["payment"]["status"]=="completed"
    assert data["status"]=="confirmed"

def test_manual_email_uses_actual_unpaid_balance():
    from api.agenda.config import ROOT
    login()
    with connection() as c:
        c.execute("UPDATE agenda_services SET confirmation='Saldo pendiente: {saldo}',reminder_hours=24 WHERE id=1")
    b=client.post("/api/agenda/admin/bookings",json=request_body()).json()
    assert b["status"]=="confirmed"
    with connection() as c:
        assert c.execute("SELECT count(*) AS n FROM agenda_jobs WHERE kind='reminder'").fetchone()["n"]==1
        job=c.execute("SELECT id FROM agenda_jobs WHERE kind='confirmation'").fetchone()["id"]
    assert run_once()
    from email import message_from_bytes
    mail=message_from_bytes((ROOT/".agenda-local"/"test-emails"/f"{job}.eml").read_bytes())
    assert "28000" in mail.get_payload(decode=True).decode()

def test_conflicting_move_preserves_original_reservation():
    login()
    first=client.post("/api/agenda/admin/bookings",json=request_body()).json()
    other_body=request_body()
    second=client.post("/api/agenda/admin/bookings",json=other_body).json()
    original=client.get("/api/agenda/bookings/"+first["token"]).json()["starts_at"]
    result=client.post("/api/agenda/admin/bookings/"+first["id"]+"/move",json={"starts_at":other_body["starts_at"],"revision":1})
    assert result.status_code==409
    assert client.get("/api/agenda/bookings/"+first["token"]).json()["starts_at"]==original
    assert client.get("/api/agenda/bookings/"+second["token"]).json()["status"]=="confirmed"


def test_request_dispatch_confirmation_move_cancel_without_worker(monkeypatch):
    from api.agenda import worker
    sent=[]
    monkeypatch.setattr(config,"agenda_mail_dispatch","request")
    monkeypatch.setattr(worker,"deliver",lambda job,b: sent.append((job["kind"],b["revision"])) or "accepted")
    login()
    b=client.post("/api/agenda/admin/bookings",json=request_body()).json()
    assert sent==[("confirmation",1)]
    target=request_body()["starts_at"]
    assert client.post(f"/api/agenda/admin/bookings/{b['id']}/move",json={"starts_at":target,"revision":1}).status_code==200
    assert client.post(f"/api/agenda/admin/bookings/{b['id']}/cancel",json={"revision":2,"reason":"Test"}).status_code==200
    assert sent==[("confirmation",1),("update",2),("cancellation",3)]


def test_request_callback_sends_once_even_when_repeated(monkeypatch):
    from api.agenda import worker
    sent=[]
    monkeypatch.setattr(config,"agenda_mail_dispatch","request")
    monkeypatch.setattr(worker,"deliver",lambda job,b: sent.append(job["id"]) or "accepted")
    b=reserve();p=payment(b["token"])
    payload=dict(event(p),x_account_id=settings.tuu_account_id,x_currency="CLP")
    payload["x_signature"]=generate_signature(payload)
    for _ in range(3):
        assert client.post("/api/agenda/tuu/callback",content=urlencode(payload)).status_code==200
    assert len(sent)==1


def test_request_delivery_timeout_preserves_reservation(monkeypatch):
    from api.agenda import worker
    monkeypatch.setattr(config,"agenda_mail_dispatch","request")
    def fail(*args): raise TimeoutError()
    monkeypatch.setattr(worker,"deliver",fail)
    login()
    b=client.post("/api/agenda/admin/bookings",json=request_body()).json()
    assert b["status"]=="confirmed"
    with connection() as c:
        assert c.execute("SELECT status FROM agenda_jobs").fetchone()["status"]=="unknown"
    assert not run_once()


def test_mail_job_endpoint_requires_secret_and_drains_queue(monkeypatch):
    monkeypatch.setattr(config,"cron_secret",SecretStr("test-cron-secret"))
    assert client.get("/api/agenda/jobs/run").status_code==401
    assert client.get("/api/agenda/jobs/run",headers={"Authorization":"Bearer wrong"}).status_code==401
    login();client.post("/api/agenda/admin/bookings",json=request_body())
    result=client.get("/api/agenda/jobs/run",headers={"Authorization":"Bearer test-cron-secret"})
    assert result.status_code==200 and result.json()["processed"]==1
    assert client.get("/api/agenda/jobs/run",headers={"Authorization":"Bearer test-cron-secret"}).json()["processed"]==0
    monkeypatch.setattr(config,"cron_secret",SecretStr(""))
    assert client.get("/api/agenda/jobs/run",headers={"Authorization":"Bearer "}).status_code==401


def test_resend_transport_uses_snapshot_and_stable_key(monkeypatch):
    import httpx
    calls=[]
    class Provider:
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def post(self,url,**kwargs):
            calls.append((url,kwargs))
            return httpx.Response(200,json={"id":"test-id"},request=httpx.Request("POST",url))
    login();b=client.post("/api/agenda/admin/bookings",json=request_body()).json()
    monkeypatch.setattr(config,"agenda_mail_mode","resend")
    monkeypatch.setattr(config,"resend_api_key",SecretStr("test-only"))
    monkeypatch.setattr(config,"smtp_sender","Enfermera Estética <contacto@enfermeraestetica.cl>")
    monkeypatch.setattr(httpx,"Client",lambda **kwargs:Provider())
    assert run_once(booking_id=b["id"])
    assert not run_once(booking_id=b["id"])
    url,args=calls[0]
    assert url=="https://api.resend.com/emails"
    assert args["headers"]["Idempotency-Key"]==f"agenda/{b['id']}/1/confirmation"
    assert args["json"]["to"]==["prueba@example.invalid"]
    assert "CUIDADOS PREVIOS" in args["json"]["text"]
    with connection() as c:
        assert c.execute("SELECT status FROM agenda_jobs").fetchone()["status"]=="accepted"


def test_checkout_redirect_to_provider_is_reused_without_second_post(monkeypatch):
    import httpx
    calls=[]
    class Redirect:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs):
            calls.append(kwargs["json"])
            return httpx.Response(302,headers={"Location":"https://core.payment.haulmer.com/checkout/test"},request=httpx.Request("POST",url))
    b=reserve()
    monkeypatch.setattr(config,"agenda_payment_mode","tuu")
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kwargs:Redirect())
    for _ in range(2):
        result=client.post(f"/api/agenda/bookings/{b['token']}/checkout")
        assert result.status_code==200
        assert result.json()["checkout_url"]=="https://core.payment.haulmer.com/checkout/test"
    assert len(calls)==1


def test_checkout_merchant_redirect_preserves_redacted_reason_and_no_retry(monkeypatch):
    import httpx
    class Rejected:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs):
            payload=kwargs["json"]
            message="Invalid amount for "+payload["x_customer_email"]
            target=payload["x_url_cancel"]+"&"+urlencode({"x_message":message})
            return httpx.Response(302,headers={"Location":target},request=httpx.Request("POST",url))
    b=reserve()
    monkeypatch.setattr(config,"agenda_payment_mode","tuu")
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kwargs:Rejected())
    result=client.post(f"/api/agenda/bookings/{b['token']}/checkout")
    assert result.status_code==502
    assert "Invalid amount" in result.json()["detail"]
    assert "prueba@example.invalid" not in result.text
    assert b["token"] not in result.text
    with connection() as c:
        detail=c.execute("SELECT details FROM agenda_audit WHERE action='payment.checkout_error'").fetchone()["details"]
        assert "Invalid amount" in detail and "prueba@example.invalid" not in detail
    assert client.post(f"/api/agenda/bookings/{b['token']}/checkout").status_code==409


def test_checkout_redirect_rejects_untrusted_host():
    import httpx
    from api.agenda.payments import checkout_response_url,CheckoutResponseError
    payload={"x_url_cancel":"https://enfermeraestetica.cl/reservar/resultado?token=test",
             "x_url_complete":"https://enfermeraestetica.cl/reservar/resultado?token=test"}
    for url in ["https://evil.invalid/pay","https://haulmer.com.evil.invalid/pay","http://core.payment.haulmer.com/pay"]:
        response=httpx.Response(302,headers={"Location":url},request=httpx.Request("POST","https://core.payment.haulmer.com/api/v1/payment"))
        with pytest.raises(CheckoutResponseError): checkout_response_url(response,payload)
