/**
 * IdeoHealth Group — Backend del formulario de contacto (Google Apps Script)
 *
 * Qué hace cuando alguien envía el formulario del sitio:
 *   1. Valida los datos y descarta bots (campo trampa, tiempo mínimo, límites).
 *   2. Envía un correo de ALERTA al equipo (TEAM_EMAILS), con "Responder" apuntando al cliente.
 *   3. Envía un correo de CONFIRMACIÓN al cliente diciéndole que en pocas horas lo contactarán.
 *
 * Los correos usan los HTML de la carpeta /emails del repositorio. El script los lee del sitio
 * publicado (SITE_URL) en cada envío, así que editar esos HTML y publicarlos en GitHub Pages
 * basta: NO hay que volver a pegar nada aquí. Si el sitio no responde, usa una versión sencilla
 * de respaldo para que el correo salga igual.
 *
 * Instalación paso a paso: ver apps-script/README.md
 */

/* ==========================================================================
   CONFIGURACIÓN  ←  EDITA SOLO ESTA SECCIÓN (en el editor de Apps Script)
   ========================================================================== */
const CONFIG = {
  // Correos que reciben la alerta de cada solicitud (uno o varios).
  TEAM_EMAILS: ['ideohealthgroup@gmail.com'],

  // Correo al que le llega la respuesta si el cliente contesta la confirmación.
  // Si lo dejas vacío se usa el primero de TEAM_EMAILS.
  REPLY_TO: '',

  // Nombre que aparece como remitente y dentro de los correos.
  BRAND_NAME: 'IdeoHealth Group',

  // Dirección del sitio publicado, SIN "/" al final. De aquí se leen los HTML de los correos
  // y el logo. Ej.: 'https://tu-usuario.github.io/ideohealth-portafolio'
  SITE_URL: '',

  // Asuntos. Puedes usar {{nombre}}, {{servicio}}, {{marca}}, {{empresa}}.
  SUBJECT_TEAM: 'Nueva solicitud de contacto · {{servicio}} · {{nombre}}',
  SUBJECT_CLIENT: 'Recibimos tu solicitud · {{marca}}',

  TIMEZONE: 'America/Bogota',

  // Protección contra abuso
  COOLDOWN_SECONDS: 120, // un mismo correo no puede enviar otra solicitud antes de este tiempo
  DAILY_LIMIT: 80, // máximo de solicitudes por día (cada una envía 2 correos; Gmail permite ~100/día)
  MIN_FILL_MS: 1500, // si el formulario se envía más rápido que esto, se considera un bot
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/* ==========================================================================
   Puntos de entrada de la app web
   ========================================================================== */

/** Abrir la URL de la app en el navegador sirve para comprobar que está publicada. */
function doGet() {
  return json_({ ok: true, service: 'ideohealth-contact-form' });
}

/** Recibe el formulario (JSON enviado como text/plain para evitar el preflight de CORS). */
function doPost(e) {
  try {
    const data = parseBody_(e);

    // Bots: campo trampa lleno o formulario enviado demasiado rápido → fingimos éxito y no enviamos nada.
    if (data.website) return json_({ ok: true });
    if (!(Number(data.elapsed) >= CONFIG.MIN_FILL_MS)) return json_({ ok: true });

    const clean = sanitize_(data);
    const errors = validate_(clean);
    if (Object.keys(errors).length) return json_({ ok: false, error: 'validation', details: errors });

    const blocked = checkLimits_(clean.email);
    if (blocked) return json_({ ok: false, error: blocked });

    processSubmission_(clean);
    return json_({ ok: true });
  } catch (err) {
    console.error('doPost falló: ' + (err && err.stack ? err.stack : err));
    return json_({ ok: false, error: 'server' });
  }
}

/**
 * Ejecuta esta función DESDE EL EDITOR (botón ▶) para autorizar permisos y probar los correos.
 * Envía la alerta y la confirmación de ejemplo al primer correo de TEAM_EMAILS.
 */
function probarEnvio() {
  const clean = sanitize_({
    name: 'María Fernanda Rojas',
    company: 'Clínica Santa Aurora',
    phone: '+57 300 123 4567',
    email: CONFIG.TEAM_EMAILS[0],
    service: 'Calidad y Seguridad Clínica',
    message:
      'Somos una clínica de mediana complejidad en Bogotá y estamos preparando la renovación de la acreditación.\n' +
      'Necesitamos apoyo para diseñar el programa de seguridad del paciente.',
  });
  processSubmission_(clean);
  console.log('Listo. Revisa la bandeja (y spam) de ' + CONFIG.TEAM_EMAILS[0]);
}

/* ==========================================================================
   Procesamiento
   ========================================================================== */

function processSubmission_(d) {
  if (!CONFIG.TEAM_EMAILS.length) throw new Error('Configura CONFIG.TEAM_EMAILS.');

  const vars = buildVars_(d);

  // 1) Alerta al equipo (si falla, se propaga el error: no queremos perder el contacto).
  sendMail_({
    to: CONFIG.TEAM_EMAILS.join(','),
    subject: fill_(CONFIG.SUBJECT_TEAM, vars.raw),
    body: teamText_(vars.raw),
    htmlBody: render_('notificacion-equipo.html', vars, 'team'),
    replyTo: d.email,
    name: CONFIG.BRAND_NAME + ' · Formulario web',
  });

  // 2) Confirmación al cliente (si falla, el equipo ya fue avisado; solo se registra el error).
  try {
    sendMail_({
      to: d.email,
      subject: fill_(CONFIG.SUBJECT_CLIENT, vars.raw),
      body: clientText_(vars.raw),
      htmlBody: render_('confirmacion-cliente.html', vars, 'client'),
      replyTo: CONFIG.REPLY_TO || CONFIG.TEAM_EMAILS[0],
      name: CONFIG.BRAND_NAME,
    });
  } catch (err) {
    console.error('No se pudo enviar la confirmación a ' + d.email + ': ' + err);
  }
}

function sendMail_(opts) {
  MailApp.sendEmail({
    to: opts.to,
    subject: opts.subject,
    body: opts.body,
    htmlBody: opts.htmlBody,
    name: opts.name,
    replyTo: opts.replyTo,
  });
}

/* ==========================================================================
   Datos: lectura, limpieza y validación
   ========================================================================== */

function parseBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  try {
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    return {};
  }
}

