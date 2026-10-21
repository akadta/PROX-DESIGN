// src/pages/design/book/indexPresets.js

const BASE_FONTS = {
  serif: "Playfair Display",
  sansBold: "Montserrat",
  sansClean: "Inter",
  script: "Dancing Script",
};

// All sizes below are PROPORTIONS of the book's actual page size, not fixed
// pixel values — this makes presets look right whether the book is
// 600px or 2400px wide.
function titleEl(book, text, yFrac, opts = {}) {
  const fontSize = opts.fontSize || book.widthPx * 0.075;
  return {
    type: "text",
    x: 0,
    y: book.heightPx * yFrac,
    text,
    fontSize,
    fill: opts.color || "#111111",
    fontFamily: opts.fontFamily || BASE_FONTS.serif,
    width: book.widthPx,
    align: opts.align || "center",
  };
}

function entryEl(book, entry, index, y, opts = {}) {
  const label = entry.label || `Page ${entry.pageNumber}`;
  const leftMargin = opts.leftMargin ?? book.widthPx * 0.1;
  const rightMargin = opts.rightMargin ?? book.widthPx * 0.1;
  const fontSize = opts.fontSize || book.widthPx * 0.032;
  const numberColWidth = book.widthPx * 0.06;
  const items = [
    {
      type: "text",
      x: leftMargin,
      y,
      text: label,
      fontSize,
      fill: opts.color || "#222222",
      fontFamily: opts.fontFamily || BASE_FONTS.sansClean,
      width: book.widthPx - leftMargin - rightMargin - numberColWidth,
      align: "left",
    },
    {
      type: "text",
      x: book.widthPx - rightMargin - numberColWidth,
      y,
      text: String(entry.pageNumber),
      fontSize,
      fill: opts.numberColor || opts.color || "#222222",
      fontFamily: opts.fontFamily || BASE_FONTS.sansClean,
      width: numberColWidth,
      align: "right",
    },
  ];
  if (opts.dashedLeader) {
    items.push({
      type: "shape",
      shapeType: "line",
      x: leftMargin + book.widthPx * 0.28,
      y: y + fontSize * 0.7,
      width: Math.max(
        20,
        book.widthPx - rightMargin - numberColWidth - (leftMargin + book.widthPx * 0.29),
      ),
      strokeWidth: Math.max(1, book.widthPx * 0.0015),
      fill: opts.leaderColor || "#bbbbbb",
    });
  }
  return items;
}

function buildBasic(book, entries, opts) {
  const startYFrac = opts.startYFrac ?? 0.19;
  const gap = opts.gap ?? book.heightPx * 0.052;
  const startY = book.heightPx * startYFrac;
  const els = [titleEl(book, opts.title || "Contents", opts.titleYFrac ?? 0.08, opts.titleOpts)];
  entries.forEach((e, i) => {
    els.push(...entryEl(book, e, i, startY + i * gap, opts));
  });
 if (opts.accentBar) {
    els.unshift({
      type: "shape",
      shapeType: "rect",
      x: 0,
      y: 0,
      width: book.widthPx,
      height: opts.accentBarHeight || book.heightPx * 0.014,
      fill: opts.accentColor || "#f97316",
    });
  }
  if (opts.sideBar) {
    els.unshift({
      type: "shape",
      shapeType: "rect",
      x: 0,
      y: 0,
      width: opts.sideBarWidth || 18,
      height: book.heightPx,
      fill: opts.accentColor || "#111111",
    });
  }
  return {
    background: {
      color: opts.bgColor || "#ffffff",
      margin: 0,
      padding: 0,
      border: null,
      gradient: opts.gradient || null,
    },
    elements: els,
  };
}

