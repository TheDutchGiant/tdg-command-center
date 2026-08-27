CREATE TYPE "RandomChallengeStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'CLOSED',
  'ARCHIVED'
);

CREATE TYPE "RandomChallengeEntryStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "RandomChallenge" (
  "id" SERIAL NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" "RandomChallengeStatus" NOT NULL DEFAULT 'DRAFT',
  "townHall" INTEGER NOT NULL,
  "difficulty" TEXT NOT NULL,
  "baseId" INTEGER,
  "army" JSONB NOT NULL,
  "rules" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RandomChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RandomChallenge_number_key"
ON "RandomChallenge"("number");

CREATE INDEX "RandomChallenge_status_idx"
ON "RandomChallenge"("status");

CREATE INDEX "RandomChallenge_startsAt_idx"
ON "RandomChallenge"("startsAt");

CREATE INDEX "RandomChallenge_endsAt_idx"
ON "RandomChallenge"("endsAt");

CREATE TABLE "RandomChallengeEntry" (
  "id" SERIAL NOT NULL,
  "challengeId" INTEGER NOT NULL,
  "playerTag" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "status" "RandomChallengeEntryStatus" NOT NULL DEFAULT 'PENDING',
  "screenshotPath" TEXT,
  "ocrResult" JSONB,
  "adminNote" TEXT,
  "reviewedBy" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),

  CONSTRAINT "RandomChallengeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RandomChallengeEntry_challengeId_playerTag_key"
ON "RandomChallengeEntry"("challengeId", "playerTag");

CREATE INDEX "RandomChallengeEntry_challengeId_idx"
ON "RandomChallengeEntry"("challengeId");

CREATE INDEX "RandomChallengeEntry_playerTag_idx"
ON "RandomChallengeEntry"("playerTag");

CREATE INDEX "RandomChallengeEntry_status_idx"
ON "RandomChallengeEntry"("status");

CREATE TABLE "RandomChallengeResult" (
  "id" SERIAL NOT NULL,
  "entryId" INTEGER NOT NULL,
  "stars" INTEGER NOT NULL DEFAULT 0,
  "destruction" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "timeSeconds" INTEGER,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rank" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RandomChallengeResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RandomChallengeResult_entryId_key"
ON "RandomChallengeResult"("entryId");

CREATE INDEX "RandomChallengeResult_score_idx"
ON "RandomChallengeResult"("score");

CREATE INDEX "RandomChallengeResult_rank_idx"
ON "RandomChallengeResult"("rank");

ALTER TABLE "RandomChallengeEntry"
ADD CONSTRAINT "RandomChallengeEntry_challengeId_fkey"
FOREIGN KEY ("challengeId")
REFERENCES "RandomChallenge"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "RandomChallengeResult"
ADD CONSTRAINT "RandomChallengeResult_entryId_fkey"
FOREIGN KEY ("entryId")
REFERENCES "RandomChallengeEntry"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
