from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import re

ZONE = ZoneInfo("America/Santiago")

def minutes(value):
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("Hora inválida")
    h,m = map(int,value.split(":"))
    return h*60+m

def validate_plan(p):
    if p["closed"]:
        return
    begin, end = minutes(p["shift_start"]), minutes(p["shift_end"])
    if begin >= end:
        raise ValueError("La salida debe ser posterior al inicio")
    starts = sorted(minutes(s) for s in p["starts"])
    if not starts or len(set(starts)) != len(starts):
        raise ValueError("Se requieren inicios únicos")
    breaks = sorted((minutes(b["start"]),minutes(b["end"])) for b in p["breaks"])
    for i,(a,b) in enumerate(breaks):
        if not begin <= a < b <= end or (i and a < breaks[i-1][1]):
            raise ValueError("Almuerzos/pausas inválidos o superpuestos")
    for i,start in enumerate(starts):
        finish = start + p["duration"]
        occupied = finish + (p["buffer"] if i < len(starts)-1 or p["final_buffer"] else 0)
        if not begin <= start < finish <= end or occupied > end:
            raise ValueError("La cita o su descanso exceden la jornada")
        if any(start < b and finish > a for a,b in breaks):
            raise ValueError("Una cita cruza el almuerzo o una pausa")
        if i+1 < len(starts) and occupied > starts[i+1]:
            raise ValueError("Las citas o descansos se superponen")

def local_instant(day, clock):
    naive = datetime.combine(day,time.fromisoformat(clock))
    dt = naive.replace(tzinfo=ZONE)
    # Reject nonexistent or ambiguous local times instead of silently shifting.
    if dt.astimezone(timezone.utc).astimezone(ZONE).replace(tzinfo=None) != naive:
        raise ValueError("Hora inexistente por cambio de hora")
    if dt.utcoffset() != naive.replace(tzinfo=ZONE,fold=1).utcoffset():
        raise ValueError("Hora ambigua por cambio de hora")
    return dt

def plan_for(conn,day):
    row = conn.execute("""SELECT plan FROM agenda_schedule WHERE specific_date=%s
      OR (weekday=%s AND effective_from<=%s)
      ORDER BY specific_date NULLS LAST, effective_from DESC LIMIT 1""",
      (day,day.weekday(),day)).fetchone()
    return row["plan"] if row else {"closed":True}

def candidates(conn,day,service):
    p=plan_for(conn,day)
    if p["closed"]:
        return []
    starts=sorted(p["starts"])
    slots=[]
    for i,clock in enumerate(starts):
        try:
            start=local_instant(day,clock)
            end=start+timedelta(minutes=service["duration"])
            capacity_end=local_instant(day,clock)+timedelta(minutes=p["duration"])
            occupied=end+timedelta(minutes=p["buffer"] if i<len(starts)-1 or p["final_buffer"] else 0)
            if end>capacity_end or occupied>local_instant(day,p["shift_end"]):
                continue
            if any(start<local_instant(day,b["end"]) and end>local_instant(day,b["start"]) for b in p["breaks"]):
                continue
            slots.append({"starts_at":start,"ends_at":end,"occupied_until":occupied})
        except ValueError:
            continue
    return slots

def available(conn,day,service,public=True,exclude=None):
    cfg=conn.execute("SELECT * FROM agenda_settings WHERE id=1").fetchone()
    now=conn.execute("SELECT clock_timestamp() AS now").fetchone()["now"]
    today=now.astimezone(ZONE).date()
    if day < today or day > today+timedelta(days=cfg["horizon_days"]):
        return []
    busy=conn.execute("""SELECT id,starts_at,occupied_until FROM agenda_bookings
      WHERE status IN ('held','confirmed','blocked')
      AND (status<>'held' OR expires_at>clock_timestamp())
      AND (starts_at AT TIME ZONE 'America/Santiago')::date<=%s AND (occupied_until AT TIME ZONE 'America/Santiago')::date>=%s""",(day,day)).fetchall()
    return [s for s in candidates(conn,day,service)
      if s["starts_at"]>now+timedelta(hours=cfg["notice_hours"] if public else 0)
      and not any(str(b["id"]) != str(exclude) and s["starts_at"]<b["occupied_until"] and s["occupied_until"]>b["starts_at"] for b in busy)]
