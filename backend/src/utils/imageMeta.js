// src/utils/imageMeta.js
const sharp = require("sharp");

async function getDimensions(filePath) {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width, height: meta.height };
}

async function resizeToMatch(filePath, width, height) {
  const buffer = await sharp(filePath)
    .resize(width, height, { fit: "cover" })
    .toBuffer();
  await sharp(buffer).toFile(filePath);
}

module.exports = { getDimensions, resizeToMatch };
