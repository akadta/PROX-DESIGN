-- AlterTable
ALTER TABLE "books" ADD COLUMN     "backCoverImage" TEXT,
ADD COLUMN     "bindingSide" TEXT NOT NULL DEFAULT 'right',
ADD COLUMN     "pageNumberDefault" JSONB,
ADD COLUMN     "publicTemplate" TEXT NOT NULL DEFAULT 'realistic';
