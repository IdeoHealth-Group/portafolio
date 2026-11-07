/* ==========================================================================
   IdeoHealth Group — main.js
   Punto de entrada común a todas las páginas.
   La configuración editable (URL del formulario y datos de contacto) está en config.js.
   ========================================================================== */

import { includeComponents } from "./components.js";
import { initContactForm, initContactLinks } from "./contact-form.js";
import {
  initCounters,
  initHeader,
  initMenu,
  initSamePageLinks,
  initScrollSpy,
  observeReveals,
  setYear,
} from "./ui.js";

// 1) Lo que ya está en el HTML se activa de inmediato.
initHeader();
initMenu();
initSamePageLinks();
observeReveals(document);
initCounters(document);
initScrollSpy();

// 2) Los componentes compartidos (contacto y pie) se cargan y luego se activan.
includeComponents().then((slots) => {
  slots.forEach((slot) => observeReveals(slot));
  setYear();
  initContactLinks();
  initContactForm();

  // Si la URL apunta a una sección que vive en un componente (ej. #contacto), vamos hasta ella.
  if (location.hash.length > 1) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && slots.some((slot) => slot.contains(target))) {
      target.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }
});
