/* ==========================================================================
   IdeoHealth Group — ui.js
   Comportamientos de interfaz: encabezado, menú móvil, animaciones de entrada,
   enlaces internos, resaltado de sección activa y contadores.
   ========================================================================== */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Rutas: "/repo/", "/repo/index.html" y "/repo/index" son la misma página ---------- */
const normPath = (p) => p.replace(/\.html$/, "").replace(/\/index$/, "/");
const isSamePage = (url) => url.origin === location.origin && normPath(url.pathname) === normPath(location.pathname);

/* ---------- Encabezado: sombra al hacer scroll ---------- */
export function initHeader() {
  const header = $(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Menú móvil ---------- */
export function initMenu() {
  const header = $(".site-header");
  const toggle = $(".nav-toggle");
  const menu = $("#menu");
  if (!header || !toggle || !menu) return;

  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });
}

/* ---------- Enlaces a una sección de la misma página (desplazamiento suave) ----------
   Funciona también con enlaces como "index.html#servicios" estando ya en index.html,
   y con los que viven en componentes cargados después (pie de página). */
export function initSamePageLinks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;

    const url = new URL(a.href, location.href);
    if (url.hash.length < 2 || !isSamePage(url)) return;

    const behavior = prefersReducedMotion ? "auto" : "smooth";

    // "#top" apunta al encabezado, que tiene posición fija: desplazarse "hasta él" no mueve la página.
    if (url.hash === "#top") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior });
      history.pushState(null, "", location.pathname + location.search);
      return;
    }

    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior, block: "start" });
    history.pushState(null, "", url.hash);
  });
}

/* ---------- Animación de entrada al hacer scroll ---------- */
let revealObserver = null;

export function observeReveals(root = document) {
  const items = $$(".reveal", root).filter((el) => !el.dataset.revealSeen);
  items.forEach((el) => (el.dataset.revealSeen = "1"));

  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  revealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  items.forEach((el) => revealObserver.observe(el));
}

/* ---------- Menú: resalta la sección activa (solo enlaces de la página actual) ---------- */
export function initScrollSpy() {
  if (!("IntersectionObserver" in window)) return;

  const items = $$(".nav-links a[href*='#']")
    .map((a) => ({ a, url: new URL(a.href, location.href) }))
    .filter(({ url }) => url.hash.length > 1 && isSamePage(url))
    .map((item) => ({ ...item, section: document.getElementById(item.url.hash.slice(1)) }))
    .filter((item) => item.section);
  if (!items.length) return;

  let current = null;
  const setActive = (id) => {
    current = id;
    items.forEach(({ a, url }) => a.classList.toggle("is-active", url.hash === `#${id}`));
  };

  const spy = new IntersectionObserver(
    (entries) => {
      // Primero los que salen, luego los que entran, para no apagar la sección nueva.
      [...entries]
        .sort((x, y) => Number(x.isIntersecting) - Number(y.isIntersecting))
        .forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
          else if (entry.target.id === current) {
            current = null;
            items.forEach(({ a }) => a.classList.remove("is-active"));
          }
        });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  items.forEach(({ section }) => spy.observe(section));
}

/* ---------- Contadores de las cifras del hero ---------- */
export function initCounters(root = document) {
  const counters = $$(".count", root);
  if (!counters.length || !("IntersectionObserver" in window) || prefersReducedMotion) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = "0";
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => io.observe(el));
}

/* ---------- Año del pie de página ---------- */
export function setYear() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
}
