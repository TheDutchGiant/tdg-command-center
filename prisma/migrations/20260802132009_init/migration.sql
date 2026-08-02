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
