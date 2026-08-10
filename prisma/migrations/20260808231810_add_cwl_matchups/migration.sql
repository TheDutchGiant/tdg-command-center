-- CreateTable
CREATE TABLE "CwlMatchup" (
    "id" SERIAL NOT NULL,
    "season" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "warTag" TEXT NOT NULL,
    "warSize" INTEGER,
    "clanATag" TEXT NOT NULL,
    "clanAName" TEXT NOT NULL,
    "clanAStars" INTEGER NOT NULL DEFAULT 0,
    "clanADestruction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clanABonusStars" INTEGER NOT NULL DEFAULT 0,
    "clanAResult" TEXT,
    "clanAIsTDG" BOOLEAN NOT NULL DEFAULT false,
    "clanBTag" TEXT NOT NULL,
    "clanBName" TEXT NOT NULL,
    "clanBStars" INTEGER NOT NULL DEFAULT 0,
    "clanBDestruction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clanBBonusStars" INTEGER NOT NULL DEFAULT 0,
    "clanBResult" TEXT,
    "clanBIsTDG" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CwlMatchup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CwlMatchup_warTag_key" ON "CwlMatchup"("warTag");
