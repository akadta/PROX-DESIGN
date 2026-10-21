// src/controllers/design/book/pdfController.js
const prisma = require("../../../../config/prisma");
const puppeteer = require("puppeteer");

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT}`;

function safeAsciiFilename(title) {
  const ascii = (title || "book").replace(/[^\x20-\x7E]/g, "").trim();
  return ascii || "book";
}

function resolveSrc(src) {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return `${BASE_URL}${src}`;
}

// Builds the final linear page sequence: cover, then each page, inserting a
// blank page after each one when the book is single-sided ("simplex").
function buildPageList(book) {
  const list = [];
  if (book.coverImage) list.push({ src: resolveSrc(book.coverImage), blank: false, isCover: true });

  const total = book.pages.length;
  book.pages.forEach((p, i) => {
    list.push({
      src: p.previewImage || resolveSrc(p.background),
      blank: false,
      page: p,
      number: i + 1,
      total,
    });
    if (book.pageLayout === "simplex") list.push({ src: null, blank: true });
  });

  if (book.backCoverImage) list.push({ src: resolveSrc(book.backCoverImage), blank: false, isCover: true });
  return list;
}

function pageNumberOverlayHtml(book, entry) {
  if (entry.blank || entry.isCover || !entry.page) return "";
  const override = entry.page.background?.pageNumber;
  if (override?.mode === "hidden") return "";
  const style = override?.mode === "custom" ? override : book.pageNumberDefault;
  if (!style || !style.enabled) return "";

  let posCss;
  if (style.freeDrag && style.xFrac != null) {
    posCss = `left:${style.xFrac * 100}%;top:${style.yFrac * 100}%;`;
  } else {
    const posMap = {
      "top-left": "top:24px;left:24px;",
      "top-center": "top:24px;left:50%;transform:translateX(-50%);",
      "top-right": "top:24px;right:24px;",
      "bottom-left": "bottom:24px;left:24px;",
      "bottom-center": "bottom:24px;left:50%;transform:translateX(-50%);",
      "bottom-right": "bottom:24px;right:24px;",
    };
    posCss = posMap[style.position] || posMap["bottom-center"];
  }

  const text = (style.format || "{n}")
    .replace("{n}", entry.number)
    .replace("{total}", entry.total);
  return `<div style="position:absolute;${posCss}color:${style.color || "#111"};font-size:${style.fontSize || 16}px;font-family:sans-serif;">${text}</div>`;
}

exports.exportPdf = async (req, res) => {
  try {
    const book = await prisma.book.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
      include: { pages: { orderBy: { order: "asc" } } },
    });
    if (!book) return res.status(404).json({ error: "Not found" });

    const html = buildRenderHtml(book);

    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: book.widthPx, height: book.heightPx });
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });

    const pdfBuffer = await page.pdf({
      width: `${(book.widthPx / 96).toFixed(2)}in`,
      height: `${(book.heightPx / 96).toFixed(2)}in`,
      printBackground: true,
    });
    await browser.close();

    const asciiName = safeAsciiFilename(book.title);
    const encodedName = encodeURIComponent(book.title || "book");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodedName}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF export failed:", err);
    res.status(500).json({ error: err.message || "Failed to export PDF" });
  }
};

function buildRenderHtml(book) {
  const pages = buildPageList(book);
  const pagesHtml = pages
    .map(
      (p) => `
      <div style="position:relative;width:${book.widthPx}px;height:${book.heightPx}px;page-break-after:always;background:#ffffff;">
        ${
          p.blank || !p.src
            ? ""
            : `<img src="${p.src}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;" />`
        }
        ${pageNumberOverlayHtml(book, p)}
      </div>`,
    )
    .join("");
  return `<html><body style="margin:0;">${pagesHtml}</body></html>`;
}