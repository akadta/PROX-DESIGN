// src/controllers/design/book/pageController.js
const prisma = require("../../../../config/prisma");

// Pages have no userId of their own — ownership always flows through
// page.book.userId. Every handler checks that against req.effectiveUserId
// (the resolved owning account — the main user for both the main user
// themself and any of their employees) before touching anything.

exports.savePageContent = async (req, res) => {
  try {
    const { pageId } = req.params;
    const { content, background, previewImage } = req.body;

    const page = await prisma.page.findUnique({
      where: { id: Number(pageId) },
      include: { book: { select: { userId: true } } },
    });
    if (!page || page.book.userId !== req.effectiveUserId) {
      return res.status(404).json({ error: "Page not found" });
    }

    const updated = await prisma.page.update({
      where: { id: Number(pageId) },
      data: {
        content,
        ...(background !== undefined && { background }),
        ...(previewImage !== undefined && { previewImage }),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save page" });
  }
};

exports.addPage = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { copyFromPageId, sameBackground, insertAtStart } = req.body;

    const book = await prisma.book.findFirst({
      where: { id: Number(bookId), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    const existing = await prisma.page.findMany({
      where: { bookId: Number(bookId) },
      orderBy: { order: "asc" },
    });

    let content = {};
    let background = null;

    if (copyFromPageId) {
      // Only allow copying from a page that belongs to the same book —
      // otherwise this could be used to peek at another account's page content.
      const src = existing.find((p) => p.id === Number(copyFromPageId));
      if (src) {
        content = src.content;
        if (sameBackground) background = src.background;
      }
    }

    if (insertAtStart) {
      await Promise.all(
        existing.map((p) =>
          prisma.page.update({ where: { id: p.id }, data: { order: p.order + 1 } }),
        ),
      );
      const page = await prisma.page.create({
        data: { bookId: Number(bookId), order: 1, content, background },
      });
      return res.status(201).json(page);
    }

    const page = await prisma.page.create({
      data: { bookId: Number(bookId), order: existing.length + 1, content, background },
    });
    res.status(201).json(page);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add page" });
  }
};

exports.reorderPages = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { orderedIds } = req.body; // [pageId1, pageId2, ...]

    const book = await prisma.book.findFirst({
      where: { id: Number(bookId), userId: req.effectiveUserId },
    });
    if (!book) return res.status(404).json({ error: "Book not found" });

    // Make sure every id being reordered actually belongs to this book —
    // otherwise a crafted orderedIds array could reorder someone else's page.
    const owned = await prisma.page.findMany({
      where: { bookId: Number(bookId) },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((p) => p.id));
    if (!orderedIds.every((id) => ownedIds.has(id))) {
      return res.status(403).json({ error: "Invalid page list for this book" });
    }

    await Promise.all(
      orderedIds.map((id, idx) =>
        prisma.page.update({ where: { id }, data: { order: idx + 1 } }),
      ),
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder" });
  }
};

exports.deletePage = async (req, res) => {
  const page = await prisma.page.findUnique({
    where: { id: Number(req.params.pageId) },
    include: { book: { select: { userId: true } } },
  });
  if (!page || page.book.userId !== req.effectiveUserId) {
    return res.status(404).json({ error: "Page not found" });
  }
  await prisma.page.delete({ where: { id: page.id } });
  res.status(204).send();
};