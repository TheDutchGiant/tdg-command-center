-- CreateTable
CREATE TABLE "CwlPlayerSnapshot" (
    "id" SERIAL NOT NULL,
    "playerTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "townHall" INTEGER NOT NULL,
    "experienceLevel" INTEGER NOT NULL DEFAULT 0,
    "attackWins" INTEGER NOT NULL DEFAULT 0,
    "defenseWins" INTEGER NOT NULL DEFAULT 0,
    "trophies" INTEGER NOT NULL DEFAULT 0,
    "warStars" INTEGER NOT NULL DEFAULT 0,
    "builderHall" INTEGER,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CwlPlayerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CwlPlayerSnapshot_playerTag_idx" ON "CwlPlayerSnapshot"("playerTag");

-- CreateIndex
CREATE INDEX "CwlPlayerSnapshot_snapshotDate_idx" ON "CwlPlayerSnapshot"("snapshotDate");
