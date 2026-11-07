/* ==========================================================================
   IdeoHealth Group — config.js
   Único archivo con la configuración editable del sitio.
   ========================================================================== */

export const CONFIG = {
  /* URL de la app web de Google Apps Script que recibe el formulario y envía los correos.
     Se obtiene al publicar apps-script/Code.gs (termina en /exec). Ver apps-script/README.md.
     Mientras esté vacía, el formulario funciona en modo demostración solo en tu computador
     (localhost) y muestra un error en el sitio publicado. */
  formEndpoint: "",

  /* Datos de contacto visibles en la sección de contacto.
     Solo se muestran los que estén llenos y sean válidos. */
  contact: {
    email: "ideohealthgroup@gmail.com",
    phone: "", // ej. "+57 300 000 0000"
    whatsapp: "@fabianrguevaras", // debe ser un NÚMERO con indicativo, ej. "573000000000" (un @usuario no se puede enlazar a WhatsApp, por eso se omite)
    linkedin: "", // URL completa, ej. "https://www.linkedin.com/company/..."
  },
};
