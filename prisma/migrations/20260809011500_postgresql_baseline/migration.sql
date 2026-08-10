-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Attack" (
    "id" SERIAL NOT NULL,
    "warTag" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "defenderTag" TEXT NOT NULL,
    "defenderName" TEXT NOT NULL,
    "warDay" INTEGER NOT NULL,
    "attackNumber" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "destruction" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "attackerTownHall" INTEGER NOT NULL,
    "defenderTownHall" INTEGER NOT NULL,
    "defenseStars" INTEGER NOT NULL,
    "defenseDestruction" INTEGER NOT NULL,
    "defenseAttackerTownHall" INTEGER NOT NULL,

    CONSTRAINT "Attack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Base" (
    "id" SERIAL NOT NULL,
    "townHall" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseLink" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CareerEvent" (
    "id" SERIAL NOT NULL,
    "playerTag" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "CareerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Clan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportLog" (
    "id" SERIAL NOT NULL,
    "season" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "warsImported" INTEGER NOT NULL,
    "attacksImported" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successfulSync" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "playerTag" TEXT NOT NULL,
    "currentName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("playerTag")
);

-- CreateTable
CREATE TABLE "public"."Season" (
    "id" SERIAL NOT NULL,
    "clanId" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'IDLE',
    "currentSeason" TEXT,
    "lastCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."War" (
    "warTag" TEXT NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "clanId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "preparationStartTime" TIMESTAMP(3) NOT NULL,
    "warStartTime" TIMESTAMP(3) NOT NULL,
    "warEndTime" TIMESTAMP(3) NOT NULL,
    "clanStars" INTEGER NOT NULL,
    "opponentStars" INTEGER NOT NULL,
    "clanDestruction" DOUBLE PRECISION NOT NULL,
    "opponentDestruction" DOUBLE PRECISION NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "War_pkey" PRIMARY KEY ("warTag")
);

-- CreateIndex
CREATE UNIQUE INDEX "Clan_tag_key" ON "public"."Clan"("tag" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Season_clanId_season_key" ON "public"."Season"("clanId" ASC, "season" ASC);

-- AddForeignKey
ALTER TABLE "public"."Attack" ADD CONSTRAINT "Attack_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "public"."Player"("playerTag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attack" ADD CONSTRAINT "Attack_warTag_fkey" FOREIGN KEY ("warTag") REFERENCES "public"."War"("warTag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareerEvent" ADD CONSTRAINT "CareerEvent_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "public"."Player"("playerTag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Season" ADD CONSTRAINT "Season_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "public"."Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."War" ADD CONSTRAINT "War_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "public"."Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."War" ADD CONSTRAINT "War_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

