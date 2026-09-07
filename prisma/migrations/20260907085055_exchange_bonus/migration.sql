-- CreateTable
CREATE TABLE "ExchangeBonus" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedUidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeBonus_consumerId_key" ON "ExchangeBonus"("consumerId");

-- AddForeignKey
ALTER TABLE "ExchangeBonus" ADD CONSTRAINT "ExchangeBonus_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
