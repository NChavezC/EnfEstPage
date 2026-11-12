"""Local-only browser-test API: file mail, mock payments, isolated database."""
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
import uvicorn
uvicorn.run('api.index:app',host='127.0.0.1',port=8000,log_level='warning')
