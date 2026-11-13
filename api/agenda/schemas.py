from __future__ import annotations
from typing import Optional
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator
from api.schemas import PaymentRequest

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class Block(Strict):
    start: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    end: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")

class Plan(Strict):
    closed: bool = False
    starts: list[str] = Field(default_factory=list, max_length=40)
    shift_start: str = Field(default="09:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    shift_end: str = Field(default="20:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    duration: int = Field(default=120, ge=10, le=480)
    buffer: int = Field(default=10, ge=0, le=120)
    breaks: list[Block] = Field(default_factory=list, max_length=10)
    final_buffer: bool = False

    @model_validator(mode="after")
    def valid(self):
        from api.agenda.schedule import validate_plan
        validate_plan(self.model_dump())
        return self

class ScheduleChange(Strict):
    weekdays: list[int] = Field(default_factory=list, max_length=7)
    specific_date: Optional[date] = None
    effective_from: date
    plan: Plan

    @model_validator(mode="after")
    def target(self):
        if bool(self.weekdays) == bool(self.specific_date):
            raise ValueError("Selecciona días de semana o una fecha excepcional")
        if any(d < 0 or d > 6 for d in self.weekdays):
            raise ValueError("Día inválido")
        return self

class CategoryChange(Strict):
    name: str = Field(min_length=2, max_length=100)

class ServiceChange(Strict):
    category_id: int = Field(default=1, ge=1)
    name: str = Field(min_length=3, max_length=150)
    price: int = Field(ge=1, le=10000000)
    deposit: int = Field(ge=1)
    duration: int = Field(default=120, ge=10, le=480)
    description: str = Field(default="PRUEBA DESCRIPCIÓN", max_length=10000)
    images: list[str] = Field(default_factory=list, max_length=10)
    care: str = Field(min_length=1, max_length=10000)
    confirmation: str = Field(min_length=1, max_length=10000)
    reminder: str = Field(min_length=1, max_length=10000)
    reminder_hours: Optional[int] = Field(default=None, ge=1, le=720)
    active: bool = True

    @field_validator("images")
    @classmethod
    def local_image_paths(cls, paths):
        import re
        cleaned = [p.strip() for p in paths]
        for path in cleaned:
            if (len(path) > 500 or not path.startswith("/") or path.startswith("//")
                or path.startswith("/public/") or re.search(r"[\\%?#\x00-\x1f]", path)
                or any(part in {".", "..", ""} for part in path[1:].split("/"))
                or not re.search(r"\.(jpe?g|png|webp|avif)$", path, re.I)):
                raise ValueError("Usa rutas locales como /tratamientos/foto.jpg, sin public, dominios ni parámetros")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("No repitas la misma foto")
        return cleaned

    @model_validator(mode="after")
    def valid(self):
        from string import Formatter
        if self.deposit > self.price:
            raise ValueError("Abono mayor al precio")
        for text in [self.confirmation,self.reminder]:
            for _, field, spec, conversion in Formatter().parse(text):
                if field is not None and (field not in {"nombre","tratamiento","fecha","cuidados","saldo"} or spec or conversion):
                    raise ValueError("Variable de plantilla inválida")
        return self

class BookingRequest(Strict):
    service_id: int
    service_version: int
    starts_at: datetime
    customer: PaymentRequest
    accepted_care: bool = False
    notes: str = Field(default="", max_length=5000)

class CustomerChange(PaymentRequest):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    birth_date: Optional[date] = None

    @model_validator(mode="after")
    def valid_birth_date(self):
        from api.agenda.schedule import ZONE
        if self.birth_date and self.birth_date > datetime.now(ZONE).date():
            raise ValueError("La fecha de nacimiento no puede estar en el futuro")
        return self

class CustomerUpdate(CustomerChange):
    version: int = Field(ge=1)

class AdminBookingRequest(BookingRequest):
    customer: CustomerChange
    customer_id: Optional[int] = Field(default=None, ge=1)
    customer_version: Optional[int] = Field(default=None, ge=1)

class MoveRequest(Strict):
    starts_at: datetime
    revision: int

class CancelRequest(Strict):
    revision: int
    reason: str = Field(default="", max_length=1000)

class BlockRequest(Strict):
    starts_at: datetime
    ends_at: datetime
    reason: str = Field(default="", max_length=200)

class LoginRequest(Strict):
    password: str = Field(min_length=1, max_length=200)

class SettingsChange(Strict):
    professional: str = Field(min_length=2, max_length=120)
    notice_hours: int = Field(ge=0, le=720)
    horizon_days: int = Field(ge=1, le=365)
    hold_minutes: int = Field(ge=5, le=30)
