export default function Contact() {
  const socialLinkClasses =
    "rounded-xl bg-[var(--color-highlight)] px-4 py-2 text-sm font-medium text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-border)]";

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-heading)]">
            Contacto
          </h1>

          <p className="mt-4 text-[var(--color-muted)]">
            ¿Tienes dudas o quieres agendar una evaluación? Contáctanos a través
            de nuestras redes sociales.
          </p>

          <div className="mt-10 space-y-6">
            {/* Location and business hours */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--color-primary-hover)]">
                Información
              </h2>

              <div className="mt-4 space-y-2 text-sm text-[var(--color-body)]">
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

            {/* Social media */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--color-primary-hover)]">
                Redes sociales
              </h2>

              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Escríbenos para resolver tus dudas o agendar una evaluación.
              </p>

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
      </section>
    </div>
  );
}
