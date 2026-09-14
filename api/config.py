from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    tuu_env: Literal["integration", "production"]
    tuu_account_id: str
    tuu_secret_key: SecretStr
    app_base_url: str

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def tuu_payment_url(self) -> str:
        if self.tuu_env == "integration":
            return "https://frontend-api.payment.haulmer.dev/v1/payment"

        return "https://core.payment.haulmer.com/api/v1/payment"


settings = Settings()