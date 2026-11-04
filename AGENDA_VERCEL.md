# Despliegue de agenda en Vercel

## Estado y orden de publicación

La base Neon se inicializó separada de PostgreSQL local, sin copiar reservas de prueba. El acceso administrativo de Neon está en el archivo privado local .agenda-local/neon-admin-access.txt.

1. En Vercel, abrir el proyecto EnfEstPage → Settings → Environment Variables.
2. Importar .agenda-local/vercel-production.env solo en el entorno Production. Este archivo contiene secretos y está excluido de Git. No copiarlo a documentación, chats ni commits.
3. Configurar TUU_ACCOUNT_ID y TUU_SECRET_KEY con las credenciales de **producción**. El archivo importable no incluye estas dos claves para evitar reutilizar credenciales de integración. TUU_ENV debe ser production.
4. Revisar que DATABASE_URL sea Neon (incluya sslmode=require), y que AGENDA_PUBLIC_URL y APP_BASE_URL sean https://enfermeraestetica.cl.
5. Subir el commit a main. El despliegue conectado a GitHub debe compilar el frontend y la función Python existente api/index.py. La configuración fija la región gru1 (São Paulo) y duración máxima de 60 segundos.
6. Comprobar /api/health y /api/agenda/catalog antes de probar un cobro. Entrar a /admin con la contraseña de Neon. No usar la contraseña de desarrollo local.
7. Crear una reserva con correo propio y completar manualmente un pago real en TUU. Verificar el importe antes de pagar, registro en TUU, confirmación en agenda y correo. Cancelar una reserva NO reembolsa el cobro.

No subir .env.local, .agenda-local, volcados de bases ni credenciales. Los previews no deben recibir las credenciales de producción ni la base de producción.

## Variables

- DATABASE_URL: conexión Neon cifrada, con pooling.
- AGENDA_ENV=production
- AGENDA_PAYMENT_MODE=tuu
- AGENDA_PUBLIC_URL=https://enfermeraestetica.cl
- AGENDA_ALLOWED_ORIGINS=https://enfermeraestetica.cl,https://www.enfermeraestetica.cl
- AGENDA_MAIL_MODE=resend
- AGENDA_MAIL_DISPATCH=request
- RESEND_API_KEY: clave de envío de Resend (la misma clave usada como SMTP_PASSWORD en desarrollo).
- SMTP_SENDER=Enfermera Estética <contacto@enfermeraestetica.cl>
- CRON_SECRET: secreto aleatorio del archivo importable.
- TUU_ENV=production
- TUU_ACCOUNT_ID / TUU_SECRET_KEY: credenciales de producción de TUU.
- APP_BASE_URL=https://enfermeraestetica.cl
- DEPOSIT_AMOUNT y VITE_DEPOSIT_AMOUNT: importe del flujo independiente de abono. En agenda, el abono se obtiene del tratamiento guardado en la base.

## Correos sin proceso permanente

La confirmación del callback TUU y las operaciones administrativas intentan procesar un correo de la reserva después del commit, dentro de la petición. No dependen de un bucle infinito ni de tareas desprendidas de la función. La API HTTPS de Resend usa una clave de idempotencia por reserva, revisión y tipo de mensaje; el estado persistido evita reenviar trabajos aceptados.

Un fallo de correo no revierte una reserva ni su pago. Los resultados inciertos quedan como unknown para revisión en Operaciones; no se reenvían automáticamente. Un callback duplicado puede procesar una confirmación que siga queued, pero no vuelve a enviar una ya aceptada.

/api/agenda/jobs/run requiere Authorization: Bearer CRON_SECRET. Vercel lo invoca una vez al día a las 12:00 UTC como recuperación limitada de pendientes (máximo tres por ejecución). No es un programador preciso de recordatorios. Los recordatorios están desactivados inicialmente; antes de activarlos se debe configurar una frecuencia adecuada con un servicio programador.

Desarrollo conserva SMTP y el worker local. No cambiar DATABASE_URL local por Neon para ejecutar pytest: las pruebas utilizan una base separada en el servidor local.

## Fuentes

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/docs/functions/configuring-functions/region

## Referencias de pago TUU
El 4 de noviembre de 2026 se aisló un rechazo de validación en integración: solicitudes de $100 con referencia de 40 o 28 caracteres devolvieron HTTP 302 con Error validacion; con 26 caracteres TUU devolvió HTTP 200 y URL de checkout, incluyendo las URLs de retorno con query string de la agenda. Los nuevos intentos codifican los 128 bits del UUID en base 36, con prefijo R y longitud total 26. No se modifica ninguna referencia ya persistida. Estas pruebas crearon intentos únicamente en integración y no completaron pagos. La aceptación de checkout en producción se verifica por separado.

## Retorno del navegador
TUU agrega sus parámetros con un signo de interrogación, incluso cuando la URL configurada ya contiene query string. Para nuevos pagos se usa /reservar/resultado/{token}, sin query previo. El frontend admite los enlaces anteriores con token seguido de ?x_ y extrae únicamente el token válido de 43 caracteres. Los parámetros x_result del navegador nunca confirman pagos: la confirmación procede del callback verificado y la base de datos. Durante creating se muestra Preparando tu pago, no un fallo. Pruebas: node --test tests/return-token.mjs y node tests/browser-return.mjs con Vite local activo.
