-- AlterTable
ALTER TABLE "books" ADD COLUMN     "pageLayout" TEXT NOT NULL DEFAULT 'duplex';

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "previewImage" TEXT;
