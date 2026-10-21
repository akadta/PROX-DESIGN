// src/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const resolveEffectiveUser = require("../middlewares/resolveEffectiveUser");

const aiCtrl = require("../controllers/design/ai/aiController");
const bookGenCtrl = require("../controllers/design/ai/bookGenController");

router.post("/ai/generate", auth, aiCtrl.generateContent);
router.post("/ai/command", auth, aiCtrl.runCommand);
router.post("/ai/generate-book/:bookId", auth, resolveEffectiveUser, bookGenCtrl.generateFullBook);
router.post("/ai/translate", auth, aiCtrl.translateText);

module.exports = router;