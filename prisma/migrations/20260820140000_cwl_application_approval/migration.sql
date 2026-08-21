-- Add CWL application approval workflow

CREATE TYPE "CwlApplicationStatus" AS ENUM (
  'AUTO_APPROVED',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "CwlApplication"
DROP CONSTRAINT "CwlApplication_playerTag_fkey";

ALTER TABLE "CwlApplication"
ADD COLUMN "status" "CwlApplicationStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "CwlApplication_status_idx"
ON "CwlApplication"("status");