function text_(value, max, keepNewlines) {
  let s = String(value == null ? '' : value).replace(/\r\n?/g, '\n');
  s = s.replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ');
  if (keepNewlines) s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim().slice(0, max);
}

function sanitize_(d) {
  return {
    name: text_(d.name, 100),
    company: text_(d.company, 120),
    phone: text_(d.phone, 30),
    email: text_(d.email, 120).toLowerCase(),
    service: text_(d.service, 80),
    message: text_(d.message, 1500, true),
    consent: d.consent === true || d.consent === 'true',
  };
}

function validate_(d) {
  const errors = {};
  if (d.name.length < 2) errors.name = 'Escribe tu nombre.';

  const phoneDigits = d.phone.replace(/\D/g, '').length;
  if (!/^[+\d\s().-]+$/.test(d.phone) || phoneDigits < 7 || phoneDigits > 15) {
    errors.phone = 'Escribe un número de teléfono válido.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = 'Escribe un correo válido.';
  if (!d.service) errors.service = 'Selecciona el servicio que te interesa.';
  if (d.message.length < 20) errors.message = 'Cuéntanos un poco más (mínimo 20 caracteres).';
  if (!d.consent) errors.consent = 'Necesitamos tu autorización para poder contactarte.';
  return errors;
}

/** Devuelve un código de error si hay que bloquear la solicitud, o '' si puede continuar. */
function checkLimits_(email) {
  const cache = CacheService.getScriptCache();
  const key = 'cd_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email));
  if (cache.get(key)) return 'rate_limited';

  const lock = LockService.getScriptLock();
  const locked = lock.tryLock(5000);
  try {
    const props = PropertiesService.getScriptProperties();
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
    let daily = {};
    try {
      daily = JSON.parse(props.getProperty('daily') || '{}');
    } catch (err) {
      daily = {};
    }
    if (daily.day !== today) daily = { day: today, count: 0 };
    if (daily.count >= CONFIG.DAILY_LIMIT) return 'busy';

    daily.count += 1;
    props.setProperty('daily', JSON.stringify(daily));
    cache.put(key, '1', Math.min(CONFIG.COOLDOWN_SECONDS, 21600));
    return '';
  } finally {
    if (locked) lock.releaseLock();
  }
}

/* ==========================================================================
   Plantillas de correo
   ========================================================================== */

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate_(date) {
  const tz = CONFIG.TIMEZONE;
  const day = Utilities.formatDate(date, tz, 'd');
  const month = MESES[Number(Utilities.formatDate(date, tz, 'M')) - 1];
  const year = Utilities.formatDate(date, tz, 'yyyy');
  const hour24 = Number(Utilities.formatDate(date, tz, 'H'));
  const minutes = Utilities.formatDate(date, tz, 'mm');
  const hour12 = hour24 % 12 || 12;
  return day + ' de ' + month + ' de ' + year + ', ' + hour12 + ':' + minutes + ' ' + (hour24 < 12 ? 'a. m.' : 'p. m.');
}

/** Variables para las plantillas: `raw` (texto plano, asuntos y texto) y `html` (escapadas, para el HTML). */
function buildVars_(d) {
  const site = String(CONFIG.SITE_URL || '').replace(/\/+$/, '');
  const raw = {
    nombre: d.name,
    primer_nombre: d.name.split(/\s+/)[0],
    empresa: d.company || 'No indicada',
    telefono: d.phone,
    telefono_link: d.phone.replace(/[^+\d]/g, ''),
    correo: d.email,
    servicio: d.service,
    descripcion: d.message,
    fecha: formatDate_(new Date()),
    marca: CONFIG.BRAND_NAME,
    sitio_url: site,
    logo_url: site ? site + '/images/brand/logo-horizontal-nav.png' : '',
    anio: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy'),
    responder_url: 'mailto:' + d.email + '?subject=' + encodeURIComponent('Re: Tu solicitud a ' + CONFIG.BRAND_NAME),
  };

  const html = {};
  Object.keys(raw).forEach(function (key) {
    html[key] = escapeHtml_(raw[key]);
  });
  html.descripcion = escapeHtml_(raw.descripcion).replace(/\n/g, '<br>');
  return { raw: raw, html: html };
}

/** Reemplaza {{variable}}. Las variables desconocidas se dejan en blanco. */
function fill_(template, vars) {
  return String(template).replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, function (match, key) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key];
    console.warn('Variable de plantilla desconocida: ' + match);
    return '';
  });
}

