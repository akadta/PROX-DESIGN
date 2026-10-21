// src/routes/bookRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const resolveEffectiveUser = require("../middlewares/resolveEffectiveUser");
const upload = require("../middlewares/upload");
const bookCtrl = require("../controllers/design/book/bookController");
const pageCtrl = require("../controllers/design/book/pageController");
const pdfCtrl = require("../controllers/design/book/pdfController");

router.post("/books", auth, resolveEffectiveUser, upload.single("coverFile"), bookCtrl.createBook);
router.get("/books", auth, resolveEffectiveUser, bookCtrl.listBooks);
router.get("/books/:id", auth, resolveEffectiveUser, bookCtrl.getBook);
router.post(
  "/books/:id/cover",
  auth,
  resolveEffectiveUser,
  upload.single("coverFile"),
  bookCtrl.uploadCover,
);
router.patch("/books/:id/toggle-active", auth, resolveEffectiveUser, bookCtrl.toggleActive);
router.patch("/books/:id/settings", auth, resolveEffectiveUser, upload.single("backCoverFile"), bookCtrl.updateSettings);
router.patch("/books/:id/cover-content", auth, resolveEffectiveUser, bookCtrl.saveCoverContent);
router.patch("/books/:id/back-cover-content", auth, resolveEffectiveUser, bookCtrl.saveBackCoverContent);
router.post("/books/:id/publish", auth, resolveEffectiveUser, bookCtrl.publishBook);
router.post("/books/:id/unpublish", auth, resolveEffectiveUser, bookCtrl.unpublishBook);
router.delete("/books/:id", auth, resolveEffectiveUser, bookCtrl.deleteBook);
router.get("/books/:id/pdf", auth, resolveEffectiveUser, pdfCtrl.exportPdf);
router.get("/public/books/:slug", bookCtrl.getPublicBook); // no auth — public view

router.patch("/pages/:pageId", auth, resolveEffectiveUser, pageCtrl.savePageContent);
router.post("/books/:bookId/pages", auth, resolveEffectiveUser, pageCtrl.addPage);
router.patch("/books/:bookId/pages/reorder", auth, resolveEffectiveUser, pageCtrl.reorderPages);
router.delete("/pages/:pageId", auth, resolveEffectiveUser, pageCtrl.deletePage);

// in bookRoutes.js
router.post("/assets/upload", auth, upload.single("file"), (req, res) => {
  res.json({ url: `/uploads/books/${req.file.filename}` });
});

module.exports = router;