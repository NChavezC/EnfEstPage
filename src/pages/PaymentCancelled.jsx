import { Link } from "react-router-dom";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-lg sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-3xl text-yellow-700">
            ×
          </div>

          <h1 className="mt-5 text-3xl font-bold text-[var(--color-heading)]">
            Pago cancelado
          </h1>

          <p className="mt-4 text-[var(--color-muted)]">
            El proceso de pago fue cancelado y el abono no se completó.
          </p>

          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Puedes volver a intentarlo cuando quieras.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/pago"
              className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Intentar nuevamente
            </Link>

            <Link
              to="/home"
              className="rounded-xl border border-[var(--color-border)] bg-white px-6 py-3 font-semibold text-[var(--color-heading)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
