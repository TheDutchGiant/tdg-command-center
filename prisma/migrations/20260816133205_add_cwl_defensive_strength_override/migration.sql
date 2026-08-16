-- CreateEnum
CREATE TYPE "CwlDefensiveStrengthOverrideType" AS ENUM ('MAX');

-- CreateTable
CREATE TABLE "CwlDefensiveStrengthOverride" (
    "id" SERIAL NOT NULL,
    "clanTag" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "type" "CwlDefensiveStrengthOverrideType" NOT NULL DEFAULT 'MAX',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlDefensiveStrengthOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CwlDefensiveStrengthOverride_clanTag_idx" ON "CwlDefensiveStrengthOverride"("clanTag");

-- CreateIndex
CREATE INDEX "CwlDefensiveStrengthOverride_playerTag_idx" ON "CwlDefensiveStrengthOverride"("playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "CwlDefensiveStrengthOverride_clanTag_playerTag_key" ON "CwlDefensiveStrengthOverride"("clanTag", "playerTag");

-- AddForeignKey
ALTER TABLE "CwlDefensiveStrengthOverride" ADD CONSTRAINT "CwlDefensiveStrengthOverride_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "Player"("playerTag") ON DELETE CASCADE ON UPDATE CASCADE;
