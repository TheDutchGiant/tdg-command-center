ALTER TABLE "Base"
ADD COLUMN "imageUrl" TEXT;

ALTER TABLE "Base"
ADD COLUMN "expiresAt" TIMESTAMP(3);

ALTER TABLE "Base"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Base_townHall_isActive_idx"
ON "Base"("townHall", "isActive");

CREATE INDEX "Base_expiresAt_idx"
ON "Base"("expiresAt");
