CREATE TABLE "DiscordAccountLink" (
    "id" SERIAL NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT,
    "discordDisplayName" TEXT,
    "playerTag" TEXT NOT NULL,
    "verifiedByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordAccountLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordAccountLink_playerTag_key"
    ON "DiscordAccountLink"("playerTag");

CREATE UNIQUE INDEX "DiscordAccountLink_discordUserId_playerTag_key"
    ON "DiscordAccountLink"("discordUserId", "playerTag");

CREATE INDEX "DiscordAccountLink_discordUserId_idx"
    ON "DiscordAccountLink"("discordUserId");

CREATE INDEX "DiscordAccountLink_verifiedByAdminId_idx"
    ON "DiscordAccountLink"("verifiedByAdminId");

ALTER TABLE "DiscordAccountLink"
    ADD CONSTRAINT "DiscordAccountLink_playerTag_fkey"
    FOREIGN KEY ("playerTag")
    REFERENCES "Player"("playerTag")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "DiscordAccountLink"
    ADD CONSTRAINT "DiscordAccountLink_verifiedByAdminId_fkey"
    FOREIGN KEY ("verifiedByAdminId")
    REFERENCES "AdminUser"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
