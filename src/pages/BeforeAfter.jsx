const results = [
  {
    title: "Armonización facial",
    before:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Perfilado de labios",
    before:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Rejuvenecimiento facial",
    before:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80",
    after:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
  },
];

export default function BeforeAfter() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-[var(--color-heading)]">
            Antes y Después
          </h1>

          <p className="mt-4 text-[var(--color-muted)]">
            Algunos ejemplos visuales del tipo de resultados que se pueden
            lograr con un tratamiento profesional y personalizado.
          </p>

          <p className="mt-2 text-sm text-[var(--color-muted)]">
            * Imágenes referenciales de muestra para completar la maqueta del
            sitio.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {results.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
            >
              <h2 className="mb-6 text-2xl font-semibold text-[var(--color-primary-hover)]">
                {item.title}
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Antes
                  </p>

                  <img
                    src={item.before}
                    alt={`${item.title} antes`}
                    className="h-80 w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Después
                  </p>

                  <img
                    src={item.after}
                    alt={`${item.title} después`}
                    className="h-80 w-full rounded-2xl object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
