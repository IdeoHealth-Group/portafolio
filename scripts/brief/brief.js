/* ==========================================================================
   IdeoHealth Group — brief/brief.js
   Genera el brief en PDF con la información ACTUAL del sitio.

   Flujo:  extract.js (lee el HTML del sitio)  →  assets.js (fuentes, colores, imágenes)
           →  layout.js (diseño)  →  pdfmake (PDF)

   Se ejecuta en el navegador cada vez que alguien abre /download, así que el PDF nunca queda
   desactualizado: no hay ningún archivo PDF guardado en el repositorio.
   ========================================================================== */

import { FONT_FAMILIES, buildImages, loadFontFiles, readTokens } from "./assets.js";
import { extractBrief } from "./extract.js";
import { buildDocDefinition } from "./layout.js";

/** Raíz del sitio, calculada desde la ubicación de este archivo (sirve en GitHub Pages con subcarpeta). */
export const SITE_ROOT = new URL("../../", import.meta.url);
export const FILE_NAME = "IdeoHealth-Group-Brief.pdf";

export async function createBrief({ onStatus = () => {}, siteRoot = SITE_ROOT } = {}) {
  const pdfMake = window.pdfMake;
  if (!pdfMake) throw new Error("No se cargó la librería de PDF (vendor/pdfmake/pdfmake.min.js).");

  onStatus("Leyendo la información más reciente del sitio…");
  const tokens = readTokens();
  const [data, vfs] = await Promise.all([extractBrief(siteRoot), loadFontFiles(siteRoot)]);

  onStatus("Preparando imágenes y tipografías…");
  const assets = await buildImages(data, tokens);

  onStatus("Armando el documento…");
  pdfMake.setUrlAccessPolicy(() => false); // todo viaja embebido: el PDF no descarga nada externo
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFonts(FONT_FAMILIES);
  return pdfMake.createPdf(buildDocDefinition(data, assets, tokens));
}
