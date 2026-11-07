# Imágenes del sitio: dónde cambiarlas

Todas las imágenes salen del PDF `Ideo Health Group.docx.pdf`, extraídas con su resolución original
(que en varios casos es baja) y optimizadas para web. **Para reemplazar una imagen, guarda la nueva
con el mismo nombre y la misma extensión en la misma carpeta**, y listo: no hay que tocar código.
Si cambias de formato (por ejemplo de `.jpg` a `.png`), edita también la ruta `src="..."` en
[index.html](index.html) (busca el nombre del archivo).

## Prioridad: las que más conviene mejorar

Estas son las que hoy se ven más borrosas porque el PDF las trae en muy baja resolución.

| Prioridad | Archivo | Resolución actual | Resolución recomendada |
|---|---|---|---|
| 1 | `images/team/dayra-castellanos.jpg` | 116×143 px originales (ampliada a 300×300) | 600×600 px o más |
| 2 | `images/story/historia-medico.jpg` | 298×362 px | 1000×1220 px o más |
| 3 | `images/team/vivian-aguilar.jpg` | 294×329 px originales (recortada a 256×256) | 600×600 px o más, **sin** el círculo punteado rojo |
| 4 | `images/team/paula-guzman.jpg` | 211×240 px | 600×600 px o más |
| 5 | Los 3 logos de `images/brand/` | ~417 px de ancho | SVG, o PNG transparente de 1200 px de ancho o más |

## Lista completa

### Marca (`images/brand/`)

| Archivo | Dónde se ve | Actual | Recomendado y notas |
|---|---|---|---|
| `logo-horizontal-nav.png` | Barra de navegación (arriba a la izquierda), sello de la sección de contacto y encabezado de los dos correos (se carga desde el sitio publicado) | 417×103 | SVG o PNG con **fondo transparente**, 1200 px de ancho o más. Es el logo horizontal **sin** el lema "Soluciones integrales para organizaciones de salud" (a ese tamaño no se leería). |
| `logo-horizontal.png` | Pie de página (se muestra en **blanco** por CSS) | 417×144 | SVG o PNG con **fondo transparente** obligatorio, 700 px de ancho o más. Con el lema incluido. En el pie el CSS lo convierte a silueta blanca, por eso no puede tener fondo. |
| `logo-principal.png` | **Ya no se usa en el sitio** (antes iba en la tarjeta de cierre; ahora el contacto usa el mismo logo del encabezado). Es el logo del foco con "Healthcare Venture Structuring & Advisory"; se conserva por si lo quieren usar en otro lugar. | 374×254 | PNG o SVG con **fondo transparente**, 600 px de ancho o más. |
| `favicon.svg` | Pestaña del navegador | SVG | **Lo dibujé yo** con los colores de marca (cruz blanca sobre degradado); no viene del PDF. Cámbialo por el ícono oficial si existe. |

### Hero y secciones (`images/hero/`, `images/story/`)

| Archivo | Dónde se ve | Actual | Recomendado y notas |
|---|---|---|---|
| `images/hero/hero-banner.jpg` | Portada, imagen grande de las tres profesionales | 1470×739 | 2000×1200 px o más. El recuadro recorta la imagen (más cuadrada en escritorio, 1.45:1 en móvil), así que deja a las personas hacia el centro-derecha. |
| `images/story/historia-medico.jpg` | "Nuestra historia", imagen en arco del médico pensativo | 298×362 | Retrato vertical (proporción 4:5), 1000×1220 px o más. Se recorta en forma de arco con el rostro en la parte superior. |

### Redes sociales (`images/social/`)

| Archivo | Dónde se ve | Actual | Recomendado y notas |
|---|---|---|---|
| `images/social/propuesta-valor.jpg` | Vista previa al compartir el enlace (WhatsApp, LinkedIn, etc.) | 1115×743 | Exactamente **1200×630 px**. Importante: para que funcione hay que poner la **URL absoluta** en la etiqueta `og:image` de `index.html` (ver [README.md](README.md)). |

### Equipo (`images/team/`)

Se muestran como círculo de ~154 px. Usa fotos **cuadradas**, con el rostro centrado, de 600×600 px o más.

| Archivo | Persona | Actual | Notas |
|---|---|---|---|
| `dayra-castellanos.jpg` | Dayra Castellanos | 300×300 (origen 116×143) | Muy baja resolución. |
| `vivian-aguilar.jpg` | Vivian Stefany Aguilar R. | 256×256 (origen 294×329) | El original traía un círculo punteado rojo y fondo azul oscuro incrustados; los recorté. Una foto limpia se verá mucho mejor. |
| `uriel-guevara.jpg` | Uriel Alberto Guevara Mosquera | 394×569 | Si la nueva foto es vertical, el rostro se encuadra con `object-position` en `index.html`. |
| `paula-guzman.jpg` | Paula Daniela Guzmán Zabala | 211×240 | Baja resolución. |
| `fabian-guevara.jpg` | Fabián Ricardo Guevara Santamaría | 741×988 | Resolución aceptable, pero la foto está sobreexpuesta. |

## Imágenes del PDF que **no** se usan como imagen

Las rehice como contenido nativo de la página para que el texto se vea nítido y se pueda editar:

- **Infográfico de "Propuesta de valor"** (Experiencia · Integración · Ejecución): ahora es la sección
  "Propuesta de valor". Solo se reutiliza como vista previa en redes (`propuesta-valor.jpg`) y su
  recorte del médico en `historia-medico.jpg`.
- **Tarjetas de "Metodología de acompañamiento"** (Diagnóstico · Estructuración · Implementación): ahora
  es la sección "Metodología" en `index.html`.
- **Logo con fondo azul difuminado** (el del pie de cada página del PDF): lo reemplacé por una versión con
  fondo transparente (`logo-horizontal.png` y `logo-horizontal-nav.png`) para poder usarlo sobre cualquier color.

## El brief en PDF usa estas mismas imágenes

El PDF de `/download` toma del sitio la imagen de portada (`images/hero/hero-banner.jpg`), las 5 fotos del equipo
(`images/team/`) y los logos (`images/brand/`). Si reemplazas una por otra de mejor resolución, el PDF la usa
automáticamente. Las fotos se recortan igual que en el sitio (usa el mismo `object-position` del HTML) y el logo
del pie se vuelve blanco por código para la franja oscura, así que debe tener **fondo transparente**.
