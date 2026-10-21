// src/utils/pageRenderer.js
//
// Turns a page's content ({ elements, background }) into absolutely
// positioned HTML matching what the Konva canvas editor renders. Used by:
//   - bookGenController.js  -> screenshot it to build previewImage
//   - pdfController.js      -> render it directly at PDF-export time, so
//                              the PDF always matches current element data
//                              instead of trusting a possibly-stale
//                              previewImage.
//
// Mirrors BookDesign.jsx's BORDER_PRESETS + rendering logic for background
// image/border/gradient and grouped elements, since those are real features
// used by manually-designed pages (not just AI-generated ones).

const fs = require("fs");
const path = require("path");

// Keep in sync with GOOGLE_FONTS in BookDesign.jsx - server-side Puppeteer
// has none of these installed, so without loading them explicitly, text
// falls back to a generic system font (and for Malayalam specifically, can
// render as nothing at all if the server has no matching glyphs).
const GOOGLE_FONTS = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Oswald",
  "Raleway",
  "Nunito",
  "Inter",
  "Work Sans",
  "Rubik",
  "Karla",
  "Dancing Script",
  "Pacifico",
  "Lobster",
  "Bebas Neue",
  "Anton",
  "Abril Fatface",
  "Cormorant Garamond",
  "Josefin Sans",
  "Quicksand",
  "Noto Sans Malayalam",
  "Manjari",
  "Baloo Chettan 2",
];

// A single <link> tag pulling every font used by the editor. Insert this in
// the <head> of any HTML you hand to Puppeteer, then wait on
// `document.fonts.ready` before screenshotting/printing (see
// waitForFontsReady below) - otherwise Puppeteer may capture before the
// fonts finish downloading, which looks identical to them never loading.
function googleFontsLinkTag() {
  const families = GOOGLE_FONTS.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&");
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">`;
}

// Call after page.setContent(), before screenshot()/pdf(). Falls back
// silently (a fixed short wait) if the fonts API or network is unavailable,
// rather than hanging indefinitely.
async function waitForFontsReady(browserPage, timeoutMs = 8000) {
  try {
    await Promise.race([
      browserPage.evaluate(() => document.fonts.ready.then(() => true)),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch (err) {
    console.error("Font-ready wait failed, proceeding without confirmation:", err);
  }
}

// Keep in sync with BORDER_PRESETS in BookDesign.jsx / bookController.js.
const BORDER_PRESETS = {
  "solid-thin": { width: 2, style: "solid" },
  "solid-medium": { width: 4, style: "solid" },
  "solid-thick": { width: 8, style: "solid" },
  dashed: { width: 3, style: "dashed" },
  "dashed-fine": { width: 2, style: "dashed" },
  dotted: { width: 3, style: "dotted" },
  "dash-dot": { width: 2, style: "dashed" }, // CSS has no dash-dot keyword - closest visual match
  "long-dash": { width: 3, style: "dashed" },
  rounded: { width: 4, style: "solid", radius: 24 },
  "rounded-thick": { width: 8, style: "solid", radius: 30 },
  double: { width: 2, style: "double", gap: 6 },
  "double-thick": { width: 3, style: "double", gap: 10 },
};

function escapeHtml(str) {
  return String(str || "").replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c]));
}

function bgCss(background) {
  if (!background) return "#ffffff";
  if (background.gradient) {
    const g = background.gradient;
    if (g.type === "radial") return `radial-gradient(circle, ${g.color1}, ${g.color2})`;
    return `linear-gradient(${g.angle ?? 90}deg, ${g.color1}, ${g.color2})`;
  }
  return background.color || "#ffffff";
}

// Shared image-src resolution: http(s)/data URIs pass through untouched;
// local upload paths ("/uploads/books/xxx.jpg") get base64-inlined so the
// output HTML is fully self-contained for Puppeteer to screenshot/print.
function resolveImgSrc(src, resolveLocalPath) {
  if (!src) return null;
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  if (!resolveLocalPath) return null;
  const abs = resolveLocalPath(src);
  if (!abs || !fs.existsSync(abs)) return null;
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(abs).toString("base64")}`;
}

// A background image (set via "Set Background Image" in Page Style) sits
// between the color/gradient and the border/elements - full-bleed, no crop
// guessing needed since it's always meant to fill the page.
function backgroundImageHtml(background, resolveLocalPath) {
  if (!background?.image) return "";
  const src = resolveImgSrc(background.image, resolveLocalPath);
  if (!src) return "";
  return `<img src="${src}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />`;
}

function borderHtml(background, widthPx, heightPx) {
  const border = background?.border;
  if (!border) return "";
  const preset = BORDER_PRESETS[border.presetId] || BORDER_PRESETS["solid-thin"];
  const m = background.margin || 0;
  const bw = border.width || preset.width || 3;
  const color = border.color || "#000000";
  const radius = border.radius ?? preset.radius ?? 0;
  const w = widthPx - m * 2;
  const h = heightPx - m * 2;

  if (preset.style === "double") {
    const gap = preset.gap || 6;
    return (
      `<div style="position:absolute;left:${m}px;top:${m}px;width:${w}px;height:${h}px;border:${bw}px solid ${color};border-radius:${radius}px;box-sizing:border-box;"></div>` +
      `<div style="position:absolute;left:${m + gap}px;top:${m + gap}px;width:${w - gap * 2}px;height:${h - gap * 2}px;border:${bw}px solid ${color};border-radius:${radius}px;box-sizing:border-box;"></div>`
    );
  }

  return `<div style="position:absolute;left:${m}px;top:${m}px;width:${w}px;height:${h}px;border:${bw}px ${preset.style} ${color};border-radius:${radius}px;box-sizing:border-box;"></div>`;
}

