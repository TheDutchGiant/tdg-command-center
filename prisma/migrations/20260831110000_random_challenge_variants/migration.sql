/*
  Veilige uitbreiding van de bestaande RandomChallenge structuur.

  BELANGRIJK:
  - Geen bestaande kolommen verwijderen.
  - Geen bestaande RandomChallenge records verwijderen.
  - Oude army/difficulty/number/rules blijven behouden als historische data.
*/

ALTER TABLE "RandomChallenge"
ADD COLUMN "generationAt" TIMESTAMP(3);

ALTER TABLE "RandomChallenge"
ADD COLUMN "sourceArmyId" INTEGER;

ALTER TABLE "RandomChallenge"
ADD COLUMN "sourceArmyName" TEXT;

UPDATE "RandomChallenge"
SET
  "generationAt" =
    CASE
      WHEN "startsAt" IS NOT NULL
        THEN "startsAt" + INTERVAL '24 hours'
      ELSE CURRENT_TIMESTAMP + INTERVAL '24 hours'
    END
WHERE "generationAt" IS NULL;

CREATE TABLE "RandomChallengeVariant" (
  "id" SERIAL NOT NULL,
  "challengeId" INTEGER NOT NULL,
  "difficulty" TEXT NOT NULL,
  "mutatedPercent" INTEGER NOT NULL,
  "sourceArmyId" INTEGER NOT NULL,
  "sourceArmyName" TEXT NOT NULL,
  "army" JSONB NOT NULL,
  "armyShareCode" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RandomChallengeVariant_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
"RandomChallengeVariant_challengeId_difficulty_key"
ON "RandomChallengeVariant"("challengeId", "difficulty");

CREATE INDEX
"RandomChallengeVariant_challengeId_idx"
ON "RandomChallengeVariant"("challengeId");

CREATE INDEX
"RandomChallengeVariant_difficulty_idx"
ON "RandomChallengeVariant"("difficulty");

ALTER TABLE "RandomChallengeVariant"
ADD CONSTRAINT "RandomChallengeVariant_challengeId_fkey"
FOREIGN KEY ("challengeId")
REFERENCES "RandomChallenge"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
