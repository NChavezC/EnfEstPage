import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PaymentResult() {
  const [status, setStatus] = useState("loading");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyResult() {
      const searchParams = new URLSearchParams(window.location.search);

      const payload = {};

      for (const [key, value] of searchParams.entries()) {
        if (key.startsWith("x_")) {
          payload[key] = value;
        }
      }

      if (!payload.x_signature) {
        setStatus("error");
        setError("No se recibió información válida del pago.");
        return;
      }

      try {
        const response = await fetch("/api/payment/verify-result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "No fue posible verificar el pago.");
        }

        setPayment(data);

        if (data.result === "completed") {
          setStatus("completed");
        } else if (data.result === "pending") {
          setStatus("pending");
        } else {
          setStatus("failed");
        }
      } catch (error) {
        setStatus("error");
        setError(error.message || "Ocurrió un problema al verificar el pago.");
      }
    }

    verifyResult();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-lg sm:p-10">
          {status === "loading" && (
            <>
              <h1 className="text-3xl font-bold text-[var(--color-heading)]">
                Verificando pago
              </h1>

              <p className="mt-4 text-[var(--color-muted)]">
                Estamos confirmando el resultado de tu transacción con TUU.
              </p>

              <p className="mt-6 text-sm text-[var(--color-muted)]">
                No cierres esta ventana.
              </p>
            </>
          )}

          {status === "completed" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                ✓
              </div>

              <h1 className="mt-5 text-3xl font-bold text-[var(--color-heading)]">
                Pago aprobado
              </h1>

              <p className="mt-4 text-[var(--color-muted)]">
                Tu abono de{" "}
                <strong className="text-[var(--color-heading)]">
                  ${payment.amount.toLocaleString("es-CL")}
                </strong>{" "}
                fue procesado correctamente.
              </p>

              <PaymentDetails payment={payment} />
              <Link
                to="/home"
                className="mt-8 inline-block rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Volver a Home
              </Link>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-3xl text-yellow-700">
                …
              </div>

              <h1 className="mt-5 text-3xl font-bold text-[var(--color-heading)]">
                Pago pendiente
              </h1>

              <p className="mt-4 text-[var(--color-muted)]">
                TUU todavía no ha informado un resultado definitivo para la
                transacción.
              </p>

              <PaymentDetails payment={payment} />
            </>
          )}

          {status === "failed" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-700">
                ×
              </div>

              <h1 className="mt-5 text-3xl font-bold text-[var(--color-heading)]">
                Pago no completado
              </h1>

              <p className="mt-4 text-[var(--color-muted)]">
                La transacción no pudo completarse. No consideraremos este abono
                como pagado.
              </p>

              {payment?.message && (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  {payment.message}
                </p>
              )}

              <PaymentDetails payment={payment} />
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-700">
                !
              </div>

              <h1 className="mt-5 text-3xl font-bold text-[var(--color-heading)]">
                No pudimos verificar el pago
              </h1>

              <p className="mt-4 text-[var(--color-muted)]">{error}</p>

              <p className="mt-3 text-sm text-[var(--color-muted)]">
                Por seguridad, no mostraremos la transacción como aprobada
                mientras no podamos verificarla.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function PaymentDetails({ payment }) {
  if (!payment) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl bg-[var(--color-surface-soft)] p-5 text-left">
      <div className="flex justify-between gap-4">
        <span className="text-sm text-[var(--color-muted)]">Monto</span>

        <span className="font-semibold text-[var(--color-heading)]">
          ${payment.amount.toLocaleString("es-CL")}
        </span>
      </div>

      <div className="mt-3 flex justify-between gap-4">
        <span className="text-sm text-[var(--color-muted)]">Referencia</span>

        <span className="break-all text-right text-sm font-medium text-[var(--color-heading)]">
          {payment.reference}
        </span>
      </div>
    </div>
  );
}
