from fastapi import HTTPException
from api.agenda.db import audit

def save_customer(conn, data, customer_id=None, version=None):
    if customer_id is not None:
        if version is None:
            raise HTTPException(422, "Falta la versión de la clienta")
        row = conn.execute("""
          UPDATE agenda_customers SET first_name=%(first_name)s,last_name=%(last_name)s,
          email=%(email)s,phone=%(phone)s,birth_date=%(birth_date)s,version=version+1,updated_at=now()
          WHERE id=%(id)s AND version=%(version)s RETURNING *
        """, dict(data, id=customer_id, version=version)).fetchone()
        if not row:
            raise HTTPException(409, "La ficha cambió. Busca nuevamente a la clienta.")
        audit(conn, "customer.updated", row["id"])
        return row
    row = conn.execute("""
      INSERT INTO agenda_customers(first_name,last_name,email,phone,birth_date)
      VALUES(%(first_name)s,%(last_name)s,%(email)s,%(phone)s,%(birth_date)s)
      ON CONFLICT (lower(trim(first_name)),lower(trim(last_name)),lower(trim(email)),phone)
      DO NOTHING
      RETURNING *
    """, {"birth_date":None, **data}).fetchone()
    if row is None:
        row = conn.execute("""SELECT * FROM agenda_customers WHERE
          lower(trim(first_name))=lower(trim(%(first_name)s)) AND
          lower(trim(last_name))=lower(trim(%(last_name)s)) AND
          lower(trim(email))=lower(trim(%(email)s)) AND phone=%(phone)s""", data).fetchone()
    if data.get("birth_date") and row["birth_date"] and data["birth_date"] != row["birth_date"]:
        raise HTTPException(409, "Ya existe una ficha con estos datos y otra fecha de nacimiento. Revisa la ficha antes de reservar.")
    return row
