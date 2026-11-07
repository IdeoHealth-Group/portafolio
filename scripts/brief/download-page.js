/* ==========================================================================
   IdeoHealth Group — brief/download-page.js
   Controla la página /download: genera el PDF y lo descarga automáticamente.

   · /download           → genera y descarga el brief.
   · /download?preview   → lo muestra en la propia página (útil para revisar el diseño).
   ========================================================================== */

import { FILE_NAME, createBrief } from "./brief.js";

const $ = (selector) => document.querySelector(selector);
const STATES = ["loading", "done", "error", "preview"];
const preview = new URLSearchParams(location.search).has("preview");

let pdf = null;

function show(state) {
  STATES.forEach((s) => {
    const el = $(`[data-state="${s}"]`);
    if (el) el.hidden = s !== state;
  });
  document.body.dataset.view = state;
}

async function run() {
  show("loading");
  try {
    pdf ??= await createBrief({ onStatus: (text) => ($("[data-status]").textContent = text) });

    if (preview) {
      const blob = await pdf.getBlob();
      $("[data-preview-frame]").src = URL.createObjectURL(blob);
      show("preview");
      return;
    }

    $("[data-status]").textContent = "Descargando…";
    await pdf.download(FILE_NAME);
    show("done");
  } catch (err) {
    console.error("[brief]", err);
    $("[data-error-detail]").textContent = err?.message || String(err);
    show("error");
  }
}

document.querySelectorAll("[data-download]").forEach((button) =>
  button.addEventListener("click", async () => {
    if (pdf) await pdf.download(FILE_NAME);
    else run();
  })
);
document.querySelectorAll("[data-retry]").forEach((button) =>
  button.addEventListener("click", () => {
    pdf = null;
    run();
  })
);

run();
