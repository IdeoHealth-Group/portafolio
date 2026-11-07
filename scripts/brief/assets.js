/* ==========================================================================
   IdeoHealth Group — brief/assets.js
   Recursos del PDF: tipografías, colores de marca e imágenes.
   ========================================================================== */

/* ---------- Colores: se leen de las variables CSS del sitio (styles/base.css) ---------- */
export function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    navy950: v("--navy-950", "#031a3a"),
    navy900: v("--navy-900", "#052a5c"),
    navy700: v("--navy-700", "#0a3a78"),
    blue600: v("--blue-600", "#0a5aa8"),
    teal700: v("--teal-700", "#00758a"),
    teal600: v("--teal-600", "#008aa0"),
    teal400: v("--teal-400", "#14b3b3"),
    green500: v("--green-500", "#10b090"),
    green400: v("--green-400", "#46dea0"),
    ink: v("--ink", "#0c2340"),
    muted: v("--muted", "#4a5d75"),
    line: v("--line", "#d9e6ee"),
    bg: v("--bg", "#f5fafc"),
    bgTint: v("--bg-tint", "#eaf5f8"),
  };
}

/* ---------- Tipografías (Nunito y Plus Jakarta Sans, licencia OFL, en vendor/fonts) ---------- */
const FONT_FILES = [
  "Nunito-Regular",
  "Nunito-Bold",
  "Nunito-Italic",
  "Nunito-BoldItalic",
  "PlusJakartaSans-Bold",
  "PlusJakartaSans-ExtraBold",
];

export const FONT_FAMILIES = {
  // Texto corrido
  Nunito: {
    normal: "Nunito-Regular.ttf",
    bold: "Nunito-Bold.ttf",
    italics: "Nunito-Italic.ttf",
    bolditalics: "Nunito-BoldItalic.ttf",
  },
  // Títulos: normal = Bold, bold = ExtraBold
  Jakarta: {
    normal: "PlusJakartaSans-Bold.ttf",
    bold: "PlusJakartaSans-ExtraBold.ttf",
    italics: "PlusJakartaSans-Bold.ttf",
    bolditalics: "PlusJakartaSans-ExtraBold.ttf",
  },
};

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Descarga las tipografías y devuelve el "sistema de archivos virtual" que pdfmake necesita. */
export async function loadFontFiles(siteRoot) {
  const vfs = {};
  await Promise.all(
    FONT_FILES.map(async (name) => {
      const res = await fetch(new URL(`vendor/fonts/${name}.ttf`, siteRoot));
      if (!res.ok) throw new Error(`No se pudo cargar la tipografía ${name} (HTTP ${res.status}).`);
      vfs[`${name}.ttf`] = toBase64(await res.arrayBuffer());
    })
  );
  return vfs;
}

/* ---------- Imágenes ---------- */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen ${url}`));
    img.src = url;
  });
}

/** Rectángulo de la imagen que "cubre" un destino w×h, respetando la posición (como object-fit: cover). */
function coverRect(img, w, h, pos) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  return {
    sx: (img.naturalWidth - sw) * pos.x,
    sy: (img.naturalHeight - sh) * pos.y,
    sw,
    sh,
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Imagen recortada a un rectángulo con esquinas redondeadas (JPEG, fondo blanco). */
export async function coverImage(url, ratio, pos, { width = 1600, radius = 0.028 } = {}) {
  const img = await loadImage(url);
  const w = width;
  const h = Math.round(width / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  roundRectPath(ctx, 0, 0, w, h, w * radius);
  ctx.clip();
  const { sx, sy, sw, sh } = coverRect(img, w, h, pos);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.88);
}

/** Foto circular con aro de degradado de marca (PNG con transparencia). */
export async function circleAvatar(url, pos, tokens, size = 360) {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;

  const ring = ctx.createLinearGradient(0, 0, size, size);
  ring.addColorStop(0, tokens.navy700);
  ring.addColorStop(0.6, tokens.teal600);
  ring.addColorStop(1, tokens.green500);
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.94, 0, Math.PI * 2);
  ctx.fill();

  const r = c * 0.88;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  const { sx, sy, sw, sh } = coverRect(img, r * 2, r * 2, pos);
  ctx.drawImage(img, sx, sy, sw, sh, c - r, c - r, r * 2, r * 2);
  ctx.restore();
  return canvas.toDataURL("image/png");
}

/** Logo con su color original, tal como lo sirve el sitio (sin recomprimir). */
export async function fileDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Silueta blanca del logo, para usarlo sobre las franjas oscuras. */
export async function whiteLogo(url) {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight };
}

/** Prepara todas las imágenes del brief. Si alguna falla, se omite y el resto sigue. */
export async function buildImages(data, tokens) {
  const images = {};
  const sizes = {};
  const safe = async (name, task) => {
    try {
      const result = await task();
      if (result) images[name] = result;
    } catch (err) {
      console.warn(`[brief] imagen "${name}" omitida:`, err.message);
    }
  };

  await Promise.all([
    safe("logo", async () => {
      const dataUrl = await fileDataUrl(data.logos.header);
      const img = await loadImage(dataUrl);
      sizes.logo = img.naturalWidth / img.naturalHeight;
      return dataUrl;
    }),
    safe("logoWhite", async () => {
      const { dataUrl, ratio } = await whiteLogo(data.logos.footer || data.logos.header);
      sizes.logoWhite = ratio;
      return dataUrl;
    }),
    safe("hero", () => coverImage(data.cover.heroImage, 507 / 206, data.cover.heroPosition)),
    ...data.team.members.map((m, i) => safe(`member${i}`, () => circleAvatar(m.photo, m.photoPosition, tokens))),
  ]);

  return { images, ratios: sizes };
}
