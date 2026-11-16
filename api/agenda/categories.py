from fastapi import HTTPException


def position_category(conn, category_id=None, position=None):
    """Caller holds lock_agenda; the deferred unique constraint permits shifts."""
    ids = [r["id"] for r in conn.execute("SELECT id FROM agenda_categories ORDER BY position,id")]
    if category_id is not None and position is not None:
        if position > len(ids):
            raise HTTPException(422, "La posición supera el total de categorías. Actualiza la lista.")
        ids.remove(category_id)
        ids.insert(position - 1, category_id)
    for index, id in enumerate(ids, 1):
        conn.execute("UPDATE agenda_categories SET position=%s WHERE id=%s AND position<>%s", (index, id, index))
