/* ==========================================================================
   IdeoHealth Group — components.js
   Cargador de componentes HTML compartidos.

   Cualquier <div data-include="components/archivo.html"></div> se reemplaza por el
   contenido de ese archivo. Así la sección de contacto y el pie de página se editan
   una sola vez y cambian en todas las páginas.

   Nota: usa fetch(), por lo que el sitio debe abrirse desde un servidor
   (GitHub Pages o `python3 -m http.server`), no con doble clic sobre el archivo.
   ========================================================================== */

const FALLBACK_HTML = `
  <div class="noscript-note">
    No pudimos cargar esta sección. Recarga la página para intentarlo de nuevo.
  </div>`;

export async function includeComponents(root = document) {
  const slots = [...root.querySelectorAll("[data-include]")];

  await Promise.all(
    slots.map(async (slot) => {
      const url = slot.dataset.include;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        slot.innerHTML = await res.text();
      } catch (err) {
        console.error(
          `[components] No se pudo cargar "${url}" (${err.message}). ` +
            "Si abriste el archivo con doble clic, usa un servidor local: python3 -m http.server"
        );
        slot.innerHTML = FALLBACK_HTML;
      } finally {
        slot.dataset.loaded = "true";
      }
    })
  );

  return slots;
}
