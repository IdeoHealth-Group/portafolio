/* ==========================================================================
   IdeoHealth Group — contact-links.js
   Convierte los datos de contacto de config.js en enlaces válidos.
   Lo usan la sección de contacto del sitio y el brief en PDF (/download),
   así ambos siempre muestran los mismos datos.
   ========================================================================== */

import { CONFIG } from "./config.js";

export const linkBuilders = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { href: `mailto:${v}`, text: v } : null),
  phone: (v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 7 ? { href: `tel:${v.replace(/[^+\d]/g, "")}`, text: v } : null;
  },
  // wa.me solo acepta números de teléfono (con indicativo de país), no usuarios.
  whatsapp: (v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 7 ? { href: `https://wa.me/${digits}`, text: "WhatsApp" } : null;
  },
  linkedin: (v) => (/^https?:\/\//i.test(v) ? { href: v, text: "LinkedIn" } : null),
};

/** Devuelve los datos de contacto válidos: [{ key, href, text }]. Los vacíos o inválidos se omiten. */
export function validContactLinks(contact = CONFIG.contact ?? {}) {
  const links = [];
  for (const [key, build] of Object.entries(linkBuilders)) {
    const value = String(contact[key] ?? "").trim();
    if (!value) continue;
    const link = build(value);
    if (!link) {
      console.warn(`[config] contact.${key} = "${value}" no es válido y no se muestra.`);
      continue;
    }
    links.push({ key, ...link });
  }
  return links;
}
