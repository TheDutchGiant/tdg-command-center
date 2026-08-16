-- CreateEnum
CREATE TYPE "AdminPermissionLevel" AS ENUM ('READ', 'EDIT', 'DELETE');

-- AlterTable
ALTER TABLE "AdminUserPermission" ADD COLUMN     "level" "AdminPermissionLevel" NOT NULL DEFAULT 'READ';
