from pathlib import Path
from typing import Literal
from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

class AgendaSettings(BaseSettings):
    database_url: SecretStr = SecretStr("postgresql://localhost/enfest")
    agenda_env: Literal["development", "production", "test"] = "production"
    agenda_payment_mode: Literal["mock", "tuu"] = "tuu"
    agenda_public_url: str = "http://localhost:5173"
    agenda_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    agenda_mail_mode: Literal["file", "smtp", "resend"] = "file"
    agenda_mail_dispatch: Literal["worker", "request"] = "worker"
    resend_api_key: SecretStr = SecretStr("")
    cron_secret: SecretStr = SecretStr("")
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_sender: str = ""
    model_config = SettingsConfigDict(env_file=ROOT / ".env.local", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def production(self):
        if self.agenda_env == "production":
            if self.agenda_payment_mode != "tuu":
                raise ValueError("Los pagos simulados están prohibidos en producción")
            if not self.agenda_public_url.startswith("https://"):
                raise ValueError("Producción requiere una URL HTTPS")
        return self

config = AgendaSettings()
