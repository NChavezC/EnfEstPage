import hashlib
import hmac
from typing import Any, Mapping

from api.config import settings


def _stringify_value(value: Any) -> str:
    """Convierte un valor al formato textual usado para la firma de TUU."""
    if value is None:
        return ""

    return str(value)


def build_signature_string(payload: Mapping[str, Any]) -> str:
    """
    Construye la cadena que TUU firma:

    1. Incluye solo claves que empiezan con x_
    2. Excluye x_signature
    3. Ordena las claves alfabéticamente
    4. Concatena clave + valor sin separadores
    """
    keys = sorted(
        key
        for key in payload
        if key.startswith("x_") and key != "x_signature"
    )

    return "".join(
        f"{key}{_stringify_value(payload[key])}"
        for key in keys
    )


def generate_signature(payload: Mapping[str, Any]) -> str:
    """Genera la firma HMAC-SHA256 requerida por TUU."""
    message = build_signature_string(payload)
    secret = settings.tuu_secret_key.get_secret_value()

    return hmac.new(
        key=secret.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()


def verify_signature(payload: Mapping[str, Any]) -> bool:
    """Comprueba de forma segura si x_signature corresponde al payload."""
    received_signature = str(payload.get("x_signature", ""))

    if not received_signature:
        return False

    expected_signature = generate_signature(payload)

    return hmac.compare_digest(
        received_signature.lower(),
        expected_signature.lower(),
    )