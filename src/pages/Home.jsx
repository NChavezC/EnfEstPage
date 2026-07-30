import services from "../data/services.json";

export default function Home() {
  return (
    <div className="bg-[var(--color-background)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[var(--color-highlight)] via-[var(--color-surface)] to-[var(--color-surface-soft)]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-[var(--color-highlight)] px-4 py-1 text-sm font-medium text-[var(--color-primary-dark)]">
                Cuidado profesional y personalizado
              </span>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-heading)] md:text-5xl">
                Enfermera Estética
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--color-body)]">
                Realza tu belleza con tratamientos estéticos realizados con un
                enfoque profesional, seguro y humano.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/contact"
                  className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                  Agenda tu evaluación
                </a>

                <a
                  href="/before-after"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-highlight)]"
                >
                  Ver resultados
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] p-4 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1000&q=80"
                  alt="Tratamiento estético"
                  className="h-[420px] w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-[var(--color-heading)]">
            Tratamientos pensados para ti
          </h2>

          <p className="mt-4 text-[var(--color-muted)]">
            Descubre nuestros servicios y encuentra la opción que mejor se
            adapte a tus objetivos estéticos.
          </p>
        </div>

        {/* Services */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={`${service.title}-${index}`}
              className="rounded-2xl bg-[var(--color-surface)] p-6 shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-semibold text-[var(--color-primary-hover)]">
                {service.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlight section */}
      <section className="bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--color-surface-soft)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-heading)]">
              Atención profesional
            </h3>

            <p className="mt-2 text-sm text-[var(--color-body)]">
              Procedimientos realizados con criterio clínico y enfoque estético.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--color-surface-soft)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-heading)]">
              Resultados naturales
            </h3>

            <p className="mt-2 text-sm text-[var(--color-body)]">
              Buscamos armonizar tus rasgos, respetando tu esencia.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--color-surface-soft)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-heading)]">
              Acompañamiento personalizado
            </h3>

            <p className="mt-2 text-sm text-[var(--color-body)]">
              Cada paciente recibe orientación y seguimiento según sus
              necesidades.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
