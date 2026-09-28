-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DELIVERY';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryPartnerId" TEXT;

-- CreateIndex
CREATE INDEX "Order_deliveryPartnerId_status_idx" ON "Order"("deliveryPartnerId", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
