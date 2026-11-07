# Correos del formulario de contacto

Aquí viven los dos correos HTML que se envían cuando alguien llena el formulario. Son archivos normales:
edítalos, guárdalos y publica el sitio; el script de Apps Script los lee de tu sitio en cada envío.

| Archivo | Para quién | Cuándo se envía |
|---|---|---|
| [notificacion-equipo.html](notificacion-equipo.html) | El equipo (`TEAM_EMAILS`) | Alerta con los datos del cliente y botones de responder y llamar. |
| [confirmacion-cliente.html](confirmacion-cliente.html) | La persona que llenó el formulario | Confirma que en pocas horas nos pondremos en contacto. |

## Ver cómo quedan

Desde la carpeta del proyecto: `python3 -m http.server 8000` y abre
<http://localhost:8000/emails/preview.html>. Muestra ambos correos con datos de ejemplo, en ancho de
escritorio y de móvil. Después de editar un archivo pulsa **Recargar archivo**.

## Variables

Se escriben con doble llave, tal cual (`{{nombre}}`). El valor ya viene escapado y listo para usar.

| Variable | Contenido |
|---|---|
| `{{nombre}}` / `{{primer_nombre}}` | Nombre completo / solo el primer nombre |
| `{{empresa}}` | Empresa u organización (`No indicada` si la dejó vacía) |
| `{{telefono}}` / `{{telefono_link}}` | Teléfono como lo escribió / limpio para enlaces `tel:` |
| `{{correo}}` | Correo de la persona |
| `{{servicio}}` | Servicio que le interesa |
| `{{descripcion}}` | Lo que tiene y necesita (con saltos de línea) |
| `{{fecha}}` | Fecha y hora de la solicitud, en hora de Colombia |
| `{{responder_url}}` | Enlace `mailto:` con el asunto ya escrito |
| `{{marca}}` | Nombre de la marca (`BRAND_NAME` en Apps Script) |
| `{{sitio_url}}` | Dirección del sitio publicado (`SITE_URL` en Apps Script) |
| `{{logo_url}}` | Logo del encabezado: `sitio_url` + `/images/brand/logo-horizontal-nav.png` |
| `{{anio}}` | Año actual |

Una variable que no exista se envía en blanco (y queda registrada en la ejecución del script).

## Consejos para editar

- Los correos están hechos con **tablas y estilos en línea** a propósito: es lo que funciona en Gmail,
  Outlook y Apple Mail. Evita `flex`, `grid` o CSS externo.
- El **logo** se carga desde tu sitio: si reemplazas `images/brand/logo-horizontal-nav.png` con una versión
  mejor (mismo nombre), los correos también se actualizan. Debe estar publicado para que se vea.
- Los **comentarios HTML** (como el que está al inicio de cada archivo) se eliminan antes de enviar.
- El **asunto** no está aquí: se cambia en `CONFIG.SUBJECT_TEAM` / `CONFIG.SUBJECT_CLIENT` de Apps Script.
- Colores de marca: azul `#0a3a78`, turquesa `#008aa0`, verde `#10b090`.
