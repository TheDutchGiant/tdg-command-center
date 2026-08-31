ALTER TABLE "RandomChallengeEntry"
ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'UNKNOWN';

DROP INDEX IF EXISTS "RandomChallengeEntry_challengeId_playerTag_key";

CREATE UNIQUE INDEX "RandomChallengeEntry_challengeId_playerTag_difficulty_key"
ON "RandomChallengeEntry"("challengeId", "playerTag", "difficulty");