function loadTemplate_(file) {
  if (!CONFIG.SITE_URL) throw new Error('CONFIG.SITE_URL está vacío.');
  const url = String(CONFIG.SITE_URL).replace(/\/+$/, '') + '/emails/' + file + '?v=' + Date.now();
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const body = res.getContentText('UTF-8');
  if (res.getResponseCode() !== 200 || body.indexOf('</html>') === -1) {
    throw new Error('No se pudo leer ' + url + ' (HTTP ' + res.getResponseCode() + ').');
  }
  return body;
}

function render_(file, vars, kind) {
  try {
    const template = loadTemplate_(file).replace(/<!--[\s\S]*?-->/g, '');
    return fill_(template, vars.html);
  } catch (err) {
    console.warn('Usando plantilla de respaldo para ' + file + ': ' + err);
    return fallbackHtml_(kind, vars.html);
  }
}

/** Versión sencilla que se usa solo si no se puede leer la plantilla del sitio. */
function fallbackHtml_(kind, v) {
  const wrap = function (title, body) {
    return (
      '<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0c2340;">' +
      '<h2 style="color:#0a3a78;margin:0 0 16px;">' + title + '</h2>' + body +
      '<p style="margin-top:24px;color:#6b7f95;font-size:13px;">' + v.marca + '</p></div>'
    );
  };
  if (kind === 'team') {
    return wrap(
      'Nueva solicitud de contacto',
      '<p><strong>Nombre:</strong> ' + v.nombre + '<br><strong>Empresa:</strong> ' + v.empresa +
        '<br><strong>Teléfono:</strong> ' + v.telefono + '<br><strong>Correo:</strong> ' + v.correo +
        '<br><strong>Servicio:</strong> ' + v.servicio + '<br><strong>Fecha:</strong> ' + v.fecha + '</p>' +
        '<p style="background:#f4f9fb;padding:14px;border-left:4px solid #008aa0;">' + v.descripcion + '</p>'
    );
  }
  return wrap(
    '¡Gracias, ' + v.primer_nombre + '!',
    '<p>Recibimos tu solicitud. <strong>En pocas horas nos pondremos en contacto contigo.</strong></p>' +
      '<p>Servicio de interés: <strong>' + v.servicio + '</strong></p>' +
      '<p style="background:#f4f9fb;padding:14px;border-left:4px solid #008aa0;">' + v.descripcion + '</p>'
  );
}

/** Versiones en texto plano (mejoran la entrega y las ven los clientes sin HTML). */
function teamText_(v) {
  return [
    'NUEVA SOLICITUD DE CONTACTO',
    'Recibida el ' + v.fecha,
    '',
    'Nombre: ' + v.nombre,
    'Empresa: ' + v.empresa,
    'Teléfono: ' + v.telefono,
    'Correo: ' + v.correo,
    'Servicio: ' + v.servicio,
    '',
    'Qué tiene y qué necesita:',
    v.descripcion,
    '',
    'Compromiso: contactar a esta persona en las próximas horas. Responde este correo para escribirle directamente.',
  ].join('\n');
}

function clientText_(v) {
  return [
    '¡Gracias, ' + v.primer_nombre + '!',
    '',
    'Recibimos tu solicitud. En pocas horas nos pondremos en contacto contigo para conocer mejor tu idea.',
    '',
    'Servicio de interés: ' + v.servicio,
    'Lo que nos contaste:',
    v.descripcion,
    '',
    'Tú tienes la idea. Nosotros te ayudamos a convertirla en realidad.',
    'Equipo ' + v.marca,
  ].join('\n');
}

/* ==========================================================================
   Utilidades
   ========================================================================== */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
