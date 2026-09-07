-- CreateTable
CREATE TABLE "StoreCheckout" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "staffUserId" TEXT,
    "consumerId" TEXT,
    "amount" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "couponId" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCheckout_couponId_key" ON "StoreCheckout"("couponId");

-- CreateIndex
CREATE INDEX "StoreCheckout_orgId_createdAt_idx" ON "StoreCheckout"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoreCheckout" ADD CONSTRAINT "StoreCheckout_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
