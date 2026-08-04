/*
  Warnings:

  - Added the required column `defenderName` to the `Attack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defenderTag` to the `Attack` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attack" (
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
INSERT INTO "new_Attack" ("attackNumber", "attackerTownHall", "defenderTownHall", "defenseAttackerTownHall", "defenseDestruction", "defenseStars", "destruction", "duration", "id", "playerTag", "stars", "warDay", "warTag") SELECT "attackNumber", "attackerTownHall", "defenderTownHall", "defenseAttackerTownHall", "defenseDestruction", "defenseStars", "destruction", "duration", "id", "playerTag", "stars", "warDay", "warTag" FROM "Attack";
DROP TABLE "Attack";
ALTER TABLE "new_Attack" RENAME TO "Attack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
