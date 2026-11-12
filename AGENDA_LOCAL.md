# Agenda de Enfermera Estética

## Uso local
Proyecto: `D:\Documents\PERSONAL PROJECTS\FULL_STACK_FAST_API_REACT\EnfEstPage`.

Desde PowerShell en esta carpeta:
```powershell
.\scripts\start-agenda.ps1
```

- Reservas: http://localhost:5173/reservar
- Administración: http://localhost:5173/admin
- Contraseña inicial: archivo local `.agenda-local/admin-access.txt`.
- PostgreSQL 15 aislado: 127.0.0.1:55432, base enfest. No modifica la instancia habitual del puerto 5432.
- Los datos y contraseñas de desarrollo están excluidos de Git. La conexión se configura en `.env.local`.
- Pago de agenda en modo `mock`: no envía solicitudes a TUU. El checkout simulado permite aprobar o rechazar una reserva.
- El flujo anterior `/pago` sigue usando su configuración TUU existente. Para probar sin cobros, usar exclusivamente `/reservar`.
- Correo en modo `file`: no envía correos externos. El trabajador guarda archivos .eml en `.agenda-local/emails`.

El lanzador inicia también el trabajador de correos. Para ejecutarlo manualmente, en otra terminal PowerShell:
```powershell
.\.venv\Scripts\python.exe -m api.agenda.worker
```
Para una sola tarea: añadir `--once`. En desarrollo utiliza este proceso. En Vercel se utiliza envío por petición y la API de Resend; ver AGENDA_VERCEL.md.

## Instalación en otro equipo
Crear una base PostgreSQL vacía y configurar DATABASE_URL. Instalar Node y Python (compatible con el entorno 3.9 existente; se recomienda actualizar Python al preparar producción).
```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm ci
.\.venv\Scripts\python.exe -m api.agenda.setup
```
Las migraciones SQL se aplican una sola vez bajo bloqueo transaccional. No se recrean ni borran datos al arrancar.
El editor usa SQL parametrizado; los intervalos tienen restricción de exclusión PostgreSQL y las operaciones comparten bloqueo transaccional.

## Configuración administrativa
La plantilla inicial tiene 20 citas semanales de 120 minutos. Descanso de 10 minutos entre citas, almuerzo de 30 minutos que incluye el descanso, sin pausa obligatoria después de la última cita. Domingo cerrado.
- Horarios: cargar un día, seleccionar uno o varios días, ajustar inicios y pausas, indicar vigencia, revisar conflictos y guardar.
- Fechas excepcionales: reemplazan la plantilla semanal para esa fecha; permiten cerrar, cambiar horarios o vacaciones día a día.
- Cambiar una plantilla no desplaza citas. Si afecta atención o descanso de una reserva activa, se rechaza el cambio y se muestran los conflictos.
- Tratamientos: editar precio, abono, duración, cuidados y plantillas de correo. La duración debe caber en la capacidad temporal del bloque.
- El modal de cuidados requiere aceptación antes de crear la retención. La versión aceptada se guarda en la reserva.
- Reservas manuales: confirman sin pago, con saldo total pendiente. No inventan aceptación de cuidados.
- Reprogramar y cancelar: solo administración, con control de versión para evitar sobrescribir cambios concurrentes. No ejecutan reembolsos.
- Recordatorios por tratamiento: apagados inicialmente; al activarlos se aplican a nuevas reservas. Si al reservar ya pasó la anticipación del recordatorio, se omite.
- Cambios en tratamientos y correos conservan las versiones de reservas existentes.
- Una profesional. El nombre es configurable; agendas simultáneas de varias profesionales requieren ampliar el modelo.

