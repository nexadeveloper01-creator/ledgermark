-- CreateEnum
CREATE TYPE "AnchorStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "Anchor" ADD COLUMN     "blockNumber" BIGINT,
ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AnchorStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Anchor_status_idx" ON "Anchor"("status");
