-- CreateTable
CREATE TABLE "Base" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "townHall" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseLink" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Clan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clanId" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Season_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "War" (
    "warTag" TEXT NOT NULL PRIMARY KEY,
    "seasonId" INTEGER NOT NULL,
    "clanId" INTEGER NOT NULL,
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
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "War_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "War_clanId_fkey" FOREIGN KEY ("clanId") REFERENCES "Clan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successfulSync" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "SystemState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'IDLE',
    "currentSeason" TEXT,
    "lastCheck" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Clan_tag_key" ON "Clan"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Season_clanId_season_key" ON "Season"("clanId", "season");