## Pagos TUU
El adaptador existente se mantiene. La agenda tiene intentos persistidos y callback separado:
`/api/agenda/tuu/callback`.
Se valida HMAC, cuenta, moneda, referencia exacta e importe guardado. Solo el callback confirma el pago; regresar desde el navegador no confirma ni cancela dinero.
El pago tardío de una retención vencida pasa a revisión, incluso si el cupo está libre. No revive automáticamente la reserva.
Un timeout de creación queda como desconocido y no se reintenta automáticamente. Un callback repetido no duplica confirmación ni trabajo de correo.
Los cobros y devoluciones inciertos se concilian manualmente con TUU. No se ha supuesto una API de reembolso o consulta no validada.
Para pagos reales, cambiar `AGENDA_PAYMENT_MODE=tuu`, configurar URL pública HTTPS alcanzable por TUU, credenciales y probar callbacks en integración antes de producción. El backend local no recibe callbacks de internet sin URL pública.

## Notificaciones
Cola persistente con revisión por reserva y deduplicación por tipo. Al reprogramar/cancelar se invalidan trabajos pendientes.
Modo archivo para pruebas. SMTP con STARTTLS para envío real; credenciales solo en servidor. Estados:
- queued / processing: pendiente / procesando.
- saved_local: archivo .eml generado; no enviado.
- accepted: servidor SMTP aceptó el correo; no certifica llegada a bandeja.
- cancelled / skipped: invalidado o no aplicable.
- failed: configuración inválida.
- unknown: resultado incierto; revisar antes de reenviar. No hay reintentos ciegos.
Los webhooks de entrega/rebote y proveedores con idempotencia pueden añadirse antes de una operación de mayor volumen.
La aceptación SMTP se serializa con cambios de agenda para evitar envío de revisiones ya obsoletas; un SMTP lento puede demorar operaciones hasta su timeout.

## Pruebas
```powershell
.\.venv\Scripts\python.exe -m pytest tests -q
npm run lint
npm run build
```
Las pruebas Python crean/reutilizan únicamente `enfest_agenda_test` en el servidor configurado y reinicializan sus tablas `agenda_*`. Requieren permiso CREATE DATABASE en desarrollo. Nunca prueban en la base enfest ni contactan TUU/SMTP.
Casos: semana exacta, 20 solicitudes concurrentes, exclusión de solapamientos, callback firmado, duplicados, pago tardío, expiración, CSRF y sesiones, snapshots, horarios por grupos y excepciones, reprogramación, cancelación, correo local y zona horaria Chile.

## Producción y Neon
La conexión es configurable: usar la URL Neon con TLS sin cambiar el motor. Aplicar migraciones y trasladar datos mediante herramientas PostgreSQL antes del corte.
No publicar .env.local, .agenda-local ni respaldos. Cambiar contraseña administrativa:
```powershell
.\.venv\Scripts\python.exe -m api.agenda.reset_admin
```
Requiere backend con conectividad a PostgreSQL, procesamiento de correos configurado, HTTPS, backups y prueba de restauración. Revisar RPO/RTO, monitoreo, condiciones de cancelación y contenido clínico antes de abrir al público.
Google Calendar y WhatsApp no se implementan en esta etapa; son integraciones opcionales.
No hay migración desde TUU Reserva: la nueva agenda usa únicamente TUU Pago Online.
No se realizaron despliegues, commits, pagos reales ni envíos a clientas durante las pruebas locales.

## Prueba de navegador reproducible
La prueba usa Chrome instalado y datos ficticios. Ejecutarla con la aplicación local activa:
```powershell
npm install --prefix .agenda-local/ui --no-save playwright
node tests/browser.mjs
.\.venv\Scripts\python.exe -m tests.cleanup_browser
```
Las capturas se guardan dentro de .agenda-local y no se incluyen en Git.

