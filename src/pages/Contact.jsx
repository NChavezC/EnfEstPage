export default function Contact() {
  return (
    <div className="min-h-screen bg-pink-50">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Contact info */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Contacto</h1>
            <p className="mt-4 text-gray-600">
              ¿Tienes dudas o quieres agendar una evaluación? Completa el
              formulario o contáctanos directamente.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-pink-700">
                  Información de contacto
                </h2>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Teléfono:</span> +56 9 1234
                    5678
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    contacto@enfermeraestetica.cl
                  </p>
                  <p>
                    <span className="font-medium">Ubicación:</span> Concepción,
                    Chile
                  </p>
                  <p>
                    <span className="font-medium">Horario:</span> Lunes a
                    Sabado, 09:00 - 20:00
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-pink-700">
                  Redes sociales
                </h2>
                <div className="mt-4 flex gap-4">
                  <a
                    href="https://www.instagram.com/esteticaenfermera/"
                    className="rounded-xl bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700 hover:bg-pink-200"
                  >
                    Instagram
                  </a>
                  <a
                    href="#"
                    className="rounded-xl bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700 hover:bg-pink-200"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61584368054985"
                    className="rounded-xl bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700 hover:bg-pink-200"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-900">
              Envíanos un mensaje
            </h2>

            <form className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-pink-200 px-4 py-3 outline-none transition focus:border-pink-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-pink-200 px-4 py-3 outline-none transition focus:border-pink-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Teléfono
                </label>
                <input
                  type="text"
                  placeholder="+56 9 ..."
                  className="w-full rounded-xl border border-pink-200 px-4 py-3 outline-none transition focus:border-pink-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Mensaje
                </label>
                <textarea
                  rows="5"
                  placeholder="Cuéntanos qué tratamiento te interesa o cuál es tu consulta..."
                  className="w-full rounded-xl border border-pink-200 px-4 py-3 outline-none transition focus:border-pink-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-pink-600 px-6 py-3 font-semibold text-white transition hover:bg-pink-700"
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
