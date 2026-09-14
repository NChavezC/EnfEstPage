from typing import Any, Dict
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import httpx

from api.config import settings
from api.schemas import PaymentCreateResponse, PaymentRequest
from api.tuu import generate_signature


DEPOSIT_AMOUNT = 10_000
CURRENCY = "CLP"
SHOP_NAME = "Enfermera Estetica"


class TuuPaymentError(Exception):
    """
    Error controlado al crear un intento de pago en TUU.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 502,
    ):
        self.message = message
        self.status_code = status_code

        super().__init__(message)


def generate_payment_reference() -> str:
    """
    Genera una referencia única para cada intento de pago.

    Ejemplo:
    ABONO-D9A034BB6C534E38A7C8
    """
    unique_id = uuid4().hex[:20].upper()

    return f"ABONO-{unique_id}"


def build_payment_payload(
    payment: PaymentRequest,
    base_url: str,
) -> Dict[str, Any]:
    """
    Construye y firma el payload enviado a TUU.
    """

    base_url = base_url.rstrip("/")

    payload = {
        "x_account_id": settings.tuu_account_id,
        "x_amount": DEPOSIT_AMOUNT,
        "x_currency": CURRENCY,
        "x_customer_email": payment.email,
        "x_customer_first_name": payment.first_name,
        "x_customer_last_name": payment.last_name,
        "x_customer_phone": payment.phone,
        "x_description": "Abono tratamiento Enfermera Estetica",
        "x_reference": generate_payment_reference(),
        "x_shop_name": SHOP_NAME,
        "x_url_callback": f"{base_url}/api/tuu/callback",
        "x_url_cancel": f"{base_url}/pago/cancelado",
        "x_url_complete": f"{base_url}/pago/resultado",
    }

    payload["x_signature"] = generate_signature(payload)

    return payload


def parse_redirect_response(location: str) -> Dict[str, str]:
    """
    Extrae los parámetros enviados por TUU dentro de una URL
    de redirección.
    """

    parsed_url = urlparse(location)
    query = parse_qs(parsed_url.query)

    return {
        key: values[0]
        for key, values in query.items()
        if values
    }


async def create_payment(
    payment: PaymentRequest,
    base_url: str,
) -> PaymentCreateResponse:
    """
    Crea un intento de pago en TUU y devuelve la URL segura
    donde el navegador debe continuar el flujo.
    """

    payload = build_payment_payload(
        payment=payment,
        base_url=base_url,
    )

    headers = {
        "X-REDIRECT": "false",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=False,
    ) as client:
        response = await client.post(
            settings.tuu_payment_url,
            json=payload,
            headers=headers,
        )

    # TUU puede redirigir hacia x_url_cancel cuando detecta
    # un error de validación antes de crear el payment intent.
    if response.is_redirect:
        location = response.headers.get("location", "")
        redirect_data = parse_redirect_response(location)

        message = redirect_data.get(
            "x_message",
            "TUU rechazó la creación del pago.",
        )

        raise TuuPaymentError(
            message=message,
            status_code=502,
        )

    # Errores HTTP normales: 4xx / 5xx.
    if response.is_error:
        raise TuuPaymentError(
            message=f"TUU respondió con HTTP {response.status_code}.",
            status_code=502,
        )

    # En integración observamos que TUU responde HTTP 200
    # con la URL del checkout directamente como texto plano.
    checkout_url = response.text.strip()

    if not checkout_url.startswith(("https://", "http://")):
        raise TuuPaymentError(
            message="TUU respondió sin una URL de pago válida.",
            status_code=502,
        )

    return PaymentCreateResponse(
        checkout_url=checkout_url,
        reference=payload["x_reference"],
        amount=DEPOSIT_AMOUNT,
    )