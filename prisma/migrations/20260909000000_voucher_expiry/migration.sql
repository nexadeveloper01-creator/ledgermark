-- AlterTable: 교환권 유효기간(3개월) 만료 타임스탬프
ALTER TABLE "Uid" ADD COLUMN     "voucherExpiresAt" TIMESTAMP(3);