## Validación realizada — 4 de noviembre de 2026
22 pruebas de integración aprobadas con PostgreSQL 15 real en enfest_agenda_test. ESLint y build Vite aprobados. Recorrido Chrome aprobado: cuidados obligatorios, reserva, pago simulado, confirmación, autenticación, calendario, reprogramación, cancelación, revisión de horarios por grupos, editor de cuidados, operaciones y cierre de sesión. Vista móvil comprobada a 390 px; navegador en Europe/London y horarios de negocio en America/Santiago. Las reservas ficticias se retiraron de la base de desarrollo. No se verificó cobro real TUU ni entrega SMTP externa.

## Actualización de producción
El flujo local de reserva, reprogramación y cancelación con SMTP fue validado por el usuario. Neon se inicializó sin reservas locales. Ver AGENDA_VERCEL.md para el envío por API de Resend, variables y requisitos antes del push.


## Calendario semanal y clientas
El calendario muestra siete días con disponibilidad calculada en el servidor. En móvil los días se distribuyen en tarjetas; deslizar horizontalmente cambia de semana. Las flechas y Hoy siguen disponibles. Tocar un horario permite reservarlo o bloquearlo, incluyendo el descanso previsto. El historial conserva las reservas canceladas y vencidas.

La pestaña Clientas permite buscar, crear y editar fichas. En una reserva interna el buscador rellena los datos; al confirmar se guardan ficha y reserva en una sola transacción. Editar una ficha no modifica los datos, precios ni cuidados históricos. Las modificaciones verifican la versión de la ficha. Las reservas públicas no pueden editar fichas existentes ni indicar su identificador privado.

La coincidencia automática requiere nombre, apellidos, correo y teléfono; compartir solo teléfono o correo no fusiona fichas. Una fecha de nacimiento distinta en una coincidencia completa requiere revisar la ficha. La fecha de nacimiento es opcional.

### Orden de despliegue de 004_customers.sql
1. Ejecutar la suite contra PostgreSQL local, incluida la migración sobre reservas existentes.
2. Con la configuración de la base destino, ejecutar python -m api.agenda.setup antes de publicar el código nuevo. La migración añade tabla e índice de clientas y una relación nullable; conserva los JSON históricos y es compatible con el código anterior.
3. Publicar el commit y verificar el despliegue. Volver al código anterior no requiere eliminar la tabla ni la columna.

La prueba node tests/browser-calendar-clients.mjs requiere una API aislada con enfest_agenda_ui_test, correo en archivo, pago mock y usuario de prueba. No ejecutarla contra producción. Recorre /admin en escritorio y a 390 × 844, incluida selección táctil, clientes, reserva, reprogramación, bloqueo, liberación, cancelación y auditoría. Con TEST_WEBKIT=1 utiliza WebKit instalado mediante Playwright. No sustituye una prueba en un iPhone físico.

Para repetir el recorrido: iniciar PostgreSQL local, ejecutar python -m tests.serve_agenda_ui en una terminal y npm run dev -- --host 127.0.0.1 en otra. Luego ejecutar node tests/browser-calendar-clients.mjs. El servidor de pruebas verifica que PostgreSQL sea local, utiliza exclusivamente enfest_agenda_ui_test y configura la contraseña ficticia test-password. No iniciar el worker SMTP normal durante estas pruebas.

## Validación — 12 de noviembre de 2026
40 casos de backend validados: 39 aprobados en la suite y el caso de correo multipart aprobado al repetirlo tras actualizar su lectura. Lint sin advertencias y compilación Vite aprobados. Recorrido completo de administración aprobado en Chrome y WebKit, en escritorio y viewport táctil 390 × 844, con navegador en Europe/London y agenda en America/Santiago. Los gestos se simulan; no se usó un iPhone físico.

Migración 004 aplicada en enfest_agenda_test, enfest_agenda_ui_test y Neon de producción antes del push. En Neon se verificó la conservación de los JSON históricos de las 15 reservas existentes: 7 fichas creadas y 13 reservas vinculadas. La base local de desarrollo enfest no se migró en esta validación; el arranque habitual aplica las migraciones pendientes. Las pruebas usaron exclusivamente correos en archivo y pagos mock.
