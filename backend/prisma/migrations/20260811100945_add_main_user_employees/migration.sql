-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "roleId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "main_user_employees" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mainUserId" INTEGER NOT NULL,
    "mainUserRoleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_user_employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "main_user_employees_userId_key" ON "main_user_employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "main_user_employees_email_key" ON "main_user_employees"("email");

-- CreateIndex
CREATE INDEX "main_user_employees_mainUserId_idx" ON "main_user_employees"("mainUserId");

-- CreateIndex
CREATE INDEX "main_user_employees_mainUserRoleId_idx" ON "main_user_employees"("mainUserRoleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_user_employees" ADD CONSTRAINT "main_user_employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_user_employees" ADD CONSTRAINT "main_user_employees_mainUserId_fkey" FOREIGN KEY ("mainUserId") REFERENCES "main_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_user_employees" ADD CONSTRAINT "main_user_employees_mainUserRoleId_fkey" FOREIGN KEY ("mainUserRoleId") REFERENCES "main_user_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