// resolveLocalPath(src) -> absolute filesystem path, or null/undefined if
// it can't be resolved locally (caller decides how src maps to disk).
function elementToHtml(el, resolveLocalPath) {
  if (!el || el.hidden) return "";
  const rotation = el.rotation ? `transform:rotate(${el.rotation}deg);transform-origin:top left;` : "";

  if (el.type === "image" && el.src) {
    const srcAttr = resolveImgSrc(el.src, resolveLocalPath);
    if (!srcAttr) return "";
    const filter = `filter:brightness(${1 + (el.brightness || 0)}) contrast(${1 + (el.contrast || 0) / 100});`;
    const clip = el.clipShape === "circle" ? "border-radius:50%;overflow:hidden;" : "";
    return `<img src="${srcAttr}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;${filter}${clip}${rotation}" />`;
  }

  if (el.type === "text") {
    // Matches CanvasText: the bg/border rect sits *outside* the text box by
    // `padding` on every side (frontend draws it at -padding,-padding sized
    // width+2*padding x measuredHeight+2*padding), so we reproduce that as a
    // separate sibling box behind the text rather than CSS padding (which
    // would shrink the text box inward instead).
    const padding = el.padding ?? 8;
    const hasBg = !!el.bgColor;
    const hasBorder = !!el.borderWidth;
    const approxHeight = (el.fontSize || 16) * 1.4; // matches elementBoxForClamp's own heuristic
    let decoHtml = "";
    if (hasBg || hasBorder) {
      const bg = hasBg ? `background:${el.bgColor};opacity:${el.bgOpacity ?? 1};` : "";
      const border = hasBorder
        ? `border:${el.borderWidth}px solid ${el.borderColor || "#000"};`
        : "";
      decoHtml = `<div style="position:absolute;left:${el.x - padding}px;top:${el.y - padding}px;width:${(el.width || 300) + padding * 2}px;height:${approxHeight + padding * 2}px;border-radius:${el.borderRadius || 0}px;${bg}${border}${rotation}"></div>`;
    }
    const textHtml = `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width || 300}px;font-size:${el.fontSize}px;line-height:1.35;color:${el.fill || "#111111"};font-family:'${el.fontFamily || "Roboto"}',Arial,sans-serif;text-align:${el.align || "left"};white-space:pre-wrap;word-wrap:break-word;${rotation}">${escapeHtml(el.text)}</div>`;
    return decoHtml + textHtml;
  }

  if (el.type === "shape") {
    const fill = el.fill || "#3b82f6";
    if (el.shapeType === "circle") {
      const r = el.radius || 0;
      const d = r * 2;
      return `<div style="position:absolute;left:${el.x - r}px;top:${el.y - r}px;width:${d}px;height:${d}px;background:${fill};border-radius:50%;${rotation}"></div>`;
    }
    if (el.shapeType === "line") {
      const sw = el.strokeWidth || 4;
      return `<div style="position:absolute;left:${el.x}px;top:${el.y - sw / 2}px;width:${el.width || 200}px;height:${sw}px;background:${fill};${rotation}"></div>`;
    }
    if (!el.shapeType || el.shapeType === "rect") {
      return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width || 100}px;height:${el.height || 100}px;background:${fill};border-radius:${el.cornerRadius || 0}px;${rotation}"></div>`;
    }
    // triangle/star: approximated as a plain box - exact polygon fidelity
    // isn't critical for a print-page fallback shape.
    const d = (el.outerRadius || el.radius || 60) * 2;
    return `<div style="position:absolute;left:${el.x - d / 2}px;top:${el.y - d / 2}px;width:${d}px;height:${d}px;background:${fill};${rotation}"></div>`;
  }

  if (el.type === "group") {
    // Children coordinates are relative to the group's own origin (see
    // mergeSelectedLayers in BookDesign.jsx), so we wrap them in a container
    // transformed exactly like CanvasGroup: translate to (x,y), then
    // rotate/scale around the top-left corner.
    const scaleX = el.scaleX ?? 1;
    const scaleY = el.scaleY ?? 1;
    const childrenHtml = elementsToHtml(el.children, resolveLocalPath);
    return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;transform-origin:top left;transform:rotate(${el.rotation || 0}deg) scale(${scaleX}, ${scaleY});">${childrenHtml}</div>`;
  }

  return "";
}

function elementsToHtml(elements, resolveLocalPath) {
  return (elements || []).map((el) => elementToHtml(el, resolveLocalPath)).join("");
}

// Full page body: background color/gradient + background image + border +
// all elements, sized exactly to widthPx x heightPx.
function pageBodyHtml({ widthPx, heightPx, background, elements }, resolveLocalPath) {
  const bgImg = backgroundImageHtml(background, resolveLocalPath);
  const border = borderHtml(background, widthPx, heightPx);
  const els = elementsToHtml(elements, resolveLocalPath);
  return `<div style="position:relative;width:${widthPx}px;height:${heightPx}px;overflow:hidden;background:${bgCss(background)};">${bgImg}${border}${els}</div>`;
}

module.exports = { escapeHtml, bgCss, elementsToHtml, pageBodyHtml };