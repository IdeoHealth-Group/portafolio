/* ==========================================================================
   IdeoHealth Group — contact-form.js
   Lógica del componente components/contacto.html:
   · datos de contacto opcionales (desde config.js)
   · validación del formulario, envío y estados de éxito / error

   El envío va a la app web de Google Apps Script (apps-script/Code.gs), que manda
   el correo de alerta al equipo y el correo de confirmación a quien escribió.
   ========================================================================== */

import { CONFIG } from "./config.js";
import { linkBuilders, validContactLinks } from "./contact-links.js";

const MAX_MESSAGE = 1500;
const SEND_TIMEOUT_MS = 25000;
const IS_LOCAL = ["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ==========================================================================
   Datos de contacto opcionales
   ========================================================================== */
export function initContactLinks(root = document) {
  const list = root.querySelector("[data-contact-list]");
  if (!list) return;

  let any = false;
  for (const link of validContactLinks()) {
    const item = list.querySelector(`[data-contact="${link.key}"]`);
    if (!item) continue;
    const a = item.querySelector("a");
    a.href = link.href;
    a.querySelector("span").textContent = link.text;
    item.hidden = false;
    any = true;
  }
  list.hidden = !any;
}

/* ==========================================================================
   Validación (mensajes en español)
   ========================================================================== */
const validators = {
  name: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre."),
  company: () => "",
  phone: (v) => {
    const t = v.trim();
    if (!t) return "Escribe tu número de teléfono o WhatsApp.";
    if (!/^[+\d\s().-]+$/.test(t)) return "Usa solo números, espacios y el signo +.";
    const digits = t.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15 ? "" : "Escribe un número válido (entre 7 y 15 dígitos).";
  },
  email: (v) => {
    const t = v.trim();
    if (!t) return "Escribe tu correo electrónico.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? "" : "Revisa el correo, parece incompleto (ej. nombre@empresa.com).";
  },
  service: (v) => (v ? "" : "Selecciona el servicio que te interesa."),
  message: (v) => {
    const len = v.trim().length;
    if (len < 20) return `Cuéntanos un poco más (mínimo 20 caracteres, llevas ${len}).`;
    return len > MAX_MESSAGE ? `El mensaje es muy largo (máximo ${MAX_MESSAGE} caracteres).` : "";
  },
  consent: (_v, el) => (el.checked ? "" : "Necesitamos tu autorización para poder contactarte."),
};

const FIELD_NAMES = Object.keys(validators);

/* ==========================================================================
   Envío
   ========================================================================== */
class SendError extends Error {
  constructor(code, details) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

async function sendRequest(payload) {
  if (!CONFIG.formEndpoint) {
    if (IS_LOCAL) {
      console.info("[formulario · modo demostración] No hay formEndpoint en config.js; no se envió nada.", payload);
      await sleep(1200);
      return { ok: true, demo: true };
    }
    throw new SendError("endpoint-missing");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  let data;
  try {
    // text/plain evita la comprobación previa (preflight) de CORS que Apps Script no responde.
    const res = await fetch(CONFIG.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    data = await res.json();
  } catch (err) {
    throw new SendError(err.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }

  if (!data?.ok) throw new SendError(data?.error || "server", data?.details);
  return data;
}

/* ==========================================================================
   Formulario
   ========================================================================== */
export function initContactForm(root = document) {
  const form = root.querySelector("#contact-form");
  if (!form || form.dataset.ready) return;
  form.dataset.ready = "1";

  const view = root.querySelector("[data-form-view]");
  const success = root.querySelector("[data-form-success]");
  const alertBox = root.querySelector("[data-form-alert]");
  const alertText = root.querySelector("[data-form-alert-text]");
  const submitBtn = form.querySelector(".btn-submit");
  const counter = root.querySelector("[data-char-count]");
  const startedAt = performance.now();
  const touched = new Set();
  let sending = false;

  const control = (name) => form.elements[name];
  const fieldBox = (name) => control(name).closest(".field");

  /* ----- errores por campo ----- */
  function setFieldError(name, message) {
    const box = fieldBox(name);
    const input = control(name);
    box.classList.toggle("has-error", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    box.querySelector(".field-error").textContent = message;
  }

  function validateField(name) {
    const input = control(name);
    const message = validators[name](input.type === "checkbox" ? String(input.checked) : input.value, input);
    setFieldError(name, message);
    return !message;
  }

  function validateAll() {
    const invalid = FIELD_NAMES.filter((name) => !validateField(name));
    if (invalid.length) control(invalid[0]).focus();
    return invalid.length === 0;
  }

  /* ----- aviso de error de envío ----- */
  function showAlert(message, withMailFallback = true) {
    alertText.replaceChildren(document.createTextNode(message));

    const email = String(CONFIG.contact?.email ?? "").trim();
    if (withMailFallback && linkBuilders.email(email)) {
      const body = [
        `Nombre: ${control("name").value.trim()}`,
        `Empresa: ${control("company").value.trim() || "-"}`,
        `Teléfono: ${control("phone").value.trim()}`,
        `Servicio: ${control("service").value || "-"}`,
        "",
        control("message").value.trim(),
      ].join("\n");
      const link = document.createElement("a");
      link.href = `mailto:${email}?subject=${encodeURIComponent("Solicitud de contacto")}&body=${encodeURIComponent(body)}`;
      link.textContent = email;
      alertText.append(" También puedes escribirnos directamente a ", link, ".");
    }
    alertBox.hidden = false;
  }

  const hideAlert = () => (alertBox.hidden = true);

  function explainError(err) {
    switch (err.code) {
      case "validation": {
        const details = err.details && typeof err.details === "object" ? err.details : {};
        const names = Object.keys(details).filter((n) => FIELD_NAMES.includes(n));
        names.forEach((n) => setFieldError(n, String(details[n])));
        if (names.length) control(names[0]).focus();
        return showAlert("Revisa los campos marcados e inténtalo de nuevo.", false);
      }
      case "rate_limited":
        return showAlert("Ya recibimos una solicitud con este correo hace unos minutos. Espera un momento antes de enviar otra.");
      case "endpoint-missing":
        return showAlert("El envío todavía no está configurado en este sitio.");
      case "timeout":
        return showAlert("La solicitud tardó demasiado en responder. Inténtalo de nuevo en un momento.");
      default:
        return showAlert("No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  /* ----- contador de caracteres ----- */
  function updateCounter() {
    const len = control("message").value.length;
    counter.textContent = `${len} / ${MAX_MESSAGE}`;
    counter.classList.toggle("is-near", len > MAX_MESSAGE * 0.92);
  }

  /* ----- eventos de cada campo ----- */
  FIELD_NAMES.forEach((name) => {
    const input = control(name);
    const isChoice = input.tagName === "SELECT" || input.type === "checkbox";

    input.addEventListener(isChoice ? "change" : "blur", () => {
      touched.add(name);
      validateField(name);
    });
    if (!isChoice) {
      input.addEventListener("input", () => {
        if (touched.has(name) || fieldBox(name).classList.contains("has-error")) validateField(name);
      });
    }
  });
  control("message").addEventListener("input", updateCounter);

  /* ----- enviar ----- */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;

    hideAlert();
    if (!validateAll()) return;

    sending = true;
    submitBtn.classList.add("is-loading");
    submitBtn.setAttribute("aria-disabled", "true");
    submitBtn.querySelector(".btn-label").textContent = "Enviando…";

    const payload = {
      name: control("name").value.trim(),
      company: control("company").value.trim(),
      phone: control("phone").value.trim(),
      email: control("email").value.trim(),
      service: control("service").value,
      message: control("message").value.trim(),
      consent: control("consent").checked,
      website: form.elements.website.value, // campo trampa: debe llegar vacío
      elapsed: Math.round(performance.now() - startedAt),
      page: location.pathname.split("/").pop() || "index.html",
    };

    try {
      const result = await sendRequest(payload);
      showSuccess(payload, Boolean(result.demo));
    } catch (err) {
      if (!(err instanceof SendError)) console.error(err);
      explainError(err instanceof SendError ? err : new SendError("network"));
    } finally {
      sending = false;
      submitBtn.classList.remove("is-loading");
      submitBtn.removeAttribute("aria-disabled");
      submitBtn.querySelector(".btn-label").textContent = "Enviar solicitud";
    }
  });

  /* ----- estado de éxito ----- */
  function showSuccess(payload, demo) {
    success.querySelector("[data-success-name]").textContent = payload.name.split(/\s+/)[0];
    success.querySelector("[data-success-email]").textContent = payload.email;
    success.querySelector("[data-success-demo]").hidden = !demo;
    view.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  root.querySelector("[data-form-reset]")?.addEventListener("click", () => {
    form.reset();
    touched.clear();
    FIELD_NAMES.forEach((name) => setFieldError(name, ""));
    updateCounter();
    hideAlert();
    success.hidden = true;
    view.hidden = false;
    control("name").focus();
  });
}
