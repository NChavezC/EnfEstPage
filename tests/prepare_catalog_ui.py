"""Prepare all catalog treatments in the isolated local browser-test database."""
import os
os.environ.update(AGENDA_ENV='test',AGENDA_MAIL_MODE='file',AGENDA_MAIL_DISPATCH='worker',AGENDA_PAYMENT_MODE='mock')
from api.agenda.config import config
import psycopg
from psycopg.conninfo import conninfo_to_dict
assert conninfo_to_dict(config.database_url.get_secret_value()).get('host') in {'localhost','127.0.0.1'}
with psycopg.connect(config.database_url.get_secret_value(),dbname='postgres',autocommit=True,connect_timeout=5) as c:
    if not c.execute("SELECT 1 FROM pg_database WHERE datname='enfest_agenda_ui_test'").fetchone():
        c.execute('CREATE DATABASE enfest_agenda_ui_test')
from psycopg.conninfo import make_conninfo
from pydantic import SecretStr
config.database_url=SecretStr(make_conninfo(config.database_url.get_secret_value(),dbname='enfest_agenda_ui_test'))
from api.agenda.setup import initialize,hash_password
from api.agenda.db import connection
initialize()
with connection() as c:
    c.execute("UPDATE agenda_admin SET password_hash=%s",(hash_password('test-password'),))

import json
from pathlib import Path
from api.agenda.import_catalog import import_catalog
content=json.loads(Path('api/agenda/catalog_content.json').read_text(encoding='utf-8'))
with connection() as c:
    for entry in content['entries']:
        for name in entry['service_names']:
            if not c.execute('SELECT 1 FROM agenda_services WHERE name=%s AND deleted_at IS NULL',(name,)).fetchone():
                c.execute('INSERT INTO agenda_services(name,price,deposit,duration,category_id) VALUES(%s,28000,10000,120,1)',(name,))
print(import_catalog(apply=True))
