/* ==========================================================================
   IdeoHealth Group — brief/layout.js
   Diseño del PDF. Recibe los datos extraídos del sitio (extract.js), las imágenes y los colores
   de marca, y devuelve la definición del documento para pdfmake.

   Aquí solo se decide CÓMO se ve (tipografía, tarjetas, orden de las secciones).
   Los textos nunca se escriben aquí: salen del HTML del sitio.
   ========================================================================== */

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = { x: 44, top: 82, bottom: 46 };
const BAND_Y = 738; // inicio de la franja oscura de la portada
export const CONTENT_W = PAGE.w - MARGIN.x * 2;

const monthYear = (d) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(d);

/* ==========================================================================
   Piezas reutilizables
   ========================================================================== */
export function buildDocDefinition(data, { images, ratios }, T) {
  const gradient = [T.navy700, T.teal600, T.green500];
  const has = (name) => Boolean(images[name]);

  /** Fragmentos de texto con formato: negritas en azul oscuro y resaltado en color de acento. */
  const rich = (runs, { accent = T.teal600, boldColor = null } = {}) =>
    runs.map((r) => {
      const o = { text: r.text };
      if (r.bold) {
        o.bold = true;
        if (boldColor) o.color = boldColor;
      }
      if (r.italics) o.italics = true;
      if (r.accent) o.color = accent;
      return o;
    });

  const paragraph = (runs, extra = {}) => ({
    text: rich(runs, { boldColor: extra.boldColor ?? T.navy900 }),
    fontSize: 10,
    lineHeight: 1.38,
    color: T.muted,
    margin: [0, 0, 0, 7],
    ...extra,
  });

  /** Título de sección: línea de color + etiqueta, título grande y texto introductorio. */
  const sectionHead = ({ eyebrow, title, lead }) => [
    {
      columns: [
        { width: 30, canvas: [{ type: "rect", x: 0, y: 4, w: 22, h: 3, r: 1.5, linearGradient: gradient }] },
        {
          width: "*",
          text: (eyebrow || "").toUpperCase(),
          font: "Jakarta",
          fontSize: 8.5,
          characterSpacing: 1.6,
          color: T.teal700,
        },
      ],
      margin: [0, 0, 0, 8],
    },
    {
      text: rich(title, { accent: T.teal600 }),
      font: "Jakarta",
      bold: true,
      fontSize: 22,
      lineHeight: 1.12,
      color: T.navy900,
      margin: [0, 0, 0, lead?.length ? 8 : 16],
    },
    ...(lead?.length
      ? [{ text: rich(lead, { boldColor: T.navy900 }), fontSize: 11, lineHeight: 1.4, color: T.muted, margin: [0, 0, 0, 16] }]
      : []),
  ];

  /** Celda de tarjeta con borde de acento a la izquierda. */
  const cardCell = (content, { fill = T.bgTint, accent = T.teal600, inset = [14, 12, 14, 12] } = {}) => ({
    stack: content,
    margin: inset,
    fillColor: fill,
    border: [true, false, false, false],
    borderColor: [accent, accent, accent, accent],
  });

  const flatLayout = {
    hLineWidth: () => 0,
    vLineWidth: () => 3,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };

  /** Una tarjeta a todo el ancho. */
  const card = (content, opts) => ({
    unbreakable: true,
    table: { widths: ["*"], body: [[cardCell(content, opts)]] },
    layout: flatLayout,
    margin: [0, 0, 0, 10],
  });

  /** Cuadrícula de tarjetas del mismo alto (cols columnas, con espacio entre ellas). */
  const cardGrid = (cells, { cols = 2, gap = 12, margin = [0, 0, 0, 12] } = {}) => {
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
    const blank = { text: "", border: [false, false, false, false] };
    const widths = [];
    for (let c = 0; c < cols; c++) widths.push("*", ...(c < cols - 1 ? [gap] : []));
    const body = [];
    rows.forEach((row, r) => {
      const line = [];
      for (let c = 0; c < cols; c++) {
        line.push(row[c] ?? { ...blank });
        // Línea compartida entre el separador y la tarjeta de su derecha: pdfmake la pinta con el color de la celda
        // izquierda (el separador). Si no lo tuviera, usaría el negro por defecto (con tablas de una sola fila falla
        // la rama que lee el color de la tarjeta). Por eso el separador lleva ese borde, en el color de la tarjeta vecina.
        if (c < cols - 1) {
          const accent = row[c + 1]?.borderColor?.[0];
          line.push(accent ? { ...blank, border: [false, false, true, false], borderColor: [accent, accent, accent, accent] } : { ...blank });
        }
      }
      body.push(line);
      if (r < rows.length - 1) {
        body.push(line.map(() => ({ ...blank, text: " ", fontSize: 1, margin: [0, 0, 0, gap - 1] })));
      }
    });
    return { unbreakable: true, table: { widths, body, dontBreakRows: true }, layout: flatLayout, margin };
  };

  const hairline = (color = T.line, margin = [0, 6, 0, 10]) => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 0.8, lineColor: color }],
    margin,
  });

  /** Mantiene el título de una sección junto a su primer bloque (evita títulos huérfanos al final de página). */
  const keepHead = (head, first, pageBreak) => ({
    unbreakable: true,
    ...(pageBreak ? { pageBreak } : {}),
    stack: [...head, ...first],
  });

  const title3 = (str, color = T.navy900, size = 12.5) => ({
    text: str,
    font: "Jakarta",
    bold: true,
    fontSize: size,
    color,
    lineHeight: 1.2,
    margin: [0, 0, 0, 5],
  });

  /* ==========================================================================
     Portada
     ========================================================================== */
  const cover = [
    ...(has("logo")
      ? [{ image: "logo", width: 178, absolutePosition: { x: MARGIN.x, y: 40 } }]
      : [{ text: "IdeoHealth Group", font: "Jakarta", bold: true, fontSize: 20, color: T.navy900, absolutePosition: { x: MARGIN.x, y: 44 } }]),

    { text: "", margin: [0, 36, 0, 0] },
    {
      text: [
        { text: "BRIEF CORPORATIVO", color: T.teal700, bold: true },
        { text: data.cover.pill ? `   ·   ${data.cover.pill.toUpperCase()}` : "", color: T.muted },
      ],
      font: "Jakarta",
      fontSize: 8.5,
      characterSpacing: 1.4,
      margin: [0, 0, 0, 12],
    },
    {
      text: [
        { text: data.cover.line1, color: T.navy900 },
        ...(data.cover.line2 ? [{ text: "\n" + data.cover.line2, color: T.teal600 }] : []),
      ],
      font: "Jakarta",
      bold: true,
      fontSize: 32,
      lineHeight: 1.1,
      margin: [0, 0, 20, 14],
    },
    {
      text: rich(data.cover.lead, { boldColor: T.navy900 }),
      fontSize: 11.5,
      lineHeight: 1.45,
      color: T.muted,
      margin: [0, 0, 60, 20],
    },
    ...(has("hero") ? [{ image: "hero", width: CONTENT_W, margin: [0, 0, 0, 18] }] : []),
    {
      table: {
        widths: Array(Math.max(data.cover.stats.length, 1)).fill("*"),
        body: [
          data.cover.stats.map((s, i) => ({
            stack: [
              { text: s.value, font: "Jakarta", bold: true, fontSize: 26, color: [T.navy700, T.teal600, T.green500][i % 3], lineHeight: 1 },
              { text: s.label, fontSize: 9.2, color: T.muted, lineHeight: 1.3, margin: [0, 4, 14, 0] },
            ],
          })),
        ],
      },
      layout: {
        hLineWidth: (i) => (i === 0 ? 1 : 0),
        hLineColor: () => T.line,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 12,
        paddingBottom: () => 0,
      },
    },

    // Franja inferior (los elementos con posición absoluta no empujan el contenido)
    ...(has("logoWhite") ? [{ image: "logoWhite", width: 150, absolutePosition: { x: MARGIN.x, y: BAND_Y + 16 } }] : []),
    {
      text: data.cover.pillars.join("   ·   ").toUpperCase(),
      font: "Jakarta",
      fontSize: 8,
      characterSpacing: 1.4,
      color: "#ffffff",
      alignment: "right",
      absolutePosition: { x: PAGE.w - MARGIN.x - 300, y: BAND_Y + 24 },
      width: 300,
    },
    {
      text: `Brief generado el ${monthYear(data.generatedAt)}   ·   ${data.site.display}`,
      fontSize: 8.5,
      color: "#b9cbe0",
      alignment: "right",
      width: 300,
      absolutePosition: { x: PAGE.w - MARGIN.x - 300, y: BAND_Y + 38 },
    },
    { text: "", pageBreak: "after" },
  ];

  /* ==========================================================================
     Nosotros: historia
     ========================================================================== */
  const storyBlock = [
    {
      columns: [
        { width: "*", stack: sectionHead({ eyebrow: data.story.eyebrow, title: data.story.title }) },
        ...(data.story.badge.value
          ? [
              {
                width: 96,
                stack: [
                  { text: data.story.badge.value, font: "Jakarta", bold: true, fontSize: 46, color: T.teal600, alignment: "right", lineHeight: 0.95 },
                  { text: data.story.badge.label, fontSize: 8.5, color: T.muted, alignment: "right", lineHeight: 1.25, margin: [10, 4, 0, 0] },
                ],
              },
            ]
          : []),
      ],
      columnGap: 14,
    },
    ...data.story.steps.map((s, i) => ({
      unbreakable: true,
      margin: [0, 0, 0, 6],
      columns: [
        { width: 38, text: String(i + 1).padStart(2, "0"), font: "Jakarta", bold: true, fontSize: 19, color: T.teal400 },
        {
          width: "*",
          stack: [title3(s.title, T.navy900, 12), ...s.paragraphs.map((p) => paragraph(p, { fontSize: 9.5, lineHeight: 1.34, margin: [0, 0, 0, 6] }))],
        },
      ],
    })),
    ...(data.story.quote.length
      ? [
          {
            unbreakable: true,
            margin: [0, 6, 0, 0],
            table: {
              widths: ["*"],
              body: [
                [
                  cardCell(
                    [
                      {
                        text: rich(data.story.quote, { accent: T.teal700 }),
                        font: "Jakarta",
                        bold: true,
                        fontSize: 13.5,
                        lineHeight: 1.35,
                        color: T.navy900,
                      },
                    ],
                    { accent: T.green500, inset: [18, 16, 18, 16] }
                  ),
                ],
              ],
            },
            layout: flatLayout,
          },
        ]
      : []),
  ];

  /* ==========================================================================
     Razón de ser y visión
     ========================================================================== */
  const purposeBlock = data.purpose.length
    ? [
        cardGrid(
          data.purpose.map((p) => {
            const dark = p.dark;
            return cardCell(
              [
                { text: (p.tag || "").toUpperCase(), font: "Jakarta", fontSize: 8, characterSpacing: 1.4, color: dark ? T.green400 : T.teal700, margin: [0, 0, 0, 6] },
                { text: p.title, font: "Jakarta", bold: true, fontSize: 15, lineHeight: 1.15, color: dark ? "#ffffff" : T.navy900, margin: [0, 0, 0, 8] },
                { text: rich(p.text, { boldColor: dark ? "#ffffff" : T.navy900 }), fontSize: 9.6, lineHeight: 1.38, color: dark ? "#d4e2f1" : T.muted },
              ],
              { fill: dark ? T.navy900 : T.bgTint, accent: dark ? T.green400 : T.teal600, inset: [14, 13, 14, 13] }
            );
          }),
          { cols: Math.min(2, data.purpose.length), gap: 14, margin: [0, 0, 0, 14] }
        ),
      ]
    : [];

  /* ==========================================================================
     Valores
     ========================================================================== */
  const valuesBlock = data.values.items.length
    ? [
        keepHead(
          sectionHead(data.values),
          [
            cardGrid(
              data.values.items.map((v, i) =>
                cardCell(
                  [
                    {
                      text: [{ text: String(i + 1).padStart(2, "0") + "   ", color: T.teal600 }, { text: v.title }],
                      font: "Jakarta",
                      bold: true,
                      fontSize: 11,
                      lineHeight: 1.2,
                      color: T.navy900,
                      margin: [0, 0, 0, 4],
                    },
                    { text: rich(v.text), fontSize: 9.2, lineHeight: 1.34, color: T.muted },
                  ],
                  { inset: [13, 11, 12, 11] }
                )
              ),
              { cols: 2, gap: 12, margin: [0, 0, 0, 6] }
            ),
          ]
        ),
      ]
    : [];

  /* ==========================================================================
     Propuesta de valor
     ========================================================================== */
  const toneColor = { navy: T.navy700, teal: T.teal600, green: T.green500 };
  const proposalBlock = data.proposal.pillars.length
    ? [
        { text: "", margin: [0, 6, 0, 0] },
        keepHead(sectionHead({ eyebrow: data.proposal.eyebrow, title: data.proposal.title }), [
          ...(data.proposal.tagline.length
            ? [
                {
                  text: data.proposal.tagline.flatMap((runs, i) => {
                    const col = [T.navy700, T.teal700, "#0b8a5f"][i % 3];
                    return [...runs.map((r) => ({ text: r.text, bold: !!r.bold, color: r.bold ? col : T.navy900 })), { text: i < data.proposal.tagline.length - 1 ? "   " : "" }];
                  }),
                  font: "Jakarta",
                  fontSize: 13,
                  lineHeight: 1.35,
                  margin: [0, 0, 0, 12],
                },
              ]
            : []),
          cardGrid(
            data.proposal.pillars.map((p) =>
              cardCell(
                [
                  { text: p.label.toUpperCase(), font: "Jakarta", bold: true, fontSize: 10.5, characterSpacing: 1, color: toneColor[p.tone], margin: [0, 0, 0, 7] },
                  { text: rich(p.text), fontSize: 10, lineHeight: 1.4, color: T.muted },
                ],
                { accent: toneColor[p.tone], inset: [14, 14, 12, 14] }
              )
            ),
            { cols: data.proposal.pillars.length, gap: 10, margin: [0, 0, 0, 16] }
          ),
        ]),
      ]
    : [];

  /* ==========================================================================
     Servicios
     ========================================================================== */
  const serviceCard = (s) =>
    card(
      [
        {
          columns: [
            { width: 34, text: s.no, font: "Jakarta", bold: true, fontSize: 17, color: T.teal400 },
            { width: "*", ...title3(s.title, T.navy900, 13.5), margin: [0, 2, 0, 6] },
          ],
        },
        {
          ul: s.bullets.map((b) => ({ text: rich(b, { boldColor: T.navy900 }) })),
          markerColor: T.teal600,
          fontSize: 9.8,
          lineHeight: 1.32,
          color: T.muted,
          margin: [34, 0, 0, 0],
        },
      ],
      { inset: [16, 13, 16, 12] }
    );
  const servicesBlock = data.services.items.length
    ? [
        keepHead(sectionHead(data.services), [serviceCard(data.services.items[0])]),
        ...data.services.items.slice(1).map(serviceCard),
      ]
    : [];

  /* ==========================================================================
     Metodología
     ========================================================================== */
  const methodBlock = data.method.steps.length
    ? [
        { text: "", margin: [0, 6, 0, 0] },
        keepHead(sectionHead(data.method), [
          cardGrid(
            data.method.steps.map((s, i) =>
              cardCell(
                [
                  { text: String(i + 1).padStart(2, "0"), font: "Jakarta", bold: true, fontSize: 24, color: T.green400, margin: [0, 0, 0, 2] },
                  { text: s.kicker.toUpperCase(), font: "Jakarta", fontSize: 7.5, characterSpacing: 1, color: T.green400, margin: [0, 0, 0, 6] },
                  { text: s.title, font: "Jakarta", bold: true, fontSize: 13, color: "#ffffff", lineHeight: 1.15, margin: [0, 0, 0, 6] },
                  { text: rich(s.text, { boldColor: "#ffffff" }), fontSize: 9.4, lineHeight: 1.4, color: "#cfe0f1" },
                ],
                { fill: T.navy900, accent: T.green400, inset: [14, 14, 12, 14] }
              )
            ),
            { cols: data.method.steps.length, gap: 10, margin: [0, 0, 0, 14] }
          ),
        ]),
      ]
    : [];

  /* ==========================================================================
     Equipo
     ========================================================================== */
  const memberRow = (m, i) => ({
    unbreakable: true,
    stack: [
      ...(i > 0 ? [hairline(T.line, [0, 5, 0, 10])] : []),
      {
    columns: [
      {
        width: 70,
        stack: has(`member${i}`)
          ? [{ image: `member${i}`, width: 54 }]
          : [{ text: (m.name || "?").charAt(0), font: "Jakarta", bold: true, fontSize: 28, color: T.teal600 }],
      },
      {
        width: "*",
        stack: [
          { text: m.name, font: "Jakarta", bold: true, fontSize: 12.5, color: T.navy900, lineHeight: 1.15, margin: [0, 1, 0, 2] },
          { text: m.role, font: "Jakarta", fontSize: 9.2, color: T.teal700, lineHeight: 1.3, margin: [0, 0, 0, 6] },
          ...m.bios.map((b) => paragraph(b, { fontSize: 9.3, lineHeight: 1.34, margin: [0, 0, 0, 4] })),
          ...(m.tags.length ? [{ text: m.tags.join("   ·   "), fontSize: 8.4, color: T.teal700, bold: true, margin: [0, 2, 0, 0] }] : []),
        ],
      },
    ],
      },
    ],
  });
  const teamBlock = data.team.members.length
    ? [
        keepHead(sectionHead(data.team), [memberRow(data.team.members[0], 0)]),
        ...data.team.members.slice(1).map((m, k) => memberRow(m, k + 1)),
      ]
    : [];

  /* ==========================================================================
     Contacto
     ========================================================================== */
  const c = data.contact;
  const contactBlock = [
    keepHead(
      sectionHead({ eyebrow: c.eyebrow, title: c.title, lead: c.lead }),
      [
        {
          table: {
            widths: ["*", 138],
            body: [
              [
                {
                  fillColor: T.navy900,
                  margin: [20, 18, 14, 16],
                  stack: [
                    { text: "PRÓXIMOS PASOS", font: "Jakarta", fontSize: 8, characterSpacing: 1.4, color: T.green400, margin: [0, 0, 0, 10] },
                    ...c.steps.map((s, i) => ({
                      columns: [
                        { width: 26, text: String(i + 1).padStart(2, "0"), font: "Jakarta", bold: true, fontSize: 13, color: T.green400 },
                        {
                          width: "*",
                          stack: [
                            { text: s.title, font: "Jakarta", bold: true, fontSize: 11.2, color: "#ffffff", lineHeight: 1.2 },
                            { text: s.text, fontSize: 9.2, color: "#cfe0f1", lineHeight: 1.35, margin: [0, 2, 0, 7] },
                          ],
                        },
                      ],
                    })),
                    ...(c.links.length
                      ? [
                          { text: "CONTACTO DIRECTO", font: "Jakarta", fontSize: 8, characterSpacing: 1.4, color: T.green400, margin: [0, 8, 0, 6] },
                          ...c.links.map((l) => ({
                            text: [
                              { text: `${labelFor(l.key)}  `, color: T.green400, bold: true },
                              { text: l.text, color: "#ffffff", link: l.href, decoration: "underline", decorationColor: T.green400 },
                            ],
                            fontSize: 10.5,
                            margin: [0, 0, 0, 4],
                          })),
                        ]
                      : []),
                  ],
                },
                {
                  fillColor: T.navy900,
                  margin: [0, 18, 20, 18],
                  alignment: "center",
                  stack: [
                    {
                      table: {
                        widths: [104],
                        body: [[{ stack: [{ qr: data.site.url, fit: 88, foreground: T.navy900, background: "#ffffff", alignment: "center" }], margin: [0, 8, 0, 8], fillColor: "#ffffff" }]],
                      },
                      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                      alignment: "center",
                    },
                    { text: "Visita el sitio", font: "Jakarta", bold: true, fontSize: 9.5, color: "#ffffff", margin: [0, 9, 0, 2] },
                    { text: data.site.display, fontSize: 8.4, color: "#b9cbe0", link: data.site.url },
                  ],
                },
              ],
            ],
          },
          layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          margin: [0, 0, 0, 12],
        },
        ...(c.commitment
          ? [
              {
                unbreakable: true,
                table: {
                  widths: ["*"],
                  body: [[cardCell([{ text: c.commitment, italics: true, fontSize: 10.5, lineHeight: 1.45, color: T.navy900 }], { accent: T.green500, inset: [16, 12, 16, 12] })]],
                },
                layout: flatLayout,
              },
            ]
          : []),
      ]
    ),
  ];

  function labelFor(key) {
    return { email: "Correo", phone: "Teléfono", whatsapp: "WhatsApp", linkedin: "LinkedIn" }[key] ?? key;
  }

  /* ==========================================================================
     Documento
     ========================================================================== */
  return {
    info: {
      title: "IdeoHealth Group · Brief corporativo",
      author: "IdeoHealth Group",
      subject: "Brief corporativo: quiénes somos, servicios, metodología y equipo",
      keywords: "IdeoHealth Group, consultoría en salud, estrategia, gestión, innovación",
      creator: data.site.display,
    },
    pageSize: "A4",
    pageMargins: [MARGIN.x, MARGIN.top, MARGIN.x, MARGIN.bottom],
    defaultStyle: { font: "Nunito", fontSize: 10, lineHeight: 1.3, color: T.ink },
    images,

    // Decoración de la portada: barra de color arriba y franja oscura abajo (solo página 1)
    background: (page) =>
      page !== 1
        ? null
        : {
            canvas: [
              { type: "ellipse", x: PAGE.w - 40, y: 120, r1: 150, r2: 150, color: T.teal400, fillOpacity: 0.07 },
              { type: "ellipse", x: PAGE.w - 120, y: 330, r1: 70, r2: 70, color: T.green500, fillOpacity: 0.06 },
              { type: "rect", x: 0, y: 0, w: PAGE.w, h: 9, linearGradient: gradient },
              { type: "rect", x: 0, y: BAND_Y, w: PAGE.w, h: PAGE.h - BAND_Y, linearGradient: [T.navy950, T.navy900, T.navy700] },
              { type: "rect", x: 0, y: BAND_Y, w: PAGE.w, h: 3, linearGradient: gradient },
            ],
          },

    header: (page) =>
      page === 1
        ? null
        : {
            margin: [MARGIN.x, 28, MARGIN.x, 0],
            stack: [
              {
                columns: [
                  has("logo") ? { image: "logo", width: 84 } : { text: "IdeoHealth Group", font: "Jakarta", bold: true, color: T.navy900 },
                  { text: "BRIEF CORPORATIVO", alignment: "right", font: "Jakarta", fontSize: 7.5, characterSpacing: 1.4, color: T.muted, margin: [0, 12, 0, 0] },
                ],
              },
              { canvas: [{ type: "rect", x: 0, y: 8, w: CONTENT_W, h: 1.4, linearGradient: gradient }] },
            ],
          },

    footer: (page, pages) =>
      page === 1
        ? null
        : {
            margin: [MARGIN.x, 0, MARGIN.x, 26],
            columns: [
              { text: `IdeoHealth Group  ·  ${data.site.display}`, fontSize: 8, color: T.muted, link: data.site.url },
              { text: `Página ${page} de ${pages}`, fontSize: 8, color: T.muted, alignment: "right" },
            ],
          },

    content: [
      ...cover,
      ...storyBlock,
      { text: "", margin: [0, 0, 0, 10] },
      ...purposeBlock,
      ...valuesBlock,
      ...proposalBlock,
      ...servicesBlock,
      ...methodBlock,
      ...teamBlock,
      { text: "", margin: [0, 16, 0, 0] },
      ...contactBlock,
    ],
  };
}
