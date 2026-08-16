-- CreateTable
CREATE TABLE "CwlHistoricalWar" (
    "id" SERIAL NOT NULL,
    "warTag" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "clanTag" TEXT NOT NULL,
    "opponentTag" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlHistoricalWar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwlHistoricalPlayer" (
    "id" SERIAL NOT NULL,
    "warId" INTEGER NOT NULL,
    "playerTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "townHall" INTEGER NOT NULL,
    "mapPosition" INTEGER NOT NULL,
    "attacks" JSONB NOT NULL,
    "opponentAttacks" JSONB NOT NULL,
    "bestOpponentAttack" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CwlHistoricalPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CwlHistoricalWar_warTag_key" ON "CwlHistoricalWar"("warTag");

-- CreateIndex
CREATE INDEX "CwlHistoricalWar_season_idx" ON "CwlHistoricalWar"("season");

-- CreateIndex
CREATE INDEX "CwlHistoricalWar_round_idx" ON "CwlHistoricalWar"("round");

-- CreateIndex
CREATE INDEX "CwlHistoricalWar_clanTag_idx" ON "CwlHistoricalWar"("clanTag");

-- CreateIndex
CREATE INDEX "CwlHistoricalWar_opponentTag_idx" ON "CwlHistoricalWar"("opponentTag");

-- CreateIndex
CREATE INDEX "CwlHistoricalPlayer_playerTag_idx" ON "CwlHistoricalPlayer"("playerTag");

-- CreateIndex
CREATE INDEX "CwlHistoricalPlayer_mapPosition_idx" ON "CwlHistoricalPlayer"("mapPosition");

-- CreateIndex
CREATE UNIQUE INDEX "CwlHistoricalPlayer_warId_playerTag_key" ON "CwlHistoricalPlayer"("warId", "playerTag");

-- AddForeignKey
ALTER TABLE "CwlHistoricalPlayer" ADD CONSTRAINT "CwlHistoricalPlayer_warId_fkey" FOREIGN KEY ("warId") REFERENCES "CwlHistoricalWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
