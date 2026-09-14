import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaymentRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=150)
    phone: str = Field(min_length=8, max_length=20)

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()

        email_pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

        if not re.match(email_pattern, value):
            raise ValueError("El correo electrónico no es válido")

        return value

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        phone = re.sub(r"[^\d+]", "", value.strip())

        if re.fullmatch(r"9\d{8}", phone):
            phone = f"+56{phone}"

        elif re.fullmatch(r"56\d{9}", phone):
            phone = f"+{phone}"

        if not re.fullmatch(r"\+\d{8,15}", phone):
            raise ValueError("El teléfono no es válido")

        return phone


class PaymentCreateResponse(BaseModel):
    checkout_url: str
    reference: str
    amount: int

class PaymentResultRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    x_account_id: str
    x_amount: str
    x_currency: str
    x_reference: str
    x_result: str
    x_signature: str

    x_timestamp: str = ""
    x_message: str = ""


class PaymentResultResponse(BaseModel):
    valid: bool
    result: str
    reference: str
    amount: int
    currency: str
    message: str = ""
    timestamp: str = ""