/*
  Warnings:

  - Added the required column `deviceId` to the `AdminSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AdminSession" ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AdminSession_deviceId_idx" ON "AdminSession"("deviceId");

-- CreateIndex
CREATE INDEX "AdminSession_revokedAt_idx" ON "AdminSession"("revokedAt");
