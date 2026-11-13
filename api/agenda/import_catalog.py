"""Import reviewed catalog copy and local photos without overwriting admin edits.

Run python -m api.agenda.import_catalog to preview; add --apply to persist.
Apply migrations first. Connection is selected by the normal agenda configuration.
"""
import argparse
import json
import unicodedata
from pathlib import Path

from psycopg.types.json import Jsonb
from api.agenda.db import connection, lock_agenda, audit
from api.agenda.schemas import ServiceChange

CONTENT = Path(__file__).with_name("catalog_content.json")
PUBLIC = Path(__file__).resolve().parents[2] / "public"

def name_key(value):
    return " ".join(unicodedata.normalize("NFC", value).casefold().split())

def import_catalog(apply=False):
    entries = json.loads(CONTENT.read_text(encoding="utf-8"))["entries"]
    by_name = {}
    for entry in entries:
        ServiceChange.local_image_paths(entry["images"])
        for image in entry["images"]:
            path = (PUBLIC / image.lstrip("/")).resolve()
            if PUBLIC.resolve() not in path.parents or not path.is_file():
                raise ValueError("Missing catalog image: " + image)
        for name in entry["service_names"]:
            key = name_key(name)
            if key in by_name:
                raise ValueError("Duplicate catalog name: " + name)
            by_name[key] = entry
    report = {"matched": 0, "updated": [], "preserved": [], "unmatched": []}
    with connection() as conn:
        lock_agenda(conn)
        rows = conn.execute("SELECT * FROM agenda_services WHERE deleted_at IS NULL ORDER BY id").fetchall()
        seen = set()
        for row in rows:
            key = name_key(row["name"])
            if key not in by_name:
                report["unmatched"].append(row["name"])
                continue
            if key in seen:
                raise ValueError("Ambiguous service name: " + row["name"])
            seen.add(key)
            report["matched"] += 1
            entry = by_name[key]
            description = entry["description"] if row["description"] in {"", "PRUEBA DESCRIPCIÓN"} else row["description"]
            images = entry["images"] if not row["images"] else row["images"]
            if description == row["description"] and images == row["images"]:
                report["preserved"].append(row["id"])
                continue
            report["updated"].append(row["id"])
            if apply:
                conn.execute("""UPDATE agenda_services SET description=%s,images=%s,version=version+1 WHERE id=%s""",
                             (description, Jsonb(images), row["id"]))
                audit(conn, "service.catalog_imported", row["id"], "catalog page " + str(entry["page"]))
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Persist the reviewed import")
    args = parser.parse_args()
    print(json.dumps(import_catalog(apply=args.apply), ensure_ascii=True))
