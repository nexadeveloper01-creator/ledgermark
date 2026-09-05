-- CreateEnum
CREATE TYPE "FieldVerdict" AS ENUM ('VERIFIED', 'SEIZURE_GROUNDS', 'COUNTERFEIT_SUSPECTED');

-- DropForeignKey
ALTER TABLE "SmuggleAlert" DROP CONSTRAINT "SmuggleAlert_uidId_fkey";

-- AlterTable: uidCode를 널 허용으로 추가한 뒤 기존 행을 연결된 UID 코드로 백필하고 NOT NULL로 승격한다.
ALTER TABLE "SmuggleAlert" ADD COLUMN     "uidCode" TEXT,
ALTER COLUMN "uidId" DROP NOT NULL;

UPDATE "SmuggleAlert" a
SET "uidCode" = u."code"
FROM "Uid" u
WHERE a."uidId" = u."id" AND a."uidCode" IS NULL;

ALTER TABLE "SmuggleAlert" ALTER COLUMN "uidCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "FieldInspection" (
    "id" TEXT NOT NULL,
    "uidCode" TEXT NOT NULL,
    "uidId" TEXT,
    "verdict" "FieldVerdict" NOT NULL,
    "rule" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "officerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ledgerSnapshot" TEXT,
    "reportNumber" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldInspection_reportNumber_key" ON "FieldInspection"("reportNumber");

-- CreateIndex
CREATE INDEX "FieldInspection_verdict_idx" ON "FieldInspection"("verdict");

-- AddForeignKey
ALTER TABLE "SmuggleAlert" ADD CONSTRAINT "SmuggleAlert_uidId_fkey" FOREIGN KEY ("uidId") REFERENCES "Uid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_uidId_fkey" FOREIGN KEY ("uidId") REFERENCES "Uid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
