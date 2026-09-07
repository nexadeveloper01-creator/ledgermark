-- CreateTable
CREATE TABLE "KioskSale" (
    "id" TEXT NOT NULL,
    "uidId" TEXT NOT NULL,
    "claimCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "orgId" TEXT,
    "claimedConsumerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "KioskSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KioskSale_claimCode_key" ON "KioskSale"("claimCode");

-- CreateIndex
CREATE INDEX "KioskSale_status_idx" ON "KioskSale"("status");

-- AddForeignKey
ALTER TABLE "KioskSale" ADD CONSTRAINT "KioskSale_uidId_fkey" FOREIGN KEY ("uidId") REFERENCES "Uid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
