-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "season" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "War" (
    "warTag" TEXT NOT NULL PRIMARY KEY,
    "seasonId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "preparationStartTime" DATETIME NOT NULL,
    "warStartTime" DATETIME NOT NULL,
    "warEndTime" DATETIME NOT NULL,
    "clanStars" INTEGER NOT NULL,
    "opponentStars" INTEGER NOT NULL,
    "clanDestruction" REAL NOT NULL,
    "opponentDestruction" REAL NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "War_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "playerTag" TEXT NOT NULL PRIMARY KEY,
    "currentName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "warTag" TEXT NOT NULL,
    "playerTag" TEXT NOT NULL,
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
    CONSTRAINT "Attack_warTag_fkey" FOREIGN KEY ("warTag") REFERENCES "War" ("warTag") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attack_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "Player" ("playerTag") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareerEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerTag" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "CareerEvent_playerTag_fkey" FOREIGN KEY ("playerTag") REFERENCES "Player" ("playerTag") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "season" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "warsImported" INTEGER NOT NULL,
    "attacksImported" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_season_key" ON "Season"("season");
