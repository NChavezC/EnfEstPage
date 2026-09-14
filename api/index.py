from fastapi import FastAPI, HTTPException, Request, Response
import logging

logger = logging.getLogger(__name__)

from api.callback import (
    TuuCallbackError,
    parse_callback_body,
    process_callback,
)
from api.payment import TuuPaymentError, create_payment
from api.result import PaymentResultError, verify_payment_result
from api.schemas import (
    PaymentCreateResponse,
    PaymentRequest,
    PaymentResultRequest,
    PaymentResultResponse,
)
from api.config import settings


app = FastAPI(
    title="Enfermera Estética API",
    version="0.1.0",
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post(
    "/api/payment/create",
    response_model=PaymentCreateResponse,
)
async def create_payment_endpoint(
    payment: PaymentRequest,
):
    try:
        return await create_payment(
            payment=payment,
            base_url=settings.app_base_url,
        )

    except TuuPaymentError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message,
        ) from error


@app.post("/api/tuu/callback")
async def tuu_callback_endpoint(
    request: Request,
):
    body = await request.body()

    payload = parse_callback_body(body)

    try:
        process_callback(payload)

    except TuuCallbackError as error:
        logger.warning(
            "Callback TUU rechazado: error=%s reference=%s amount=%s result=%s keys=%s",
            str(error),
            payload.get("x_reference"),
            payload.get("x_amount"),
            payload.get("x_result"),
            sorted(payload.keys()),
        )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return Response(
        content="OK",
        media_type="text/plain",
        status_code=200,
    )


@app.post(
    "/api/payment/verify-result",
    response_model=PaymentResultResponse,
)
def verify_payment_result_endpoint(
    payment_result: PaymentResultRequest,
):
    try:
        return verify_payment_result(payment_result)

    except PaymentResultError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error