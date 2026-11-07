/* ==========================================================================
   IdeoHealth Group — brief/extract.js
   Lee el contenido REAL del sitio (index.html, nosotros.html y los componentes) y lo
   convierte en datos para el PDF. El brief no tiene textos propios: si cambias un texto,
   un servicio, un integrante del equipo o una foto en el HTML, el PDF cambia solo.

   Cada función de abajo corresponde a una sección del sitio y usa los mismos selectores
   (clases e ids) que el HTML. Si renombras una clase del sitio, actualiza aquí su selector;
   si falta algo, la consola avisa con "[brief] ... no encontró".
   ========================================================================== */

import { validContactLinks } from "../contact-links.js";

/* ---------- utilidades ---------- */
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const text = (el) => (el ? norm(el.textContent) : "");
const one = (root, sel) => root?.querySelector(sel) ?? null;
const all = (root, sel) => [...(root?.querySelectorAll(sel) ?? [])];

function expect(label, value) {
  const empty = Array.isArray(value) ? value.length === 0 : !value;
  if (empty) console.warn(`[brief] "${label}" no encontró contenido en el sitio (¿cambió el HTML o su clase?).`);
  return value;
}

/**
 * Texto con formato en línea → fragmentos para pdfmake.
 * Respeta negritas (<b>, <strong>), cursivas (<em>) y marca con { accent: true } el texto
 * resaltado con degradado (.grad-text) para que el PDF lo pinte con el color de acento.
 */
export function inlineRuns(node) {
  const raw = [];
  const walk = (parent, style) => {
    parent.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const t = child.textContent.replace(/\s+/g, " ");
        if (t) raw.push({ text: t, ...style });
        return;
      }
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();
      if (["svg", "use", "script", "style", "noscript"].includes(tag)) return;
      if (child.getAttribute("aria-hidden") === "true") return;
      if (tag === "br") return raw.push({ text: "\n", ...style });
      const next = { ...style };
      if (tag === "b" || tag === "strong") next.bold = true;
      if (tag === "em" || tag === "i") next.italics = true;
      if (child.classList.contains("grad-text")) next.accent = true;
      walk(child, next);
    });
  };
  walk(node, {});

  // limpieza: quitar espacios duplicados entre fragmentos y recortar los bordes
  const out = [];
  for (const run of raw) {
    let t = run.text;
    const prev = out[out.length - 1];
    if (prev && /\s$/.test(prev.text) && /^\s/.test(t)) t = t.replace(/^\s+/, "");
    if (!out.length) t = t.replace(/^\s+/, "");
    if (t) out.push({ ...run, text: t });
  }
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, "");
  return out.filter((r) => r.text !== "");
}

const runsOf = (el) => (el ? inlineRuns(el) : []);

/* ---------- carga de páginas ---------- */
async function loadDocument(root, path) {
  const url = new URL(path, root);
  const res = await fetch(url, { cache: "no-store" }); // siempre la versión publicada más reciente
  if (!res.ok) throw new Error(`No se pudo leer ${path} (HTTP ${res.status}).`);
  return { doc: new DOMParser().parseFromString(await res.text(), "text/html"), url };
}

const abs = (el, attr, base) => {
  const value = el?.getAttribute(attr);
  return value ? new URL(value, base).href : "";
};

/** Posición del recorte de una imagen: lee `object-position: X% Y%` del propio HTML. */
function objectPosition(img) {
  const m = /object-position:\s*([\d.]+)%\s+([\d.]+)%/i.exec(img?.getAttribute("style") ?? "");
  return m ? { x: Number(m[1]) / 100, y: Number(m[2]) / 100 } : { x: 0.5, y: 0.5 };
}

/* ==========================================================================
   Extracción
   ========================================================================== */
