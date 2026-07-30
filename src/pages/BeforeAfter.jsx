const results = [
  {
    title: "Limpieza facial profunda",
    description:
      "Resultado posterior a una limpieza facial profunda, orientada a mejorar la apariencia, hidratación y suavidad de la piel.",
    image: "/beforeafter/ba1.png",
  },
  {
    title: "Extracción de puntos negros",
    description:
      "Comparación del aspecto de la zona nasal antes y después de la extracción de impurezas.",
    image: "/beforeafter/ba2.png",
  },
  {
    title: "Mejora de textura y cicatrices de acné",
    description:
      "Evolución de la textura cutánea y la apariencia de cicatrices de acné después del tratamiento.",
    image: "/beforeafter/ba3.png",
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
            Conoce algunos resultados reales obtenidos mediante tratamientos
            estéticos profesionales y personalizados.
          </p>

          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Los resultados pueden variar según las características y necesidades
            de cada paciente.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {results.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
            >
              <div className="p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-[var(--color-primary-hover)]">
                  {item.title}
                </h2>

                <p className="mt-3 max-w-3xl leading-relaxed text-[var(--color-muted)]">
                  {item.description}
                </p>
              </div>

              <div className="border-t border-[var(--color-border)] bg-black/5 p-4 md:p-6">
                <img
                  src={item.image}
                  alt={`Comparación de antes y después: ${item.title}`}
                  className="mx-auto max-h-[750px] w-full rounded-2xl object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
