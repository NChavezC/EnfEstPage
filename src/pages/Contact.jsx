export default function Contact() {
  const socialLinkClasses =
    "rounded-xl bg-[var(--color-highlight)] px-4 py-2 text-sm font-medium text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-border)]";

  const inputClasses =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-body)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)]";

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Contact information */}
          <div>
            <h1 className="text-4xl font-bold text-[var(--color-heading)]">
              Contacto
            </h1>

            <p className="mt-4 text-[var(--color-muted)]">
              ¿Tienes dudas o quieres agendar una evaluación? Completa el
              formulario o contáctanos directamente.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-primary-hover)]">
                  Información de contacto
                </h2>

                <div className="mt-4 space-y-2 text-sm text-[var(--color-body)]">
                  <p>
                    <span className="font-medium text-[var(--color-heading)]">
                      Teléfono:
                    </span>{" "}
                    +56 9 1234 5678
                  </p>

                  <p>
                    <span className="font-medium text-[var(--color-heading)]">
                      Email:
                    </span>{" "}
                    contacto@enfermeraestetica.cl
                  </p>

                  <p>
                    <span className="font-medium text-[var(--color-heading)]">
                      Ubicación:
                    </span>{" "}
                    Concepción, Chile
                  </p>

                  <p>
                    <span className="font-medium text-[var(--color-heading)]">
                      Horario:
                    </span>{" "}
                    Lunes a sábado, 09:00–20:00
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[var(--color-primary-hover)]">
                  Redes sociales
                </h2>

                <div className="mt-4 flex flex-wrap gap-4">
                  <a
                    href="https://www.instagram.com/esteticaenfermera/"
                    target="_blank"
                    rel="noreferrer"
                    className={socialLinkClasses}
                  >
                    Instagram
                  </a>

                  <a
                    href="https://wa.me/56979849052"
                    target="_blank"
                    rel="noreferrer"
                    className={socialLinkClasses}
                  >
                    WhatsApp
                  </a>

                  <a
                    href="https://www.facebook.com/profile.php?id=61584368054985"
                    target="_blank"
                    rel="noreferrer"
                    className={socialLinkClasses}
                  >
                    Facebook
                  </a>

                  <a
                    href="https://www.tiktok.com/@esteticaenfermera?_r=1&_t=ZS-95QUv2gdBdF"
                    target="_blank"
                    rel="noreferrer"
                    className={socialLinkClasses}
                  >
                    TikTok
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-[var(--color-heading)]">
              Envíanos un mensaje
            </h2>

            <form className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-[var(--color-body)]"
                >
                  Nombre
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[var(--color-body)]"
                >
                  Correo electrónico
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-[var(--color-body)]"
                >
                  Teléfono
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+56 9 ..."
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-[var(--color-body)]"
                >
                  Mensaje
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Cuéntanos qué tratamiento te interesa o cuál es tu consulta..."
                  className={`${inputClasses} resize-y`}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Enviar consulta
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
