-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "linkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "linkSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "linkCloseAfterSec" INTEGER DEFAULT 120;

