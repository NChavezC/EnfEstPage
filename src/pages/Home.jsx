import services from "../data/services.json";

export default function Home() {
  return (
    <div className="bg-pink-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-r from-pink-100 via-white to-rose-100">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-pink-200 px-4 py-1 text-sm font-medium text-pink-800">
                Cuidado profesional y personalizado
              </span>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
                Enfermera Estética
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-700">
                Realza tu belleza con tratamientos estéticos realizados con un
                enfoque profesional, seguro y humano.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/contact"
                  className="rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-pink-700"
                >
                  Agenda tu evaluación
                </a>

                <a
                  href="/before-after"
                  className="rounded-xl border border-pink-300 bg-white px-6 py-3 text-sm font-semibold text-pink-700 transition hover:bg-pink-100"
                >
                  Ver resultados
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl">
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
          <h2 className="text-3xl font-bold text-gray-900">
            Tratamientos pensados para ti
          </h2>
          <p className="mt-4 text-gray-600">
            Descubre nuestros servicios y encuentra la opción que mejor se
            adapte a tus objetivos estéticos.
          </p>
        </div>

        {/* Services */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={`${service.title}-${index}`}
              className="rounded-2xl bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-semibold text-pink-700">
                {service.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Highlight section */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          <div className="rounded-2xl bg-pink-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
              Atención profesional
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              Procedimientos realizados con criterio clínico y enfoque estético.
            </p>
          </div>

          <div className="rounded-2xl bg-rose-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
              Resultados naturales
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              Buscamos armonizar tus rasgos, respetando tu esencia.
            </p>
          </div>

          <div className="rounded-2xl bg-pink-100 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
              Acompañamiento personalizado
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              Cada paciente recibe orientación y seguimiento según sus
              necesidades.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
