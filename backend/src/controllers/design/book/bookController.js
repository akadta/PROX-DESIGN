// src/controllers/design/book/bookController.js
const prisma = require("../../../../config/prisma");
const { getDimensions, resizeToMatch } = require("../../../utils/imageMeta");
const { v4: uuid } = require("uuid");

const CM_TO_PX = 37.8;
function toPx(value, unit) {
  if (unit === "cm") return Math.round(value * CM_TO_PX);
  if (unit === "in") return Math.round(value * 96);
  return Math.round(value);
}

// Every handler below that touches an existing book scopes the lookup to
// { id, userId: req.effectiveUserId } (or does a findFirst check first) so
// one account family (main user + their employees) can never read/edit/
// delete/publish another account's book by id.

exports.createBook = async (req, res) => {
  try {
    const { title, unit, width, height, locked } = req.body;
    const userId = req.effectiveUserId;
    let widthPx,
      heightPx,
      coverImage = null;

    if (req.file) {
      const dims = await getDimensions(req.file.path);
      widthPx = dims.width;
      heightPx = dims.height;
      coverImage = `/uploads/books/${req.file.filename}`;
    } else {
      widthPx = toPx(width, unit);
      heightPx = toPx(height, unit);
    }

    const book = await prisma.book.create({
      data: {
        title,
        userId,
        unit: unit || "px",
        widthPx,
        heightPx,
        locked: locked === "true" || locked === true,
        coverImage,
      },
    });

    await prisma.page.create({
      data: { bookId: book.id, order: 1, content: {} },
    });

    res.status(201).json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create book" });
  }
};

exports.uploadCover = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    await resizeToMatch(req.file.path, book.widthPx, book.heightPx);
    const coverImage = `/uploads/books/${req.file.filename}`;

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: { coverImage },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload cover" });
  }
};

exports.getBook = async (req, res) => {
  const book = await prisma.book.findFirst({
    where: { id: Number(req.params.id), userId: req.effectiveUserId },
    include: { pages: { orderBy: { order: "asc" } } },
  });
  if (!book) return res.status(404).json({ error: "Not found" });
  res.json(book);
};

exports.listBooks = async (req, res) => {
  const books = await prisma.book.findMany({
    where: { userId: req.effectiveUserId },
    orderBy: { updatedAt: "desc" },
  });
  res.json(books);
};

exports.toggleActive = async (req, res) => {
  const book = await prisma.book.findFirst({
    where: { id: Number(req.params.id), userId: req.effectiveUserId },
  });
  if (!book) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.book.update({
    where: { id: book.id },
    data: { isActive: !book.isActive },
  });
  res.json(updated);
};

exports.publishBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { flipStyle, pageLayout } = req.body; // set from the pre-publish modal
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Not found" });

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        isPublished: true,
        publicSlug: book.publicSlug || uuid(),
        flipStyle: flipStyle || "realistic",
        pageLayout: pageLayout || "duplex",
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish" });
  }
};

exports.unpublishBook = async (req, res) => {
  const book = await prisma.book.findFirst({
    where: { id: Number(req.params.id), userId: req.effectiveUserId },
  });
  if (!book) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.book.update({
    where: { id: book.id },
    data: { isPublished: false },
  });
  res.json(updated);
};

// Public route — intentionally NOT scoped to req.user, no auth on this one.
exports.getPublicBook = async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { publicSlug: req.params.slug },
    include: { pages: { orderBy: { order: "asc" } } },
  });
  if (!book || !book.isPublished)
    return res.status(404).json({ error: "Not found" });
  res.json(book);
};

exports.deleteBook = async (req, res) => {
  const book = await prisma.book.findFirst({
    where: { id: Number(req.params.id), userId: req.effectiveUserId },
  });
  if (!book) return res.status(404).json({ error: "Not found" });
  await prisma.book.delete({ where: { id: book.id } });
  res.status(204).send();
};

exports.updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const data = {};
    if (req.body.pageLayout) data.pageLayout = req.body.pageLayout;
    if (req.body.bindingSide) data.bindingSide = req.body.bindingSide;
    if (req.body.publicTemplate) data.publicTemplate = req.body.publicTemplate;
    if (req.body.pageNumberDefault) {
      try {
        data.pageNumberDefault = JSON.parse(req.body.pageNumberDefault);
      } catch (e) {
        // ignore malformed JSON, keep existing value
      }
    }
    if (req.file) {
      data.backCoverImage = `/uploads/books/${req.file.filename}`;
    }

    const updated = await prisma.book.update({
      where: { id: book.id },
      data,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

exports.saveCoverContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, previewImage } = req.body;
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        coverContent: content,
        ...(previewImage ? { coverImage: previewImage } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error("Save cover content failed:", err);
    res.status(500).json({ error: "Failed to save cover" });
  }
};

exports.saveBackCoverContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, previewImage } = req.body;
    const book = await prisma.book.findFirst({
      where: { id: Number(id), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const updated = await prisma.book.update({
      where: { id: book.id },
      data: {
        backCoverContent: content,
        ...(previewImage ? { backCoverImage: previewImage } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error("Save back cover content failed:", err);
    res.status(500).json({ error: "Failed to save back cover" });
  }
};