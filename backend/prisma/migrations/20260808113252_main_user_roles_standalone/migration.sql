-- AlterTable
ALTER TABLE "main_users" ADD COLUMN     "roleId" INTEGER;

-- CreateTable
CREATE TABLE "main_user_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "main_user_roles_name_key" ON "main_user_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "main_user_roles_slug_key" ON "main_user_roles"("slug");

-- AddForeignKey
ALTER TABLE "main_users" ADD CONSTRAINT "main_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "main_user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
