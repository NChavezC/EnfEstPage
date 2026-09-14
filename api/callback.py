import logging
from typing import Dict
from urllib.parse import parse_qs
from decimal import Decimal, InvalidOperation

from api.config import settings
from api.payment import CURRENCY, DEPOSIT_AMOUNT
from api.tuu import verify_signature


logger = logging.getLogger(__name__)


class TuuCallbackError(Exception):
    """
    Error de validación de un callback recibido desde TUU.
    """

    pass


def parse_callback_body(body: bytes) -> Dict[str, str]:
    """
    Convierte el body application/x-www-form-urlencoded
    enviado por TUU en un diccionario simple.
    """

    decoded_body = body.decode("utf-8")
    parsed = parse_qs(
        decoded_body,
        keep_blank_values=True,
    )

    return {
        key: values[0]
        for key, values in parsed.items()
        if values
    }


def validate_callback(payload: Dict[str, str]) -> None:
    """
    Verifica que el callback:

    1. tenga una firma TUU válida,
    2. corresponda a nuestra cuenta,
    3. corresponda a un abono de $10.000 CLP,
    4. use una referencia generada por nuestro sistema.
    """

    if not verify_signature(payload):
        raise TuuCallbackError("Firma TUU inválida.")

    if payload.get("x_account_id") != settings.tuu_account_id:
        raise TuuCallbackError("Account ID inválido.")

    try:
        amount = Decimal(payload.get("x_amount", ""))
    except InvalidOperation as error:
        raise TuuCallbackError("Monto inválido.") from error

    if amount != Decimal(DEPOSIT_AMOUNT):
        raise TuuCallbackError(
            "El monto no corresponde al abono esperado."
        )

    if payload.get("x_currency") != CURRENCY:
        raise TuuCallbackError("Moneda inválida.")

    reference = payload.get("x_reference", "")

    if not reference.startswith("ABONO-"):
        raise TuuCallbackError("Referencia inválida.")


def process_callback(payload: Dict[str, str]) -> Dict[str, str]:
    """
    Valida el callback y devuelve los datos relevantes del pago.

    Más adelante esta función será el lugar donde guardaremos
    el estado del pago en una base de datos.
    """

    validate_callback(payload)

    result = payload.get("x_result", "unknown")
    reference = payload.get("x_reference", "")
    message = payload.get("x_message", "")
    timestamp = payload.get("x_timestamp", "")

    logger.info(
        "Callback TUU verificado: reference=%s result=%s",
        reference,
        result,
    )

    return {
        "reference": reference,
        "result": result,
        "message": message,
        "timestamp": timestamp,
    }