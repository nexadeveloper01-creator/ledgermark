-- AlterTable
ALTER TABLE "StoreCheckout" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'CASH',
ADD COLUMN     "reference" TEXT;
