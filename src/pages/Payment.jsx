import { useState } from "react";

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};

export default function Payment() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "No fue posible iniciar el pago.");
      }

      window.location.assign(data.checkout_url);
    } catch (error) {
      setError(error.message || "Ocurrió un problema al iniciar el pago.");

      setIsSubmitting(false);
    }
  }

  const inputClasses =
    "mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-body)] shadow-sm outline-none transition focus:border-[var(--color-primary)]";

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg sm:p-10">
          <span className="inline-block rounded-full bg-[var(--color-highlight)] px-4 py-1 text-sm font-medium text-[var(--color-primary-dark)]">
            Pago seguro con TUU
          </span>

          <h1 className="mt-5 text-4xl font-bold text-[var(--color-heading)]">
            Pagar abono
          </h1>

          <p className="mt-4 text-[var(--color-muted)]">
            Para reservar tu hora, realiza un abono fijo de{" "}
            <strong className="text-[var(--color-heading)]">$10.000</strong>. El
            monto se descuenta del valor final de tu tratamiento.
          </p>

          <div className="mt-8 rounded-2xl bg-[var(--color-surface-soft)] p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-[var(--color-heading)]">
                Abono de reserva
              </span>

              <span className="text-2xl font-bold text-[var(--color-primary-dark)]">
                $10.000
              </span>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--color-heading)]">
                Nombre
                <input
                  className={inputClasses}
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                  required
                />
              </label>

              <label className="text-sm font-medium text-[var(--color-heading)]">
                Apellido
                <input
                  className={inputClasses}
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-[var(--color-heading)]">
              Correo electrónico
              <input
                className={inputClasses}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-medium text-[var(--color-heading)]">
              Teléfono
              <input
                className={inputClasses}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="+56912345678"
                required
              />
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Conectando con TUU..." : "Pagar $10.000"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-[var(--color-muted)]">
            Al continuar, serás redirigido/a a la plataforma de pago de TUU para
            completar la transacción de forma segura.
          </p>
        </div>
      </section>
    </div>
  );
}
