# IdeoHealth Group: sitio web de portafolio

Sitio estático (HTML + CSS + JavaScript, sin paso de compilación) listo para publicar con GitHub Pages.
Está en español y es responsive (escritorio, tableta y móvil).

## Páginas

| Página | Contenido |
|---|---|
| [index.html](index.html) | Portada · Servicios · Metodología · Nosotros (abrebocas con botón "Conoce al equipo") · Contacto |
| [nosotros.html](nosotros.html) | Historia · Razón de ser y visión · Valores · Propuesta de valor · Equipo · Contacto |
| `/download` ([download/index.html](download/index.html)) | Genera y descarga automáticamente el **brief en PDF** con la información actual del sitio |

Menú: logo (lleva a la portada) · Servicios · Metodología · Nosotros · botón **Contáctanos** (baja al formulario).

## Estructura

```
portafolio/
├── index.html · nosotros.html   ← las dos páginas (el encabezado es igual en ambas)
├── components/                  ← COMPONENTES COMPARTIDOS: se editan una vez y cambian en las dos páginas
│   ├── contacto.html            ←   sección de contacto con el formulario
│   └── footer.html              ←   pie de página
├── styles/
│   ├── base.css                 ←   colores de marca, tipografía, botones
│   ├── layout.css               ←   encabezado, portada, franja de pilares, pie
│   ├── sections.css             ←   secciones de contenido
│   └── contact.css              ←   sección de contacto y formulario
├── scripts/
│   ├── config.js                ←   CONFIGURACIÓN: URL del formulario y datos de contacto
│   ├── main.js · ui.js          ←   menú, animaciones, navegación
│   ├── components.js            ←   cargador de componentes
│   ├── contact-form.js          ←   validación y envío del formulario
│   ├── contact-links.js         ←   datos de contacto válidos (los usan el formulario y el PDF)
│   └── brief/                   ←   generador del PDF (ver la sección "Brief en PDF")
├── download/index.html          ← ruta /download: genera y descarga el brief en PDF
├── emails/                      ← los 2 correos HTML del formulario (ver emails/README.md)
├── apps-script/                 ← backend que envía los correos (ver apps-script/README.md)
├── vendor/                      ← librerías de terceros: pdfmake (MIT) y tipografías Nunito / Plus Jakarta Sans (OFL)
├── images/                      ← logos, fotos, íconos (ver IMAGENES.md)
└── .nojekyll
```

### Componentes compartidos

`components/contacto.html` y `components/footer.html` se insertan en cada página con
`<div data-include="components/archivo.html"></div>`. Edita el archivo del componente **una sola vez** y el
cambio aparece en `index.html` y en `nosotros.html`. Si creas otra página, basta con poner esos `div`.

> Como los componentes se cargan con `fetch`, el sitio **debe abrirse desde un servidor** (GitHub Pages o el
> servidor local de abajo). Abrir `index.html` con doble clic no cargará el contacto ni el pie.

## Probarlo en tu computador

Desde la carpeta `portafolio`:

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000>. El formulario funciona en **modo demostración** (simula el envío, no manda
correos) hasta que conectes el backend.

## Brief en PDF (`/download`)

Entrar a `tusitio.com/download` genera y descarga solo el archivo `IdeoHealth-Group-Brief.pdf`: portada,
historia, propósito y visión, valores, propuesta de valor, servicios, metodología, equipo y contacto (con un
código QR al sitio). **No existe ningún PDF guardado en el repositorio**: se arma en el navegador de quien
entra, cada vez, leyendo el contenido vigente de las páginas. Por eso nunca queda desactualizado.

Con `/download?preview` el PDF se muestra en la propia página en vez de descargarse; es la forma más rápida
de revisar el resultado después de un cambio.

### Qué se actualiza solo (sin tocar código del generador)

Todo lo que cambies en estos archivos aparece en el PDF la próxima vez que se genere:

| Si cambias… | Se refleja en el PDF… |
|---|---|
| Un texto de `index.html` o `nosotros.html` (portada, historia, valores, metodología…) | En su sección |
| Un servicio, una viñeta, un valor, un paso de la metodología (agregar, quitar o editar) | En su sección |
| Una persona del equipo (nombre, cargo, biografía, etiquetas o foto) | En el equipo, con su foto en círculo |
| Una imagen (portada, fotos del equipo, logos) | En el PDF, con el mismo recorte (`object-position`) del sitio |
| Los colores de marca en `styles/base.css` | En todo el diseño |
| Los pasos o el texto de `components/contacto.html`, o los datos de `scripts/config.js` | En la página de contacto |

### Cómo está organizado (`scripts/brief/`)

| Archivo | Qué hace |
|---|---|
| `extract.js` | **Lee** `index.html`, `nosotros.html` y los componentes y extrae el contenido. Cada sección usa los mismos ids y clases que el HTML. |
| `layout.js` | **Diseña** el documento (portada, tarjetas, tipografía, orden de las secciones). Aquí no hay textos. |
| `assets.js` | Colores (leídos de `base.css`), tipografías e imágenes. |
| `brief.js` · `download-page.js` | Unen todo y controlan la página `/download`. |

### Cuándo SÍ hay que tocar código

- **Agregar una sección nueva al PDF:** (1) leerla en `extract.js`; (2) dibujarla como un bloque en `layout.js`
  y (3) agregarlo a la lista `content` al final de ese archivo.
- **Renombrar una clase o un id del HTML** que use el extractor: actualiza su selector en `extract.js`. Si algo
  no se encuentra, la consola del navegador avisa con `[brief] "…" no encontró contenido`, y esa parte queda
  fuera del PDF en vez de romper todo. Después de cambios grandes en el HTML, abre `/download?preview` y revisa
  la consola.
- **Cambiar el diseño** (orden de secciones, saltos de página, tamaños): `layout.js`.

> `vendor/pdfmake/pdfmake.min.js` es la librería de PDF (versión fija 0.3.13, licencia MIT) y solo se carga en
> `/download`; el resto del sitio no pesa más por ella.

## Formulario de contacto: qué falta para que envíe correos

1. Sigue [apps-script/README.md](apps-script/README.md) (≈10 minutos): publicas un script de Google que envía
   la alerta al equipo y la confirmación al cliente.
2. Pega la URL que te da en `formEndpoint` de [scripts/config.js](scripts/config.js).

El mismo `config.js` guarda los datos de contacto que se muestran junto al formulario (correo, teléfono,
WhatsApp, LinkedIn). Solo aparecen los que estén llenos y sean válidos. `whatsapp` debe ser un **número con
indicativo** (ej. `573001234567`): un `@usuario` no se puede enlazar a WhatsApp, por eso no se muestra.

## Cómo editar

- **Textos de cada página:** directamente en `index.html` / `nosotros.html` (cada sección está comentada).
- **Sección de contacto o pie:** en `components/`.
- **Correos que se envían:** en `emails/` (ver [emails/README.md](emails/README.md)).
- **Colores:** variables al inicio de `styles/base.css`, tomadas de los logos: azul `#0a3a78`, turquesa
  `#008aa0`, verde `#10b090`.
- **Imágenes:** ver [IMAGENES.md](IMAGENES.md).
- **Tipografías:** Plus Jakarta Sans (títulos) y Nunito (texto) desde Google Fonts; sin conexión se usan las
  del sistema.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `ideohealth-portafolio`) y sube esta carpeta a la rama `main`,
   con `index.html` en la **raíz** del repositorio:

   ```bash
   cd portafolio
   git init
   git add .
   git commit -m "Sitio web IdeoHealth Group"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/ideohealth-portafolio.git
   git push -u origin main
   ```

2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta
   `/ (root)`.
3. En uno o dos minutos queda en `https://TU-USUARIO.github.io/ideohealth-portafolio/`. Las rutas son
   relativas, así que funciona igual en una subcarpeta o en un dominio propio.
4. Pon esa dirección en `SITE_URL` de Apps Script (los correos leen de ahí sus HTML y el logo).

### Vista previa al compartir el enlace

Para que WhatsApp, LinkedIn y otras redes muestren la imagen, cambia `og:image` en `index.html` y
`nosotros.html` por la URL **absoluta**, por ejemplo:

```html
<meta property="og:image" content="https://TU-USUARIO.github.io/ideohealth-portafolio/images/social/propuesta-valor.jpg" />
```
