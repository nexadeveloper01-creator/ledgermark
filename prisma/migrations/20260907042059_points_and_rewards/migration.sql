-- CreateEnum
CREATE TYPE "PointReason" AS ENUM ('DEVICE_REGISTRATION', 'WEEKLY_CHECKIN', 'STREAK_BONUS', 'SURVEY_COMPLETION', 'PROFILE_COMPLETION', 'SIGNUP_BONUS', 'REWARD_REDEMPTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CONTENT', 'PRIZE_DRAW', 'GIFT');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('REQUESTED', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PointAccount" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "checkinStreak" INTEGER NOT NULL DEFAULT 0,
    "lastCheckinWeek" TEXT,
    "lastCheckinAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLedgerEntry" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "reason" "PointReason" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "memo" TEXT,
    "dedupeKey" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "questions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "awarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "type" "RewardType" NOT NULL,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointAccount_consumerId_key" ON "PointAccount"("consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "PointLedgerEntry_sequence_key" ON "PointLedgerEntry"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PointLedgerEntry_dedupeKey_key" ON "PointLedgerEntry"("dedupeKey");

-- CreateIndex
CREATE INDEX "PointLedgerEntry_accountId_createdAt_idx" ON "PointLedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_slug_key" ON "Survey"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_surveyId_consumerId_key" ON "SurveyResponse"("surveyId", "consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_slug_key" ON "Reward"("slug");

-- CreateIndex
CREATE INDEX "RewardRedemption_consumerId_idx" ON "RewardRedemption"("consumerId");

-- AddForeignKey
ALTER TABLE "PointAccount" ADD CONSTRAINT "PointAccount_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLedgerEntry" ADD CONSTRAINT "PointLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PointAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PointAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
