// src/pages/design/book/richTextRaster.js
//
// Renders TipTap-produced HTML into a rasterized PNG (data URL), so it can be
// dropped onto the Konva canvas as a plain image. Konva can't render real
// HTML (tables, lists, mixed fonts, highlights, links, etc.) natively, so
// this is the bridge: edit as real HTML in a rich text editor, then flatten
// it to a crisp raster sized to the box's actual width — the same trick
// bookGenController.js already uses server-side (Puppeteer) for AI-generated
// pages, just done client-side with html-to-image instead.

import { toPng } from "html-to-image";

// Base styles applied inside the hidden render container so tables/lists/etc
// look right in the rasterized output. Kept separate from the app's own
// bootstrap/global CSS so the raster doesn't accidentally pick up unrelated
// page chrome styles.
const RENDER_CSS = `
  .rt-render { margin: 0; }
  .rt-render p { margin: 0 0 0.4em 0; }
  .rt-render p:last-child { margin-bottom: 0; }
  .rt-render ul, .rt-render ol { margin: 0 0 0.4em 1.4em; padding: 0; }
  .rt-render blockquote { margin: 0 0 0.4em 0; padding-left: 12px; border-left: 3px solid #ccc; color: #555; }
  .rt-render table { border-collapse: collapse; margin: 0 0 0.4em 0; }
  .rt-render td, .rt-render th { border: 1px solid #999; padding: 4px 10px; vertical-align: top; }
  .rt-render th { background: #f1f1f1; font-weight: bold; }
  .rt-render mark { padding: 0 2px; }
  .rt-render a { color: inherit; text-decoration: underline; }
`;

const PIXEL_RATIO = 2; // keep the raster crisp at normal zoom/print levels

// Renders `html` at a fixed pixel width and returns a data-URL PNG plus its
// natural (unscaled) width/height, ready to be stored directly on a canvas
// element (element.width / element.height / element.imageSrc).
export async function renderHtmlToImage(html, {
  width = 400,
  fontFamily = "Roboto",
  fontSize = 20,
  color = "#111111",
  background = "transparent",
} = {}) {
  const container = document.createElement("div");
  container.className = "rt-render";
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.fontFamily = fontFamily;
  container.style.fontSize = `${fontSize}px`;
  container.style.lineHeight = "1.4";
  container.style.color = color;
  container.style.background = background;
  container.style.boxSizing = "border-box";

  const styleTag = document.createElement("style");
  styleTag.textContent = RENDER_CSS;
  container.appendChild(styleTag);

  const content = document.createElement("div");
  content.innerHTML = html;
  container.appendChild(content);

  document.body.appendChild(container);

  try {
    // Let web fonts/layout settle before measuring/rasterizing, otherwise
    // the very first render after a font swap can capture with a fallback
    // font and measure the wrong height.
    await document.fonts?.ready?.catch(() => {});
    await new Promise((r) => requestAnimationFrame(r));

    const rect = container.getBoundingClientRect();
    const naturalWidth = Math.max(1, Math.round(rect.width));
    const naturalHeight = Math.max(1, Math.round(rect.height));

   const dataUrl = await toPng(container, {
      pixelRatio: PIXEL_RATIO,
      width: naturalWidth,
      height: naturalHeight,
      backgroundColor: background === "transparent" ? undefined : background,
      skipFonts: true,   // avoid inlining cross-origin Google Fonts stylesheets — that fetch fails silently and blanks the capture
      cacheBust: true,
    });

    return { src: dataUrl, width: naturalWidth, height: naturalHeight };
  } finally {
    document.body.removeChild(container);
  }
}