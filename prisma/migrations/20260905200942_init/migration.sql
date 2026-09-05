-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('PRODUCER', 'IMPORTER', 'DISTRIBUTOR', 'RETAILER', 'GOVERNMENT', 'LEDGER_OPERATOR', 'MARKETING');

-- CreateEnum
CREATE TYPE "UidStatus" AS ENUM ('MINTED', 'EXPORTED', 'WHOLESALE', 'RETAIL_SOLD', 'EXCHANGED', 'RESOLD');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('ORG', 'CONSUMER');

-- CreateEnum
CREATE TYPE "VoucherState" AS ENUM ('NONE', 'AVAILABLE', 'USED', 'VOID');

-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('MINT', 'EXPORT_TRANSFER', 'WHOLESALE_TRANSFER', 'RETAIL_SALE', 'EXCHANGE_TRANSFER', 'RESALE_TRANSFER');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumer" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeVerification" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgeVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "producerOrgId" TEXT NOT NULL,
    "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uid" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "status" "UidStatus" NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "ownerOrgId" TEXT,
    "ownerConsumerId" TEXT,
    "voucherState" "VoucherState" NOT NULL DEFAULT 'NONE',
    "replacesUidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Uid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerTransaction" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "uidId" TEXT NOT NULL,
    "txType" "TxType" NOT NULL,
    "fromOwnerType" "OwnerType",
    "fromOrgId" TEXT,
    "fromConsumerId" TEXT,
    "toOwnerType" "OwnerType" NOT NULL,
    "toOrgId" TEXT,
    "toConsumerId" TEXT,
    "metadata" JSONB,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "fromSequence" INTEGER NOT NULL,
    "toSequence" INTEGER NOT NULL,
    "txCount" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "publicAnchorRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmuggleAlert" (
    "id" TEXT NOT NULL,
    "uidId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SmuggleAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_code_key" ON "Lot"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Uid_code_key" ON "Uid"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Uid_replacesUidId_key" ON "Uid"("replacesUidId");

-- CreateIndex
CREATE INDEX "Uid_status_idx" ON "Uid"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerTransaction_sequence_key" ON "LedgerTransaction"("sequence");

-- CreateIndex
CREATE INDEX "LedgerTransaction_uidId_idx" ON "LedgerTransaction"("uidId");

-- AddForeignKey
ALTER TABLE "AgeVerification" ADD CONSTRAINT "AgeVerification_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_producerOrgId_fkey" FOREIGN KEY ("producerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uid" ADD CONSTRAINT "Uid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uid" ADD CONSTRAINT "Uid_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uid" ADD CONSTRAINT "Uid_ownerConsumerId_fkey" FOREIGN KEY ("ownerConsumerId") REFERENCES "Consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Uid" ADD CONSTRAINT "Uid_replacesUidId_fkey" FOREIGN KEY ("replacesUidId") REFERENCES "Uid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_uidId_fkey" FOREIGN KEY ("uidId") REFERENCES "Uid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_fromConsumerId_fkey" FOREIGN KEY ("fromConsumerId") REFERENCES "Consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_toConsumerId_fkey" FOREIGN KEY ("toConsumerId") REFERENCES "Consumer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmuggleAlert" ADD CONSTRAINT "SmuggleAlert_uidId_fkey" FOREIGN KEY ("uidId") REFERENCES "Uid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
