# Envío de correos del formulario (Google Apps Script)

GitHub Pages solo sirve archivos estáticos: no puede enviar correos. Por eso el formulario le habla a una
pequeña "app web" de Google Apps Script (gratis) que usa **tu cuenta de Gmail** para enviar:

1. **Alerta al equipo** (a los correos de `TEAM_EMAILS`): con los datos de la persona y botones para
   responderle o llamarla. Al darle "Responder" le escribes directo al cliente.
2. **Confirmación al cliente**: "Recibimos tu solicitud, en pocas horas nos pondremos en contacto contigo".

Los diseños de ambos correos son los HTML de la carpeta [emails/](../emails/). El script los lee de tu sitio
publicado en cada envío, así que **para cambiar un correo solo editas el HTML y publicas el sitio**: no hay
que tocar Apps Script.

## Instalación (una sola vez, ~10 minutos)

1. Entra a <https://script.google.com> con la cuenta de Google desde la que quieres que salgan los correos
   (lo ideal: `ideohealthgroup@gmail.com`) y crea un **Nuevo proyecto**. Ponle un nombre, por ejemplo
   *IdeoHealth · Formulario de contacto*.
2. Borra el contenido del archivo `Código.gs` y pega todo el contenido de [Code.gs](Code.gs).
3. Arriba del archivo está la sección `CONFIG`. Revisa:
   - `TEAM_EMAILS`: quién recibe las alertas. Ya viene con `ideohealthgroup@gmail.com`; puedes poner varios.
   - `SITE_URL`: la dirección de tu sitio en GitHub Pages **sin "/" al final**
     (ej. `https://tu-usuario.github.io/ideohealth-portafolio`). De ahí salen los HTML de los correos y el logo.
     Si todavía no has publicado el sitio, déjalo vacío: los correos saldrán con un diseño sencillo de respaldo.
   - `REPLY_TO` (opcional): a dónde llega la respuesta del cliente. Vacío = primer correo de `TEAM_EMAILS`.
4. **Autoriza y prueba**: en la barra superior elige la función `probarEnvio` y pulsa **▶ Ejecutar**.
   Google pedirá permisos (enviar correos y conectarse a un servicio externo). Si aparece
   *"Google no ha verificado esta app"*: **Configuración avanzada → Ir a (nombre del proyecto) → Permitir**.
   Es tu propio script, por eso sale ese aviso. Después revisa la bandeja (y spam): deben llegar **2 correos**
   de ejemplo.
5. **Publica la app web**: **Implementar → Nueva implementación → ⚙ Aplicación web**
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier persona**
   - **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. Pega esa URL en [scripts/config.js](../scripts/config.js), en `formEndpoint`:

   ```js
   formEndpoint: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```

7. Publica el sitio en GitHub Pages y haz una solicitud de prueba desde el formulario real.

> Mientras `formEndpoint` esté vacío, el formulario funciona en **modo demostración** solo en tu computador
> (`localhost`): simula el envío y lo avisa, sin mandar nada. En el sitio publicado mostrará un error.

## Mantenimiento

| Quiero cambiar… | Qué hacer |
|---|---|
| El diseño o los textos de un correo | Editar el HTML en `emails/`, ver el resultado en `emails/preview.html` y publicar el sitio (puede tardar unos minutos por la caché de GitHub Pages). |
| El asunto, los destinatarios o los límites | Editar `CONFIG` en Apps Script. Luego **Implementar → Administrar implementaciones → ✎ → Versión: Nueva versión → Implementar** (la URL no cambia). |
| Probar de nuevo los correos | Ejecutar `probarEnvio` desde el editor. |
| Ver por qué falló algo | En Apps Script, menú **Ejecuciones**: ahí aparecen los errores. |

## Protección contra abuso

La URL `/exec` es pública (como cualquier formulario web). Para evitar spam el script:

- ignora los envíos que llenan un campo oculto (lo llenan los bots, no las personas);
- descarta los envíos hechos en menos de 1.5 segundos desde que se cargó el formulario;
- permite **1 solicitud por correo cada 2 minutos** y **80 solicitudes al día** (`COOLDOWN_SECONDS`, `DAILY_LIMIT`);
- escapa todo lo que escribe el usuario, así no se puede inyectar HTML en los correos.

**Cuotas de Google:** una cuenta de Gmail gratuita puede enviar unos 100 correos al día (Google Workspace,
unos 1,500). Cada solicitud usa 2.

## Datos personales

Los datos solo viajan por correo; el script **no los guarda** en ninguna hoja ni base de datos. El formulario
incluye una casilla de autorización para el tratamiento de datos; conviene complementar el sitio con la
política de tratamiento de datos personales de la empresa.
