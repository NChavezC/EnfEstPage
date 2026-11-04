import hashlib
import secrets
from datetime import timedelta
from fastapi import HTTPException, Request
from api.agenda.db import connection
from api.agenda.config import config

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def rate_limit(key,maximum,seconds):
    # Separate transaction: failed login must also consume its quota.
    with connection() as conn:
        row=conn.execute("""INSERT INTO agenda_limits(key,hits,expires_at) VALUES(%s,1,now()+%s*interval '1 second')
          ON CONFLICT(key) DO UPDATE SET
          hits=CASE WHEN agenda_limits.expires_at<now() THEN 1 ELSE agenda_limits.hits+1 END,
          expires_at=CASE WHEN agenda_limits.expires_at<now() THEN now()+%s*interval '1 second' ELSE agenda_limits.expires_at END
          RETURNING hits""",(key,seconds,seconds)).fetchone()
        exceeded=row["hits"]>maximum
    if exceeded:
        raise HTTPException(429,"Demasiados intentos. Intenta más tarde.")

def same_origin(request:Request):
    if request.method not in {"GET","HEAD","OPTIONS"}:
        allowed=config.agenda_allowed_origins.split(",")
        if request.headers.get("origin") not in allowed:
            raise HTTPException(403,"Origen de solicitud inválido")

def require_admin(request:Request):
    same_origin(request)
    token=request.cookies.get("agenda_session","")
    with connection() as conn:
        session=conn.execute("SELECT 1 FROM agenda_sessions WHERE token_hash=%s AND expires_at>now()",(digest(token),)).fetchone()
    if not session:
        raise HTTPException(401,"Inicia sesión para administrar la agenda")
    return True
