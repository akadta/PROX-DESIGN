// src/controllers/design/ai/bookGenController.js
//
// "Generate Full Book" - fully free pipeline:
//   1. Groq (text)         -> book title + per-page text/imagePrompt/style
//   2. Pollinations.ai     -> actual images, sized exactly to the book's
//                             widthPx/heightPx (cover) or a per-page image
//                             box, no key/signup required
//   3. Saves everything as real Page rows via Prisma, same shape your
//      canvas editor already reads/writes.
//
// POST /api/ai/generate-book/:bookId
// body: { topic, pageCount, language }

const prisma = require("../../../../config/prisma");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { pipeline } = require("stream/promises");
const resolveEffectiveUser = require("../../../middlewares/resolveEffectiveUser");


const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const UPLOAD_DIR = path.join(__dirname, "../../../../uploads/books");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function escapeHtml(str) {
  return String(str || "").replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c]));
}

// Renders content.elements (image + text) into an absolutely-positioned HTML
// page at exactly widthPx x heightPx, then screenshots it. This uses the
// browser's real text layout/wrapping instead of a hand-rolled character-
// width guess, so text position matches what actually gets placed in the
// element data (which is also what the canvas editor renders) - fixing the
// misalignment a pure math-based approximation was producing in the PDF
// export and Preview/public view, which both read this previewImage.
async function renderPagePreview(browserPage, { widthPx, heightPx, bgColor, elements }) {
  const nodesHtml = elements
    .map((el) => {
      if (el.type === "image" && el.src) {
        const abs = path.join(UPLOAD_DIR, path.basename(el.src));
        if (!fs.existsSync(abs)) return "";
        const b64 = fs.readFileSync(abs).toString("base64");
        return `<img src="data:image/jpeg;base64,${b64}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:cover;" />`;
      }
      if (el.type === "text") {
        return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;font-size:${el.fontSize}px;line-height:1.35;color:${el.fill || "#111111"};font-family:'${el.fontFamily || "Roboto"}',Arial,sans-serif;text-align:${el.align || "left"};white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(el.text)}</div>`;
      }
      return "";
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;width:${widthPx}px;height:${heightPx}px;background:${bgColor || "#ffffff"};position:relative;overflow:hidden;">
      ${nodesHtml}
    </body></html>`;

  await browserPage.setContent(html, { waitUntil: "load" });
  const buffer = await browserPage.screenshot({ type: "jpeg", quality: 85 });
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function callGroqJSON(messages) {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error("GROQ_API_KEY is not set in the environment");
    err.status = 500;
    throw err;
  }
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Groq API error (${res.status}): ${text}`);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

// Downloads a Pollinations image sized exactly to widthPx x heightPx and
// saves it under /uploads/books, returning the public path (same format
// your existing upload endpoints already produce).
async function generateImageFile(prompt, widthPx, heightPx) {
  const seed = Math.floor(Math.random() * 1e9);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${Math.round(widthPx)}&height=${Math.round(heightPx)}&seed=${seed}&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image generation failed (${res.status}) for prompt: ${prompt}`);

  const filename = `ai-${Date.now()}-${seed}.jpg`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await pipeline(res.body, fs.createWriteStream(filePath));
  return `/uploads/books/${filename}`;
}

exports.generateFullBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { topic, pageCount = 5, language = "English" } = req.body;
    if (!topic || !topic.trim()) return res.status(400).json({ error: "topic is required" });

    // Scoped to the caller's own book — without this, any authenticated
    // user could pass any bookId and have pages/cover written into a book
    // they don't own.
    const book = await prisma.book.findFirst({
      where: { id: Number(bookId), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const count = Math.max(1, Math.min(20, Number(pageCount) || 5));

    // ---- 1. Ask Groq for the full outline in one call ----
    const outline = await callGroqJSON([
      {
        role: "system",
        content:
          "You design children's/general-purpose picture books. Respond with ONLY a JSON object, " +
          "no markdown, no commentary, matching exactly:\n" +
          `{"title":"<book title>","coverImagePrompt":"<vivid english prompt for an image-gen model>",` +
          `"coverBgColor":"<hex color>","pages":[{"text":"<page text in the requested language>",` +
          `"imagePrompt":"<vivid english prompt describing this page's illustration>",` +
          `"bgColor":"<hex color that complements the illustration>","textColor":"<hex color, readable on bgColor>"}]}\n` +
          `Generate exactly ${count} page objects. Image prompts must always be written in English ` +
          `(image models understand English best) even if page text is in another language. ` +
          `Page text must be written in ${language}.`,
      },
      {
        role: "user",
        content: `Create a short illustrated book about: "${topic}".`,
      },
    ]);

    if (!Array.isArray(outline.pages) || !outline.pages.length) {
      throw new Error("AI did not return a usable page outline");
    }

    // ---- 2. Generate the cover, sized exactly to the book ----
    const coverPath = await generateImageFile(
      outline.coverImagePrompt || topic,
      book.widthPx,
      book.heightPx,
    );

    // ---- 3. Generate one image per page + build page content ----
    const existingPages = await prisma.page.findMany({
      where: { bookId: book.id },
      orderBy: { order: "asc" },
    });
    let nextOrder = existingPages.length + 1;

    // One shared headless browser/tab for all preview screenshots - far
    // faster than launching Chromium per page, and identical rendering
    // engine to the one used for the final PDF export.
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const browserPage = await browser.newPage();
    await browserPage.setViewport({ width: book.widthPx, height: book.heightPx });

    const created = [];
    try {
      for (const p of outline.pages) {
        // Image fills the top ~60% of the page; text sits below it.
        const imgW = book.widthPx;
        const imgH = Math.round(book.heightPx * 0.6);
        let imgSrc = null;
        try {
          imgSrc = await generateImageFile(p.imagePrompt || topic, imgW, imgH);
        } catch (imgErr) {
          console.error("Page image generation failed, continuing without it:", imgErr);
        }

        const fontSize = Math.max(16, Math.round(book.widthPx * 0.055));
        const elements = [];
        if (imgSrc) {
          elements.push({
            type: "image",
            x: 0,
            y: 0,
            width: imgW,
            height: imgH,
            src: imgSrc,
            brightness: 0,
            contrast: 0,
            clipShape: "none",
          });
        }
        elements.push({
          type: "text",
          x: book.widthPx * 0.08,
          y: imgH + (book.heightPx - imgH) * 0.15,
          text: (p.text || "").replace(/<br\s*\/?>/gi, "\n"),
          fontSize,
          fill: p.textColor || "#111111",
          fontFamily: "Roboto",
          width: book.widthPx * 0.84,
          align: "left",
        });

        const content = {
          elements,
          background: {
            color: p.bgColor || "#ffffff",
            image: null,
            gradient: null,
            margin: 0,
            padding: 0,
            border: null,
          },
        };

        // Build the thumbnail/preview immediately, server-side - without
        // this the page shows blank in Preview / the public book view /
        // the exported PDF until someone opens it in the editor (which is
        // what normally triggers the capture). Rendered via the same
        // x/y/fontSize/align values stored in `elements`, so it lines up
        // with what the canvas editor shows.
        let previewImage = null;
        try {
          previewImage = await renderPagePreview(browserPage, {
            widthPx: book.widthPx,
            heightPx: book.heightPx,
            bgColor: p.bgColor || "#ffffff",
            elements,
          });
        } catch (previewErr) {
          console.error("Preview render failed, page will render blank until edited:", previewErr);
        }

        const page = await prisma.page.create({
          data: {
            bookId: book.id,
            order: nextOrder++,
            content,
            ...(previewImage ? { previewImage } : {}),
          },
        });
        created.push(page);
      }
    } finally {
      await browser.close();
    }

    // ---- 4. Set the cover + title on the book itself ----
    const updatedBook = await prisma.book.update({
      where: { id: book.id },
      data: {
        coverImage: coverPath,
        title: book.title?.trim() ? book.title : (outline.title || book.title),
      },
    });

    res.status(201).json({ book: updatedBook, pages: created });
  } catch (err) {
    console.error("Full book generation failed:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to generate book" });
  }
};