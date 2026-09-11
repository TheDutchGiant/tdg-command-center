ALTER TABLE "Base"
ADD COLUMN IF NOT EXISTS "sourceProvider" TEXT,
ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
ADD COLUMN IF NOT EXISTS "sourcePublishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Base_sourcePublishedAt_idx"
ON "Base"("sourcePublishedAt");