export async function extractBrief(siteRoot) {
  const [home, about, contactCmp, footerCmp] = await Promise.all([
    loadDocument(siteRoot, "index.html"),
    loadDocument(siteRoot, "nosotros.html"),
    loadDocument(siteRoot, "components/contacto.html"),
    loadDocument(siteRoot, "components/footer.html"),
  ]);
  const idx = home.doc;
  const nos = about.doc;

  /* ----- Portada (hero de index.html) ----- */
  const h1 = one(idx, "#hero-title");
  const line1 = text(one(h1, ".line"));
  const accent = text(one(h1, ".grad-text"));
  const cover = {
    pill: text(one(idx, ".hero-pill")),
    line1: line1 || norm(h1?.textContent),
    line2: accent,
    lead: runsOf(one(idx, ".hero-lead")),
    stats: all(idx, ".hero-stats .stat").map((s) => ({
      value: text(one(s, "strong")),
      label: text(one(s, ":scope > span")),
    })),
    pillars: all(idx, ".pillars-list li").map(text),
    heroImage: abs(one(idx, ".hero-frame img"), "src", home.url),
    heroPosition: objectPosition(one(idx, ".hero-frame img")),
  };
  expect("Portada: título", cover.line1);
  expect("Portada: cifras", cover.stats);

  /* ----- Logos: se toman de las imágenes del propio sitio ----- */
  const logos = {
    header: abs(one(idx, ".brand img"), "src", home.url),
    // Las imágenes de un componente se resuelven desde la página que lo inserta (la raíz del sitio)
    footer: abs(one(footerCmp.doc, ".footer-brand img"), "src", home.url),
  };
  expect("Logo del encabezado", logos.header);

  /* ----- Nuestra historia (nosotros.html) ----- */
  const storySec = one(nos, "#historia");
  const story = {
    eyebrow: text(one(storySec, ".eyebrow")),
    title: runsOf(one(storySec, "h2")),
    steps: all(storySec, ".story-step").map((s) => ({
      title: text(one(s, "h3")),
      paragraphs: all(s, "p").map(inlineRuns),
    })),
    quote: runsOf(one(storySec, ".quote-band p")),
    badge: { value: text(one(storySec, ".years-badge strong")), label: text(one(storySec, ".years-badge span")) },
  };
  expect("Nuestra historia: pasos", story.steps);

  /* ----- Razón de ser y visión ----- */
  const purpose = all(nos, "#proposito .purpose-card").map((c) => ({
    tag: text(one(c, ".year-tag")),
    title: text(one(c, "h2")),
    text: runsOf(one(c, "p")),
    dark: c.classList.contains("dark"),
  }));
  expect("Razón de ser y visión", purpose);

  /* ----- Valores ----- */
  const valuesSec = one(nos, "#valores");
  const values = {
    eyebrow: text(one(valuesSec, ".eyebrow")),
    title: runsOf(one(valuesSec, "h2")),
    items: all(valuesSec, ".value-card").map((c) => ({ title: text(one(c, "h3")), text: runsOf(one(c, "p")) })),
  };
  expect("Valores", values.items);

  /* ----- Propuesta de valor ----- */
  const propSec = one(nos, "#propuesta");
  const proposal = {
    eyebrow: text(one(propSec, ".eyebrow")),
    title: runsOf(one(propSec, "h2")),
    tagline: all(propSec, ".proposal-tagline span").map(inlineRuns),
    pillars: all(propSec, ".pillar").map((p) => ({
      label: text(one(p, ".pillar-label")),
      text: runsOf(one(p, "p")),
      tone: p.classList.contains("green") ? "green" : p.classList.contains("teal") ? "teal" : "navy",
    })),
  };
  expect("Propuesta de valor: pilares", proposal.pillars);

  /* ----- Servicios ----- */
  const servSec = one(idx, "#servicios");
  const services = {
    eyebrow: text(one(servSec, ".eyebrow")),
    title: runsOf(one(servSec, "h2")),
    lead: runsOf(one(servSec, ".section-head .lead")),
    items: all(servSec, ".service-card").map((c) => ({
      no: text(one(c, ".service-no")),
      title: text(one(c, "h3")),
      bullets: all(c, ".check-list li").map(inlineRuns),
    })),
  };
  expect("Servicios", services.items);

  /* ----- Metodología ----- */
  const methSec = one(idx, "#metodologia");
  const method = {
    eyebrow: text(one(methSec, ".eyebrow")),
    title: runsOf(one(methSec, "h2")),
    lead: runsOf(one(methSec, ".section-head .lead")),
    steps: all(methSec, ".step").map((s) => ({
      no: text(one(s, ".step-no")),
      kicker: text(one(s, ".step-kicker")),
      title: text(one(s, "h3")),
      text: runsOf(one(s, "p")),
    })),
  };
  expect("Metodología", method.steps);

  /* ----- Equipo ----- */
  const teamSec = one(nos, "#equipo");
  const team = {
    eyebrow: text(one(teamSec, ".eyebrow")),
    title: runsOf(one(teamSec, "h2")),
    lead: runsOf(one(teamSec, ".section-head .lead")),
    members: all(teamSec, ".member").map((m) => {
      const img = one(m, "img");
      return {
        name: text(one(m, "h3")),
        role: text(one(m, ".role")),
        bios: all(m, ".bio").map(inlineRuns),
        tags: all(m, ".tags li").map(text),
        photo: abs(img, "src", about.url),
        photoPosition: objectPosition(img),
      };
    }),
  };
  expect("Equipo", team.members);

  /* ----- Contacto (componente compartido + config.js) ----- */
  const cc = contactCmp.doc;
  const contact = {
    eyebrow: text(one(cc, ".contact-info .eyebrow")),
    title: runsOf(one(cc, ".contact-info h2")),
    lead: runsOf(one(cc, ".contact-lead")),
    steps: all(cc, ".contact-steps li").map((li) => ({
      title: text(one(li, "strong")),
      text: text(one(li, ":scope > div > span")),
    })),
    commitment: text(one(cc, ".contact-commitment")),
    links: validContactLinks(), // los mismos datos que muestra el formulario del sitio
  };
  expect("Contacto: pasos", contact.steps);

  /* ----- Sitio ----- */
  const siteUrl = new URL(siteRoot).href;
  return {
    generatedAt: new Date(),
    site: { url: siteUrl, display: siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "") },
    cover,
    logos,
    story,
    purpose,
    values,
    proposal,
    services,
    method,
    team,
    contact,
  };
}
