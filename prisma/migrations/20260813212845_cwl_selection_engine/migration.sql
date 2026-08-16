-- CreateEnum
CREATE TYPE "CwlAvailability" AS ENUM ('FULL', 'LIMITED');

-- CreateEnum
CREATE TYPE "CwlPlanStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "CwlAssignmentRole" AS ENUM ('STARTER', 'RESERVE');

-- CreateEnum
CREATE TYPE "CwlAssignmentSource" AS ENUM ('ENGINE', 'MANUAL');

-- CreateEnum
CREATE TYPE "CwlClanFormat" AS ENUM ('V15', 'V30');

-- CreateTable
CREATE TABLE "CwlApplication" (
    "id" SERIAL NOT NULL,
    "season" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
    "clashName" TEXT NOT NULL,
    "availability" "CwlAvailability" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwlPlan" (
    "id" SERIAL NOT NULL,
    "season" TEXT NOT NULL,
    "status" "CwlPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" INTEGER,

    CONSTRAINT "CwlPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwlClanPlan" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "clanTag" TEXT NOT NULL,
    "format" "CwlClanFormat" NOT NULL,
    "starters" INTEGER NOT NULL,
    "minReserves" INTEGER NOT NULL,
    "maxReserves" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlClanPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CwlAssignment" (
    "id" SERIAL NOT NULL,
    "clanPlanId" INTEGER NOT NULL,
    "playerTag" TEXT NOT NULL,
    "role" "CwlAssignmentRole" NOT NULL,
    "source" "CwlAssignmentSource" NOT NULL DEFAULT 'ENGINE',
    "position" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "townHall" INTEGER,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "attacks" INTEGER NOT NULL DEFAULT 0,
    "missedAttacks" INTEGER NOT NULL DEFAULT 0,
    "difficultyBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defenceStars" INTEGER NOT NULL DEFAULT 0,
    "availability" "CwlAvailability",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CwlApplication_season_idx" ON "CwlApplication"("season");

-- CreateIndex
CREATE INDEX "CwlApplication_playerTag_idx" ON "CwlApplication"("playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "CwlApplication_season_playerTag_key" ON "CwlApplication"("season", "playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "CwlPlan_season_key" ON "CwlPlan"("season");

-- CreateIndex
CREATE INDEX "CwlPlan_status_idx" ON "CwlPlan"("status");

-- CreateIndex
CREATE INDEX "CwlPlan_finalizedById_idx" ON "CwlPlan"("finalizedById");

-- CreateIndex
CREATE INDEX "CwlClanPlan_planId_idx" ON "CwlClanPlan"("planId");

-- CreateIndex
CREATE INDEX "CwlClanPlan_clanTag_idx" ON "CwlClanPlan"("clanTag");

-- CreateIndex
CREATE UNIQUE INDEX "CwlClanPlan_planId_clanTag_key" ON "CwlClanPlan"("planId", "clanTag");

-- CreateIndex
CREATE INDEX "CwlAssignment_clanPlanId_idx" ON "CwlAssignment"("clanPlanId");

-- CreateIndex
CREATE INDEX "CwlAssignment_playerTag_idx" ON "CwlAssignment"("playerTag");

-- CreateIndex
CREATE INDEX "CwlAssignment_role_idx" ON "CwlAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CwlAssignment_clanPlanId_playerTag_key" ON "CwlAssignment"("clanPlanId", "playerTag");

-- CreateIndex
CREATE UNIQUE INDEX "CwlAssignment_clanPlanId_position_key" ON "CwlAssignment"("clanPlanId", "position");

-- AddForeignKey
ALTER TABLE "CwlApplication" ADD CONSTRAINT "CwlApplication_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "Player"("playerTag") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwlPlan" ADD CONSTRAINT "CwlPlan_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwlClanPlan" ADD CONSTRAINT "CwlClanPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CwlPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwlAssignment" ADD CONSTRAINT "CwlAssignment_clanPlanId_fkey" FOREIGN KEY ("clanPlanId") REFERENCES "CwlClanPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CwlAssignment" ADD CONSTRAINT "CwlAssignment_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "Player"("playerTag") ON DELETE CASCADE ON UPDATE CASCADE;