export const INDEX_PRESETS = [
  { id: "classic-serif", label: "Classic Serif", build: (b, e) => buildBasic(b, e, { title: "Contents", titleOpts: { fontFamily: BASE_FONTS.serif, fontSize: 44 }, dashedLeader: true }) },
  { id: "minimal-clean", label: "Minimal Clean", build: (b, e) => buildBasic(b, e, { title: "Index", titleOpts: { fontFamily: BASE_FONTS.sansClean, fontSize: 32, color: "#333" }, fontFamily: BASE_FONTS.sansClean }) },
{ id: "bold-orange-bar", label: "Bold Orange Bar", build: (b, e) => buildBasic(b, e, { title: "Contents", accentBar: true, accentColor: "#f97316", titleYFrac: 0.1 }) },  { id: "sidebar-black", label: "Black Sidebar", build: (b, e) => buildBasic(b, e, { title: "Contents", sideBar: true, accentColor: "#111111", titleOpts: { align: "left" }, leftMargin: 110 }) },
  { id: "elegant-script", label: "Elegant Script", build: (b, e) => buildBasic(b, e, { title: "Table of Contents", titleOpts: { fontFamily: BASE_FONTS.script, fontSize: 48 }, fontFamily: BASE_FONTS.serif, dashedLeader: true }) },
  { id: "numbered-blue", label: "Numbered Blue", build: (b, e) => buildBasic(b, e, { title: "Contents", titleOpts: { color: "#1d4ed8" }, numberColor: "#1d4ed8" }) },
  { id: "dark-mode", label: "Dark Mode", build: (b, e) => buildBasic(b, e, { title: "Contents", bgColor: "#111111", titleOpts: { color: "#ffffff" }, color: "#e5e5e5", numberColor: "#ffffff" }) },
  { id: "warm-gradient", label: "Warm Gradient", build: (b, e) => buildBasic(b, e, { title: "Contents", gradient: { type: "linear", color1: "#fff7ed", color2: "#ffedd5", angle: 90, intensity: 1 }, titleOpts: { color: "#7c2d12" } }) },
  { id: "cool-gradient", label: "Cool Gradient", build: (b, e) => buildBasic(b, e, { title: "Contents", gradient: { type: "linear", color1: "#eff6ff", color2: "#e0e7ff", angle: 135, intensity: 1 }, titleOpts: { color: "#1e3a8a" } }) },
  { id: "boxed-cards", label: "Boxed Cards", build: (b, e) => buildBasic(b, e, { title: "Contents" }) },
{ id: "compact-two-col-numbers", label: "Compact List", build: (b, e) => buildBasic(b, e, { title: "Contents", startYFrac: 0.16 }) },
  { id: "green-nature", label: "Green Nature", build: (b, e) => buildBasic(b, e, { title: "Contents", accentBar: true, accentColor: "#16a34a", titleOpts: { color: "#14532d" } }) },
  { id: "maroon-formal", label: "Maroon Formal", build: (b, e) => buildBasic(b, e, { title: "Table of Contents", titleOpts: { fontFamily: BASE_FONTS.serif, color: "#7f1d1d" }, numberColor: "#7f1d1d", dashedLeader: true }) },
  { id: "playful-pink", label: "Playful Pink", build: (b, e) => buildBasic(b, e, { title: "Contents", titleOpts: { fontFamily: BASE_FONTS.script, color: "#db2777" }, numberColor: "#db2777" }) },
  { id: "monochrome-lines", label: "Monochrome Lines", build: (b, e) => buildBasic(b, e, { title: "Contents", dashedLeader: true, leaderColor: "#999" }) },
  { id: "kids-bright", label: "Kids Bright", build: (b, e) => buildBasic(b, e, { title: "What's Inside!", titleOpts: { fontFamily: BASE_FONTS.script, fontSize: 46, color: "#7c3aed" }, gap: 50, fontSize: 20 }) },
  { id: "yellow-highlight", label: "Yellow Highlight", build: (b, e) => buildBasic(b, e, { title: "Contents", accentBar: true, accentColor: "#facc15", accentBarHeight: 10 }) },
  { id: "left-align-modern", label: "Left Align Modern", build: (b, e) => buildBasic(b, e, { title: "Contents", titleOpts: { align: "left" }, leftMargin: 90, fontFamily: BASE_FONTS.sansBold }) },
{ id: "photo-frame-ready", label: "Photo-Frame Ready", build: (b, e) => buildBasic(b, e, { title: "Contents", startYFrac: 0.26, titleYFrac: 0.09 }) },
  { id: "corporate-navy", label: "Corporate Navy", build: (b, e) => buildBasic(b, e, { title: "Contents", sideBar: true, accentColor: "#1e293b", titleOpts: { align: "left", fontFamily: BASE_FONTS.sansBold }, leftMargin: 110, numberColor: "#1e293b" }) },
  { id: "rose-gold", label: "Rose Gold", build: (b, e) => buildBasic(b, e, { title: "Contents", gradient: { type: "linear", color1: "#fff1f2", color2: "#fecdd3", angle: 60, intensity: 1 }, titleOpts: { color: "#9f1239" }, numberColor: "#9f1239" }) },
];

export function buildIndexEntries(pages, coverOffset, prevEntries = []) {
  const prevByPageId = new Map((prevEntries || []).map((e) => [e.pageId, e]));
  return pages
    .filter((p) => !p.content?.background?.meta?.isIndexPage)
    .map((p, i) => {
      const prev = prevByPageId.get(p.id);
      const autoLabel = `Page ${i + 1 + coverOffset}`;
      // Only keep the old label if the user actually typed something custom.
      // Otherwise always regenerate it fresh, so stale auto-labels (e.g. from
      // before a page was reordered) never stick around and duplicate.
      const wasCustomLabel = prev && !/^Page \d+$/.test(prev.label || "");
      return {
        id: prev?.id || `entry-${p.id}`,
        pageId: p.id,
        pageNumber: i + 1 + coverOffset,
        label: wasCustomLabel ? prev.label : autoLabel,
      };
    });
}
export function generateIndexContent(preset, book, entries) {
  const result = preset.build(book, entries);
  result.background.meta = { isIndexPage: true, indexPresetId: preset.id };
  return result;
}