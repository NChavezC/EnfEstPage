from api.callback import TuuCallbackError, validate_callback
from api.schemas import PaymentResultRequest, PaymentResultResponse


class PaymentResultError(Exception):
    """
    Error al verificar el resultado que TUU devuelve al navegador.
    """

    pass


def verify_payment_result(
    payment_result: PaymentResultRequest,
) -> PaymentResultResponse:
    """
    Verifica criptográficamente el resultado devuelto por TUU
    antes de permitir que el frontend confíe en él.
    """

    payload = payment_result.model_dump(
        exclude_unset=True,
    )

    try:
        validate_callback(payload)

    except TuuCallbackError as error:
        raise PaymentResultError(str(error)) from error

    return PaymentResultResponse(
        valid=True,
        result=payment_result.x_result,
        reference=payment_result.x_reference,
        amount=int(payment_result.x_amount),
        currency=payment_result.x_currency,
        message=payment_result.x_message,
        timestamp=payment_result.x_timestamp,
    )